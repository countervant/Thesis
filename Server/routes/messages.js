import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { protect } from "../middleware/protectedjwt.js";
import Message from "../model/messageModel.js";
import User from "../model/userModel.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";

const router = express.Router();
const messageClients = new Map();

const userFields = "firstName lastName email role companyName isActive isOnline lastSeen";

const getUserId = (user) => {
  if (!user) return "";
  if (typeof user === "string") return user;
  if (user._id) return String(user._id);
  if (user.id && typeof user.id !== "function") return String(user.id);
  if (typeof user.toString === "function") return user.toString();
  return "";
};

const isPresenceOnline = (user) => {
  if (!user?.isOnline || !user?.lastSeen) return false;

  const lastSeenTime = new Date(user.lastSeen).getTime();
  return Number.isFinite(lastSeenTime) && Date.now() - lastSeenTime <= 2 * 60 * 1000;
};

const toParticipant = (user) => {
  if (!user) return null;
  const online = isPresenceOnline(user);

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatar: "",
    companyName: user.companyName || "",
    isActive: user.isActive,
    isOnline: online,
    lastSeen: user.lastSeen,
  };
};

const getParticipantId = (message, currentUserId) => {
  const senderId = getUserId(message.sender);
  const recipientId = getUserId(message.recipient);

  return senderId === currentUserId ? recipientId : senderId;
};

const addMessageClient = (userId, res) => {
  const clients = messageClients.get(userId) || new Set();
  clients.add(res);
  messageClients.set(userId, clients);
};

const removeMessageClient = (userId, res) => {
  const clients = messageClients.get(userId);
  if (!clients) return;

  clients.delete(res);
  if (clients.size === 0) {
    messageClients.delete(userId);
  }
};

const hasMessageConnection = (userId) => {
  const clients = messageClients.get(String(userId));
  return Boolean(clients?.size);
};

const emitMessageEvent = (userId, payload) => {
  const clients = messageClients.get(String(userId));
  if (!clients) return;

  clients.forEach((client) => {
    client.write(`event: message\n`);
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  });
};

const emitMessageChange = (message, action = "message") => {
  const payload = {
    action,
    message: toMessagePayload(message),
  };

  emitMessageEvent(getUserId(message.sender), payload);
  emitMessageEvent(getUserId(message.recipient), payload);
};

const toMessagePayload = (message) => ({
  _id: message._id,
  sender: getUserId(message.sender),
  recipient: getUserId(message.recipient),
  text: message.text,
  deliveredAt: message.deliveredAt,
  readAt: message.readAt,
  editedAt: message.editedAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

router.get("/events", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id").lean();
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    const userId = getUserId(user);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(`event: connected\n`);
    res.write(`data: {"ok":true}\n\n`);

    addMessageClient(userId, res);

    const deliveredMessages = await Message.find({
      recipient: userId,
      deliveredAt: null,
    })
      .select("_id sender recipient text deliveredAt readAt editedAt createdAt updatedAt")
      .limit(100)
      .maxTimeMS(8000);

    if (deliveredMessages.length > 0) {
      const deliveredAt = new Date();
      await Message.updateMany(
        { _id: { $in: deliveredMessages.map((message) => message._id) } },
        { $set: { deliveredAt } }
      ).maxTimeMS(8000);

      deliveredMessages.forEach((message) => {
        message.deliveredAt = deliveredAt;
        emitMessageChange(message, "delivered");
      });
    }

    const heartbeat = setInterval(() => {
      res.write(`event: ping\n`);
      res.write(`data: {}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeMessageClient(userId, res);
      res.end();
    });
  } catch (error) {
    console.error("Message events error:", error);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
});

router.get("/users", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
    const search = String(req.query.search || "").trim();
    const searchQuery = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { companyName: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    const query = {
      _id: { $ne: currentUserId },
      isActive: true,
      ...searchQuery,
    };
    const [users, total] = await Promise.all([
      User.find(query)
      .select(userFields)
      .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(limit)
      .maxTimeMS(8000)
        .lean(),
      User.countDocuments(query).maxTimeMS(8000),
    ]);

    res.status(200).json(pagedResponse({
      data: users.map(toParticipant),
      page,
      limit,
      total,
      key: "users",
    }));
  } catch (error) {
    console.error("Get message users error:", error);
    res.status(500).json({ message: "Unable to fetch message users" });
  }
});

router.get("/unread-count", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const unreadCount = await Message.countDocuments({
      recipient: currentUserId,
      readAt: null,
    }).maxTimeMS(8000);

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Get unread message count error:", error);
    res.status(500).json({ message: "Unable to fetch unread message count" });
  }
});

router.get("/threads", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const currentObjectId = new mongoose.Types.ObjectId(currentUserId);
    const pipeline = [
      { $match: { $or: [{ sender: currentObjectId }, { recipient: currentObjectId }] } },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          participantId: {
            $cond: [{ $eq: ["$sender", currentObjectId] }, "$recipient", "$sender"],
          },
          isUnreadForCurrentUser: {
            $and: [{ $eq: ["$recipient", currentObjectId] }, { $eq: ["$readAt", null] }],
          },
        },
      },
      {
        $group: {
          _id: "$participantId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: { $sum: { $cond: ["$isUnreadForCurrentUser", 1, 0] } },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "participant",
                pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1, role: 1, companyName: 1, isActive: 1, isOnline: 1, lastSeen: 1 } }],
              },
            },
            { $unwind: "$participant" },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Message.aggregate(pipeline).option({ maxTimeMS: 8000 });
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;
    const threads = rows.map((thread) => ({
      participant: toParticipant(thread.participant),
      lastMessage: toMessagePayload(thread.lastMessage),
      unreadCount: thread.unreadCount || 0,
    }));

    res.status(200).json(pagedResponse({ data: threads, page, limit, total, key: "threads" }));
  } catch (error) {
    console.error("Get message threads error:", error);
    res.status(500).json({ message: "Unable to fetch message threads" });
  }
});

router.get("/threads/:userId", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const otherUserId = req.params.userId;
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const participant = await User.findById(otherUserId)
      .select(userFields)
      .maxTimeMS(8000)
      .lean();
    if (!participant) {
      return res.status(404).json({ message: "User not found" });
    }

    const messageQuery = {
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId },
      ],
    };
    const total = await Message.countDocuments(messageQuery).maxTimeMS(8000);
    const messages = await Message.find(messageQuery)
      .select("sender recipient text deliveredAt readAt editedAt createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .maxTimeMS(8000)
      .lean();

    const readAt = new Date();
    const readResult = await Message.updateMany(
      {
        sender: otherUserId,
        recipient: currentUserId,
        readAt: null,
      },
      { $set: { readAt, deliveredAt: readAt } }
    ).maxTimeMS(8000);

    if (readResult.modifiedCount > 0) {
      emitMessageEvent(otherUserId, {
        action: "read",
        readerId: currentUserId,
        participantId: otherUserId,
        readAt,
      });
      emitMessageEvent(currentUserId, {
        action: "read",
        readerId: currentUserId,
        participantId: otherUserId,
        readAt,
      });
    }

    res.status(200).json({
      participant: toParticipant(participant),
      messages: messages.reverse(),
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error("Get message thread error:", error);
    res.status(500).json({ message: "Unable to fetch message thread" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const requestedRecipientIds = [
      req.body.recipientId,
      ...(Array.isArray(req.body.recipientIds) ? req.body.recipientIds : []),
    ].filter(Boolean);
    const recipientIds = [...new Set(requestedRecipientIds.map(String))];
    const text = String(req.body.text || "").trim();

    if (recipientIds.length === 0 || recipientIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: "Invalid recipient" });
    }

    if (recipientIds.includes(currentUserId)) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    if (!text) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (text.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or fewer" });
    }

    const recipients = await User.find({
      _id: { $in: recipientIds },
      isActive: true,
    }).select("_id isOnline lastSeen").lean();

    if (recipients.length === 0) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const recipientById = new Map(
      recipients.map((recipient) => [getUserId(recipient), recipient])
    );
    const validRecipientIds = recipients.map((recipient) => getUserId(recipient));
    const now = new Date();
    const messages = await Message.insertMany(
      validRecipientIds.map((recipientId) => ({
        sender: currentUserId,
        recipient: recipientId,
        text,
        deliveredAt:
          hasMessageConnection(recipientId) ||
          isPresenceOnline(recipientById.get(recipientId))
            ? now
            : null,
      }))
    );

    messages.forEach((message) => emitMessageChange(message, "created"));

    res.status(201).json(req.body.recipientIds ? { messages } : messages[0]);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Unable to send message" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const text = String(req.body.text || "").trim();

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid message" });
    }

    if (!text) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (text.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or fewer" });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (getUserId(message.sender) !== currentUserId) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    message.text = text;
    message.editedAt = new Date();
    await message.save();

    emitMessageChange(message, "updated");
    res.status(200).json(message);
  } catch (error) {
    console.error("Update message error:", error);
    res.status(500).json({ message: "Unable to update message" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid message" });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (getUserId(message.sender) !== currentUserId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    const payloadSource = message.toObject();
    await message.deleteOne();

    emitMessageChange(payloadSource, "deleted");
    res.status(200).json({ message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Unable to delete message" });
  }
});

export default router;
