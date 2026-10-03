import express from "express";
import {
  previewProjectExtraction,
  commitProject,
} from "../controllers/chatProject.controller.js";
import { protect } from "../middleware/protectedjwt.js";
import { validateObjectIdParam } from "../middleware/validateObjectId.js";

const router = express.Router();

// Parameter validation
router.param("conversationId", validateObjectIdParam);

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Administrator privileges required.",
    });
  }
  next();
};

// Route 1: Extract project proposal and tasks preview from chat conversation
router.post("/:conversationId/extract-preview", protect, adminOnly, previewProjectExtraction);

// Route 2: Commit reviewed project and backlog tasks to MongoDB
router.post("/:conversationId/commit-project", protect, adminOnly, commitProject);

export default router;
