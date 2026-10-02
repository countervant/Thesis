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

// Route 1: Extract project proposal and tasks preview from chat conversation
router.post("/:conversationId/extract-preview", protect, previewProjectExtraction);

// Route 2: Commit reviewed project and backlog tasks to MongoDB
router.post("/:conversationId/commit-project", protect, commitProject);

export default router;
