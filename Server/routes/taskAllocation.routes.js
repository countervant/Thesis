import express from "express";
import {
  previewAllocation,
  commitAllocation,
  getProjectBacklog,
} from "../controllers/taskAllocation.controller.js";
import { protect } from "../middleware/protectedjwt.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

// Allocation across all unassigned tasks (no project scope) - Admin only
router.post("/optimize-allocation", protect, authorize("admin"), previewAllocation);
router.post("/commit-allocation", protect, authorize("admin"), commitAllocation);

// Project-specific routes - Admin only
router.get("/:projectId/backlog", protect, authorize("admin"), getProjectBacklog);
router.post("/:projectId/optimize-allocation", protect, authorize("admin"), previewAllocation);
router.post("/:projectId/commit-allocation", protect, authorize("admin"), commitAllocation);

export default router;
