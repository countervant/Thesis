import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { protect } from "../middleware/protectedjwt.js";
import Message from "../model/messageModel.js";
import User from "../model/userModel.js";

const router = express.Router();
const messageClients = new Map();

const userFields = "firstName lastName email role avatar companyName isActive";

const getUserId = (user) => {
  if (!user) return "";
  if (typeof user === "string") return user;
  if (user._id) return String(user._id);
  if (user.id && typeof user.id !== "function") return String(user.id);
  if (typeof user.toString === "function") return user.toString();
  return "";
};

const toParticipant = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
    companyName: user.companyName || "",
    isActive: user.isActive,
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
    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
    })
      .select(userFields)
      .sort({ firstName: 1, lastName: 1 })
      .maxTimeMS(8000)
      .lean();

    res.status(200).json(users.map(toParticipant));
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
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { recipient: currentUserId }],
    })
      .populate("sender", userFields)
      .populate("recipient", userFields)
      .sort({ createdAt: -1 })
      .limit(500)
      .maxTimeMS(8000)
      .lean();

    const threadMap = new Map();

    messages.forEach((message) => {
      const participantId = getParticipantId(message, currentUserId);
      if (!participantId || threadMap.has(participantId)) return;

      const participant =
        getUserId(message.sender) === currentUserId
          ? message.recipient
          : message.sender;

      threadMap.set(participantId, {
        participant: toParticipant(participant),
        lastMessage: {
          _id: message._id,
          text: message.text,
          sender: getUserId(message.sender),
          recipient: getUserId(message.recipient),
          createdAt: message.createdAt,
          readAt: message.readAt,
        },
        unreadCount: 0,
      });
    });

    messages.forEach((message) => {
      const participantId = getParticipantId(message, currentUserId);
      const thread = threadMap.get(participantId);

      if (
        thread &&
        getUserId(message.recipient) === currentUserId &&
        !message.readAt
      ) {
        thread.unreadCount += 1;
      }
    });

    res.status(200).json(Array.from(threadMap.values()));
  } catch (error) {
    console.error("Get message threads error:", error);
    res.status(500).json({ message: "Unable to fetch message threads" });
  }
});

router.get("/threads/:userId", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const otherUserId = req.params.userId;

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

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(500)
      .maxTimeMS(8000)
      .lean();

    await Message.updateMany(
      {
        sender: otherUserId,
        recipient: currentUserId,
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    ).maxTimeMS(8000);

    res.status(200).json({
      participant: toParticipant(participant),
      messages,
    });
  } catch (error) {
    console.error("Get message thread error:", error);
    res.status(500).json({ message: "Unable to fetch message thread" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const recipientId = req.body.recipientId;
    const text = String(req.body.text || "").trim();

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid recipient" });
    }

    if (recipientId === currentUserId) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    if (!text) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (text.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or fewer" });
    }

    const recipient = await User.findOne({
      _id: recipientId,
      isActive: true,
    }).select("_id");

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const message = await Message.create({
      sender: currentUserId,
      recipient: recipientId,
      text,
    });

    emitMessageChange(message, "created");

    res.status(201).json(message);
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
