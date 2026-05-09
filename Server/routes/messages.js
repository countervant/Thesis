import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/protectedjwt.js";
import Message from "../model/messageModel.js";
import User from "../model/userModel.js";

const router = express.Router();

const userFields = "firstName lastName email role avatar companyName isActive";

const getUserId = (user) => String(user?._id || user?.id || "");

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

router.get("/users", protect, async (req, res) => {
  try {
    const currentUserId = getUserId(req.user);
    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
    })
      .select(userFields)
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.status(200).json(users.map(toParticipant));
  } catch (error) {
    console.error("Get message users error:", error);
    res.status(500).json({ message: "Unable to fetch message users" });
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

    const participant = await User.findById(otherUserId).select(userFields).lean();
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
      .lean();

    await Message.updateMany(
      {
        sender: otherUserId,
        recipient: currentUserId,
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

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

    res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Unable to send message" });
  }
});

export default router;
