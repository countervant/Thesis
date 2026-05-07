import express from "express";
import Task from "../model/Admin/taskmodel.js";
import { protect } from "../middleware/protectedjwt.js";

const router = express.Router();

const allowedStatuses = ["pending", "in_progress", "review", "done"];
const allowedPriorities = ["low", "medium", "high"];

const taskQueryForUser = (user) => {
  if (user.role === "admin") {
    return {};
  }

  return {
    $or: [{ assignedTo: user._id }, { createdBy: user._id }],
  };
};

const normalizeTaskPayload = (body, userId) => {
  const title = body.title?.trim();
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const status = body.status || "in_progress";
  const priority = body.priority || "medium";

  return {
    title,
    description: body.description?.trim() || "",
    dueDate,
    status: allowedStatuses.includes(status) ? status : "in_progress",
    priority: allowedPriorities.includes(priority) ? priority : "medium",
    assignedTo: body.assignedTo || userId,
  };
};

router.get("/", protect, async (req, res) => {
  try {
    const tasks = await Task.find(taskQueryForUser(req.user))
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Unable to fetch tasks" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const payload = normalizeTaskPayload(req.body, req.user._id);

    if (!payload.title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (!payload.dueDate || Number.isNaN(payload.dueDate.getTime())) {
      return res.status(400).json({ message: "Valid due date is required" });
    }

    const task = await Task.create({
      ...payload,
      createdBy: req.user._id,
      completedAt: payload.status === "done" ? new Date() : undefined,
    });

    const createdTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role");

    res.status(201).json(createdTask);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Unable to create task" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const payload = normalizeTaskPayload(
      {
        title: req.body.title ?? task.title,
        description: req.body.description ?? task.description,
        dueDate: req.body.dueDate ?? task.dueDate,
        status: req.body.status ?? task.status,
        priority: req.body.priority ?? task.priority,
        assignedTo: req.body.assignedTo ?? task.assignedTo,
      },
      req.user._id
    );

    if (!payload.title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (!payload.dueDate || Number.isNaN(payload.dueDate.getTime())) {
      return res.status(400).json({ message: "Valid due date is required" });
    }

    task.title = payload.title;
    task.description = payload.description;
    task.dueDate = payload.dueDate;
    task.status = payload.status;
    task.priority = payload.priority;
    task.assignedTo = payload.assignedTo;
    task.completedAt = payload.status === "done" ? task.completedAt || new Date() : undefined;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role");

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Unable to update task" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Unable to delete task" });
  }
});

export default router;
