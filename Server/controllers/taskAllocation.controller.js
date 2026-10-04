/**
 * taskAllocation.controller.js
 * 
 * Controller for Hungarian Task Allocation Optimizer.
 * Handles task optimization previews and database commits.
 */

import mongoose from "mongoose";
import { Project, ProjectTask } from "../models/projectModel.js";
import {
  optimizeTaskAllocation,
  commitTaskAllocation,
} from "../services/taskAllocation.service.js";

/**
 * Returns an ObjectId for a valid project id param, or null for the
 * "global"/"preview" sentinels and any malformed value.
 */
const parseProjectId = (projectId) =>
  projectId && mongoose.Types.ObjectId.isValid(projectId)
    ? new mongoose.Types.ObjectId(projectId)
    : null;

/**
 * Controller: Preview Hungarian Task Allocation for a Project
 * Route: POST /api/projects/:projectId/optimize-allocation
 * Or: POST /api/projects/optimize-allocation (with custom tasks in body)
 */
export const previewAllocation = async (req, res) => {
  try {
    const { tasks, options } = req.body || {};

    const result = await optimizeTaskAllocation(parseProjectId(req.params.projectId), tasks, options);

    return res.status(200).json({
      success: true,
      message: result.message || "Optimal task allocation synthesized successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[taskAllocationController.previewAllocation] Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to calculate optimal task allocation.",
    });
  }
};

/**
 * Controller: Commit Assigned Tasks to MongoDB
 * Route: POST /api/projects/:projectId/commit-allocation
 */
export const commitAllocation = async (req, res) => {
  try {
    const { assignments, status } = req.body || {};

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one task-to-employee assignment is required.",
      });
    }

    const result = await commitTaskAllocation(
      parseProjectId(req.params.projectId),
      assignments,
      status || "To Do",
      req.user
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("[taskAllocationController.commitAllocation] Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to commit task allocation.",
    });
  }
};

/**
 * Controller: Get Project Backlog Tasks
 * Route: GET /api/projects/:projectId/backlog
 */
export const getProjectBacklog = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const backlogTasks = await ProjectTask.find({
      project: project._id,
      $or: [{ status: "Backlog" }, { assignedTo: null }],
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        project,
        tasks: backlogTasks,
      },
    });
  } catch (error) {
    console.error("[taskAllocationController.getProjectBacklog] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve project backlog.",
    });
  }
};

export default {
  previewAllocation,
  commitAllocation,
  getProjectBacklog,
};
