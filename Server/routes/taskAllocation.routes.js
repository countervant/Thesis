import express from "express";
import {
  previewAllocation,
  commitAllocation,
  getProjectBacklog,
} from "../controllers/taskAllocation.controller.js";
import { protect } from "../middleware/protectedjwt.js";

const router = express.Router();

// Allocation across all unassigned tasks (no project scope)
router.post("/optimize-allocation", protect, previewAllocation);
router.post("/commit-allocation", protect, commitAllocation);

// Project-specific routes
router.get("/:projectId/backlog", protect, getProjectBacklog);
router.post("/:projectId/optimize-allocation", protect, previewAllocation);
router.post("/:projectId/commit-allocation", protect, commitAllocation);

export default router;
