import express from "express";

import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import User from "../models/userModel.js";

const router = express.Router();

router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find({})
      .select("firstName middleInitial lastName companyName email phone country role position isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .maxTimeMS(8000)
      .lean();

    res.status(200).json(users);
  } catch (error) {
    console.error("[users] Failed to retrieve users:", {
      name: error.name,
      message: error.message,
    });

    res.status(500).json({ message: "Failed to retrieve users" });
  }
});

export default router;
