import express from "express";
import {
  previewProjectExtraction,
  previewExternalProjectExtraction,
  commitProject,
} from "../controllers/chatProject.controller.js";
import { protect } from "../middleware/protectedjwt.js";
import { validateObjectIdParam } from "../middleware/validateObjectId.js";

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Administrator privileges required.",
    });
  }
  next();
};

// Route: Extract project proposal from external transcript (Chrome Extension / Raw Text)
router.post("/external-preview", protect, adminOnly, previewExternalProjectExtraction);

// Route: Commit project and backlog tasks directly (Chrome Extension / External)
router.post("/external-commit", protect, adminOnly, commitProject);

// Parameter validation for internal conversation routes
router.param("conversationId", validateObjectIdParam);

// Route 1: Extract project proposal and tasks preview from chat conversation
router.post("/:conversationId/extract-preview", protect, adminOnly, previewProjectExtraction);

// Route 2: Commit reviewed project and backlog tasks to MongoDB
router.post("/:conversationId/commit-project", protect, adminOnly, commitProject);

export default router;
