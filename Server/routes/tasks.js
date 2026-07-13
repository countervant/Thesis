import express from "express";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Task from "../model/Admin/taskmodel.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../uploads/tasks");

const allowedStatuses = ["pending", "in_progress", "review", "done"];
const allowedPriorities = ["low", "medium", "high"];

const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const isPastDate = (date) => date < startOfToday();

const optionalId = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
};

const taskQueryForUser = (user) => {
  if (user.role === "admin") {
    return {};
  }

  if (user.role === "client") {
    return {
      $or: [{ createdBy: user._id }, { requestedBy: user._id }],
    };
  }

  return {
    assignedTo: user._id,
  };
};

const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [];

  return subtasks
    .map((subtask) => {
      const id = optionalId(subtask?._id ?? subtask?.id);
      const completedAt = subtask?.completedAt ? new Date(subtask.completedAt) : undefined;

      return {
        ...(id ? { _id: id } : {}),
        title: String(subtask?.title || "").trim(),
        completed: Boolean(subtask?.completed),
        ...(completedAt && !Number.isNaN(completedAt.getTime()) ? { completedAt } : {}),
      };
    })
    .filter((subtask) => subtask.title);
};

const getActorName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Team member";

const subtaskKey = (subtask, index) =>
  String(subtask?._id || subtask?.id || `${subtask?.title || "subtask"}-${index}`);

const addActivity = (task, activity) => {
  task.activities ??= [];
  task.activities.push({
    ...activity,
    createdAt: activity.createdAt || new Date(),
  });
};

const recordSubtaskActivities = (task, previousSubtasks, nextSubtasks, user) => {
  const previousByKey = new Map(
    previousSubtasks.map((subtask, index) => [subtaskKey(subtask, index), subtask])
  );

  nextSubtasks.forEach((subtask, index) => {
    const previous = previousByKey.get(subtaskKey(subtask, index));
    if (!previous || previous.completed === subtask.completed) return;

    const completed = subtask.completed;
    if (completed && !subtask.completedAt) subtask.completedAt = new Date();
    if (!completed) subtask.completedAt = undefined;

    addActivity(task, {
      type: completed ? "subtask_completed" : "subtask_reopened",
      title: `${completed ? "Completed" : "Reopened"} subtask: ${subtask.title}`,
      details: completed ? "Marked as done" : "Marked as pending again",
      subtaskId: subtaskKey(subtask, index),
      actor: user._id,
      actorName: getActorName(user),
    });
  });
};

const getStatusFromSubtasks = (subtasks, fallbackStatus) => {
  if (!subtasks.length) return fallbackStatus;

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  if (completedCount === subtasks.length) return "done";
  if (completedCount > 0) return "in_progress";
  return fallbackStatus;
};

const normalizeTaskPayload = (body, userId, options = {}) => {
  const title = body.title?.trim();
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const startDate = body.startDate ? new Date(body.startDate) : dueDate;
  const status = body.status || "in_progress";
  const priority = body.priority || "medium";
  const subtasks = normalizeSubtasks(body.subtasks).map((subtask) => ({
    ...subtask,
    completed: status === "done" ? true : subtask.completed,
  }));
  const fallbackStatus = allowedStatuses.includes(status) ? status : "in_progress";

  return {
    title,
    description: body.description?.trim() || "",
    startDate,
    dueDate,
    status: getStatusFromSubtasks(subtasks, fallbackStatus),
    priority: allowedPriorities.includes(priority) ? priority : "medium",
    assignedTo: options.assignedTo ?? body.assignedTo ?? userId,
    requestedBy: optionalId(options.requestedBy ?? body.requestedBy),
    requestedByName: String(options.requestedByName ?? body.requestedByName ?? "").trim(),
    subtasks,
  };
};

const normalizeRevisionPayload = (body) => {
  const priority = String(body.priority || "medium").toLowerCase();
  const preferredCompletionDate = body.dueDate || body.preferredCompletionDate
    ? new Date(body.dueDate || body.preferredCompletionDate)
    : undefined;

  return {
    title: String(body.title || "").trim(),
    section: String(body.section || "").trim(),
    priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium",
    description: String(body.description || "").trim(),
    preferredCompletionDate:
      preferredCompletionDate && !Number.isNaN(preferredCompletionDate.getTime())
        ? preferredCompletionDate
        : undefined,
  };
};

const safeFileName = (fileName) =>
  String(fileName || "output-file")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120) || "output-file";

const saveOutputFile = async (taskId, file) => {
  const dataUrl = String(file?.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid file upload");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("File size must be 10MB or less");
  }

  const taskUploadDir = path.join(uploadsRoot, String(taskId));
  await fs.mkdir(taskUploadDir, { recursive: true });

  const fileName = `${randomUUID()}-${safeFileName(file.fileName)}`;
  const filePath = path.join(taskUploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    fileName: file.fileName || fileName,
    fileUrl: `/uploads/tasks/${taskId}/${fileName}`,
    // Render's local disk is ephemeral. Keep the final submission in MongoDB so
    // a restart or deploy does not leave the task pointing at a missing file.
    fileData: buffer,
    mimeType: match[1],
  };
};

router.get("/", protect, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query = { ...taskQueryForUser(req.user) };
    const search = String(req.query.search || "").trim();

    if (search) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    if (allowedStatuses.includes(req.query.status)) query.status = req.query.status;
    if (allowedPriorities.includes(req.query.priority)) query.priority = req.query.priority;
    if (req.user.role === "admin" && req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }
    if (req.query.dueFrom || req.query.dueTo) {
      query.dueDate = {};
      if (req.query.dueFrom) query.dueDate.$gte = new Date(req.query.dueFrom);
      if (req.query.dueTo) query.dueDate.$lte = new Date(req.query.dueTo);
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
      .select("-comments")
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
      .lean(),
      Task.countDocuments(query).maxTimeMS(8000),
    ]);

    res.status(200).json(pagedResponse({ data: tasks, page, limit, total, key: "tasks" }));
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Unable to fetch tasks" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    if (!["admin", "client"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins and clients can create tasks" });
    }

    const payload = normalizeTaskPayload(req.body, req.user._id, {
      assignedTo: req.user.role === "admin" ? req.body.assignedTo : req.user._id,
      requestedBy: req.user.role === "admin" ? req.body.requestedBy : req.user._id,
      requestedByName:
        req.user.role === "admin"
          ? req.body.requestedByName
          : [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email,
    });

    if (!payload.title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (!payload.subtasks.length) {
      return res.status(400).json({ message: "At least one subtask is required" });
    }

    if (req.user.role === "admin" && !payload.requestedBy && !payload.requestedByName) {
      return res.status(400).json({ message: "Please choose which client requested this task" });
    }

    if (!payload.dueDate || Number.isNaN(payload.dueDate.getTime())) {
      return res.status(400).json({ message: "Valid due date is required" });
    }

    if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) {
      return res.status(400).json({ message: "Valid start date is required" });
    }

    if (payload.startDate > payload.dueDate) {
      return res.status(400).json({ message: "Start date cannot be after due date" });
    }

    if (isPastDate(payload.startDate) || isPastDate(payload.dueDate)) {
      return res.status(400).json({ message: "Past dates cannot be selected" });
    }

    const task = await Task.create({
      ...payload,
      createdBy: req.user._id,
      completedAt: payload.status === "done" ? new Date() : undefined,
      activities: [{
        type: "task_created",
        title: "Task created",
        details: "Project task was created",
        actor: req.user._id,
        actorName: getActorName(req.user),
      }],
    });

    const createdTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

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

    if (req.user.role === "employee") {
      const previousSubtasks = task.subtasks.toObject();
      const subtasks = normalizeSubtasks(req.body.subtasks ?? task.subtasks);
      recordSubtaskActivities(task, previousSubtasks, subtasks, req.user);
      task.subtasks = subtasks;
      task.status = getStatusFromSubtasks(subtasks, task.status);
      task.completedAt = task.status === "done" ? task.completedAt || new Date() : undefined;

      await task.save();

      const updatedTask = await Task.findById(task._id)
        .populate("assignedTo", "firstName lastName email role")
        .populate("createdBy", "firstName lastName email role")
        .populate("requestedBy", "firstName lastName companyName email role")
        .lean();

      return res.status(200).json(updatedTask);
    }

    const payload = normalizeTaskPayload(
      {
        title: req.body.title ?? task.title,
        description: req.body.description ?? task.description,
        startDate: req.body.startDate ?? task.startDate ?? task.createdAt ?? task.dueDate,
        dueDate: req.body.dueDate ?? task.dueDate,
        status: req.body.status ?? task.status,
        priority: req.body.priority ?? task.priority,
        assignedTo: req.user.role === "admin" ? req.body.assignedTo ?? task.assignedTo : task.assignedTo,
        requestedBy:
          req.user.role === "admin" ? req.body.requestedBy ?? task.requestedBy : task.requestedBy,
        requestedByName:
          req.user.role === "admin"
            ? req.body.requestedByName ?? task.requestedByName
            : task.requestedByName,
        subtasks: req.body.subtasks ?? task.subtasks,
      },
      req.user._id,
      {
        assignedTo: req.user.role === "admin" ? req.body.assignedTo ?? task.assignedTo : task.assignedTo,
        requestedBy:
          req.user.role === "admin" ? req.body.requestedBy ?? task.requestedBy : task.requestedBy,
        requestedByName:
          req.user.role === "admin"
            ? req.body.requestedByName ?? task.requestedByName
            : task.requestedByName,
      }
    );

    if (!payload.title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (!payload.dueDate || Number.isNaN(payload.dueDate.getTime())) {
      return res.status(400).json({ message: "Valid due date is required" });
    }

    if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) {
      return res.status(400).json({ message: "Valid start date is required" });
    }

    if (payload.startDate > payload.dueDate) {
      return res.status(400).json({ message: "Start date cannot be after due date" });
    }

    if (
      (req.body.startDate !== undefined && isPastDate(payload.startDate)) ||
      (req.body.dueDate !== undefined && isPastDate(payload.dueDate))
    ) {
      return res.status(400).json({ message: "Past dates cannot be selected" });
    }

    const previousSubtasks = task.subtasks.toObject();
    recordSubtaskActivities(task, previousSubtasks, payload.subtasks, req.user);
    task.title = payload.title;
    task.description = payload.description;
    task.startDate = payload.startDate;
    task.dueDate = payload.dueDate;
    task.status = payload.status;
    task.priority = payload.priority;
    task.assignedTo = payload.assignedTo;
    task.requestedBy = payload.requestedBy;
    task.requestedByName = payload.requestedByName;
    task.subtasks = payload.subtasks;
    task.completedAt = payload.status === "done" ? task.completedAt || new Date() : undefined;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Unable to update task" });
  }
});

router.post("/:id/revisions", protect, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can request revisions" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const payload = normalizeRevisionPayload(req.body);
    if (!payload.title) {
      return res.status(400).json({ message: "Revision title is required" });
    }

    if (!payload.section) {
      return res.status(400).json({ message: "Section or page is required" });
    }

    if (!payload.description) {
      return res.status(400).json({ message: "Description of changes is required" });
    }

    task.revisionRequests.push({
      ...payload,
      user: req.user._id,
    });
    addActivity(task, {
      type: "revision_requested",
      title: "Client requested a revision",
      details: payload.title,
      actor: req.user._id,
      actorName: getActorName(req.user),
    });
    task.status = "pending";

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    res.status(201).json(updatedTask);
  } catch (error) {
    console.error("Create task revision request error:", error);
    res.status(500).json({ message: "Unable to submit revision request" });
  }
});

router.post("/:id/feedback", protect, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can submit feedback" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "done") {
      return res.status(400).json({ message: "Feedback is available after the job is completed" });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Please select a rating from 1 to 5" });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ message: "Feedback must be 1000 characters or less" });
    }

    const submittedAt = new Date();
    task.feedback = { user: req.user._id, rating, comment, submittedAt };
    addActivity(task, {
      type: "feedback_submitted",
      title: "Client submitted feedback",
      details: `${rating}/5 rating${comment ? `: ${comment}` : ""}`,
      actor: req.user._id,
      actorName: getActorName(req.user),
    });
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .populate("feedback.user", "firstName lastName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Submit task feedback error:", error);
    res.status(500).json({ message: "Unable to submit feedback" });
  }
});

router.post("/:id/submit-output", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssignedUser = String(task.assignedTo) === String(req.user._id);
    if (req.user.role !== "admin" && !isAssignedUser) {
      return res.status(403).json({ message: "Only the assigned user can submit this output" });
    }

    const outputMethod = req.body.outputMethod === "link" ? "link" : "file";
    const message = String(req.body.message || "").trim();
    const previousSubtasks = task.subtasks.toObject();
    const subtasks = req.body.subtasks !== undefined
      ? normalizeSubtasks(req.body.subtasks)
      : task.subtasks;
    let fileOutput = {};
    let link = "";

    if (outputMethod === "file") {
      if (!req.body.file?.dataUrl) {
        return res.status(400).json({ message: "Please upload a file before submitting" });
      }

      fileOutput = await saveOutputFile(task._id, req.body.file);
      task.attachments.push(fileOutput);
    } else {
      link = String(req.body.link || "").trim();
      if (!link) {
        return res.status(400).json({ message: "Please paste a link before submitting" });
      }
    }

    recordSubtaskActivities(task, previousSubtasks, subtasks, req.user);
    task.subtasks = subtasks;
    task.status = "done";
    task.completedAt = task.completedAt || new Date();
    task.finalOutput = {
      submittedBy: req.user._id,
      message,
      outputMethod,
      fileName: fileOutput.fileName,
      fileUrl: fileOutput.fileUrl,
      link,
      submittedAt: new Date(),
    };
    addActivity(task, {
      type: "output_submitted",
      title: "Final output submitted for client review",
      details: message || "Project output was submitted",
      actor: req.user._id,
      actorName: getActorName(req.user),
    });

    if (message) {
      task.comments.push({
        user: req.user._id,
        comment: message,
      });
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Submit task output error:", error);
    res.status(error.message?.includes("File size") || error.message?.includes("Invalid file") ? 400 : 500).json({
      message: error.message || "Unable to submit output",
    });
  }
});

router.get("/:id/output/download", protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    }).select("finalOutput +finalOutput.fileData");

    if (!task?.finalOutput?.fileUrl) {
      return res.status(404).json({ message: "Submitted output file not found" });
    }

    const { fileName, fileData, fileUrl, mimeType } = task.finalOutput;
    const downloadName = safeFileName(fileName || "submitted-output");

    if (fileData?.length) {
      res.set({
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": fileData.length,
      });
      return res.send(fileData);
    }

    // Files submitted before durable storage was added may still exist on the
    // current server. Restrict the fallback to this task's upload directory.
    const legacyPath = path.join(uploadsRoot, String(task._id), path.basename(fileUrl));
    try {
      await fs.access(legacyPath);
      return res.download(legacyPath, downloadName);
    } catch {
      return res.status(410).json({
        message: "This older uploaded file is no longer available. Please ask the team to submit it again.",
      });
    }
  } catch (error) {
    console.error("Download task output error:", error);
    return res.status(500).json({ message: "Unable to download the submitted output" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    if (!["admin", "client"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins and task owners can delete tasks" });
    }

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
