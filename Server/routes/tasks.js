import express from "express";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Task from "../model/Admin/taskmodel.js";
import User from "../model/userModel.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "../uploads/tasks");
const privateUploadsRoot = path.resolve(__dirname, "../private_uploads/tasks");

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
    $or: [
      { assignedTo: user._id },
      { assignees: user._id },
      { "subtasks.assignedTo": user._id },
    ],
  };
};

const normalizeAssigneeIds = (values, fallback) => {
  const input = Array.isArray(values)
    ? values.length > 0
      ? values
      : fallback
        ? [fallback]
        : []
    : values
      ? [values]
      : fallback
        ? [fallback]
        : [];
  return [...new Set(input.map((value) => String(value?._id || value?.id || value || "")).filter(Boolean))];
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
        ...(optionalId(subtask?.assignedTo?._id ?? subtask?.assignedTo?.id ?? subtask?.assignedTo)
          ? { assignedTo: optionalId(subtask?.assignedTo?._id ?? subtask?.assignedTo?.id ?? subtask?.assignedTo) }
          : {}),
        ...(completedAt && !Number.isNaN(completedAt.getTime()) ? { completedAt } : {}),
      };
    })
    .filter((subtask) => subtask.title);
};

const validateSubtaskSequence = (subtasks) => {
  if (!subtasks.length) return "At least one subtask is required";

  const firstIncompleteIndex = subtasks.findIndex((subtask) => !subtask.completed);
  const hasCompletedTaskAfterGap =
    firstIncompleteIndex >= 0 &&
    subtasks.slice(firstIncompleteIndex + 1).some((subtask) => subtask.completed);

  if (hasCompletedTaskAfterGap) {
    return "Subtasks must be completed in order";
  }

  return "";
};

const allSubtasksCompleted = (subtasks) =>
  subtasks.length > 0 && subtasks.every((subtask) => subtask.completed);

const isClientReviewSubtask = (subtask) =>
  /client\s+(?:review.*revision|revision)/i.test(String(subtask?.title || ""));

const isClientReviewReady = (subtasks) => {
  const reviewIndex = subtasks.findIndex(isClientReviewSubtask);
  return reviewIndex >= 0 && subtasks
    .slice(0, reviewIndex + 1)
    .every((subtask) => subtask.completed);
};

const hasClientApproval = (task) =>
  task.activities?.some((activity) => activity.type === "client_approved");

const validateClientReviewGate = (task, subtasks) => {
  const reviewIndex = subtasks.findIndex(isClientReviewSubtask);
  if (reviewIndex < 0 || hasClientApproval(task)) return "";

  return subtasks.slice(reviewIndex + 1).some((subtask) => subtask.completed)
    ? "Wait for the client to approve the review before completing the remaining subtasks"
    : "";
};

const validateSubtaskAssignees = (subtasks, assignees) => {
  const teamIds = new Set(assignees.map(String));
  return subtasks.some(
    (subtask) => subtask.assignedTo && !teamIds.has(String(subtask.assignedTo))
  )
    ? "Every subtask assignee must also be assigned to the task"
    : "";
};

const taskAssigneeIds = (task) => normalizeAssigneeIds(task.assignees, task.assignedTo);

const canEmployeeUpdateSubtask = (task, subtask, userId) => {
  const assignedUserId = String(subtask?.assignedTo?._id || subtask?.assignedTo || "");
  return assignedUserId
    ? assignedUserId === String(userId)
    : taskAssigneeIds(task).includes(String(userId));
};

const canUserSubmitTask = (task, userId) =>
  taskAssigneeIds(task).includes(String(userId)) ||
  task.subtasks.some(
    (subtask) => String(subtask?.assignedTo?._id || subtask?.assignedTo || "") === String(userId)
  );

const validateEmployeeAssignees = async (assignees) => {
  if (!assignees.length) return "Select at least one employee for this task";
  const employeeCount = await User.countDocuments({
    _id: { $in: assignees },
    role: "employee",
    isActive: true,
  }).maxTimeMS(8000);
  return employeeCount === assignees.length
    ? ""
    : "Tasks can only be assigned to active employees";
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
  const amount = Number(body.amount ?? body.budget ?? 0);
  const paid = Number(body.paid ?? 0);
  const subtasks = normalizeSubtasks(body.subtasks).map((subtask) => ({
    ...subtask,
    completed: status === "done" ? true : subtask.completed,
  }));
  const fallbackStatus = allowedStatuses.includes(status) ? status : "in_progress";
  const assignees = normalizeAssigneeIds(
    options.assignees ?? body.assignees,
    options.assignedTo ?? body.assignedTo ?? userId
  );

  return {
    title,
    description: body.description?.trim() || "",
    startDate,
    dueDate,
    status: getStatusFromSubtasks(subtasks, fallbackStatus),
    priority: allowedPriorities.includes(priority) ? priority : "medium",
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    paid: Number.isFinite(paid) && paid >= 0 ? paid : 0,
    assignedTo: assignees[0] || userId,
    assignees,
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

const saveOutputFile = async (taskId, file, options = {}) => {
  const dataUrl = String(file?.dataUrl || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid file upload");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("File size must be 10MB or less");
  }

  const storageRoot = options.private ? privateUploadsRoot : uploadsRoot;
  const taskUploadDir = path.join(storageRoot, String(taskId));
  await fs.mkdir(taskUploadDir, { recursive: true });

  const fileName = `${randomUUID()}-${safeFileName(file.fileName)}`;
  const filePath = path.join(taskUploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    fileName: file.fileName || fileName,
    mimeType: match[1],
    storedName: fileName,
    fileUrl: options.private ? undefined : `/uploads/tasks/${taskId}/${fileName}`,
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
      query.$and = [
        ...(query.$and || []),
        { $or: [{ assignedTo: req.query.assignedTo }, { assignees: req.query.assignedTo }] },
      ];
    }
    if (req.query.dueFrom || req.query.dueTo) {
      query.dueDate = {};
      if (req.query.dueFrom) query.dueDate.$gte = new Date(req.query.dueFrom);
      if (req.query.dueTo) query.dueDate.$lte = new Date(req.query.dueTo);
    }

    const rawTasks = await Task.find(query)
      .select([
        "title",
        "description",
        "status",
        "priority",
        "startDate",
        "dueDate",
        "amount",
        "paid",
        "subtasks",
        "activities",
        "completedAt",
        "assignedTo",
        "assignees",
        "createdBy",
        "requestedBy",
        "requestedByName",
        "revisionRequests.user",
        "revisionRequests.title",
        "revisionRequests.section",
        "revisionRequests.priority",
        "revisionRequests.description",
        "revisionRequests.createdAt",
        "finalOutput.submittedBy",
        "finalOutput.message",
        "finalOutput.outputMethod",
        "finalOutput.fileName",
        "finalOutput.fileUrl",
        "finalOutput.previewFileName",
        "finalOutput.originalStoredName",
        "finalOutput.mimeType",
        "finalOutput.watermarked",
        "finalOutput.link",
        "finalOutput.submittedAt",
        "feedback.user",
        "feedback.submittedBy",
        "feedback.overallRating",
        "feedback.communicationRating",
        "feedback.qualityRating",
        "feedback.timelinessRating",
        "feedback.comment",
        "feedback.submittedAt",
        "feedback.reply.message",
        "feedback.reply.repliedBy",
        "feedback.reply.repliedAt",
        "attachments.fileName",
        "attachments.fileUrl",
        "archived",
        "archivedAt",
        "archivedBy",
        "createdAt",
        "updatedAt",
      ].join(" "))
      .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
      .lean();
    const tasks = rawTasks;
    const total = skip + rawTasks.length;

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
      assignees: req.user.role === "admin" ? req.body.assignees : [req.user._id],
      requestedBy: req.user.role === "admin" ? req.body.requestedBy : req.user._id,
      requestedByName:
        req.user.role === "admin"
          ? req.body.requestedByName
          : [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email,
    });

    if (!payload.title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (req.user.role === "admin") {
      const assigneeValidationMessage = await validateEmployeeAssignees(payload.assignees);
      if (assigneeValidationMessage) {
        return res.status(400).json({ message: assigneeValidationMessage });
      }
    }

    const subtaskValidationMessage = validateSubtaskSequence(payload.subtasks);
    if (subtaskValidationMessage) {
      return res.status(400).json({ message: subtaskValidationMessage });
    }

    const subtaskAssigneeMessage = validateSubtaskAssignees(payload.subtasks, payload.assignees);
    if (subtaskAssigneeMessage) {
      return res.status(400).json({ message: subtaskAssigneeMessage });
    }

    if (req.body.status === "done" && !allSubtasksCompleted(payload.subtasks)) {
      return res.status(400).json({ message: "Complete every subtask before completing the task" });
    }

    if (payload.paid > payload.amount) {
      return res.status(400).json({ message: "Paid amount cannot be greater than the total amount" });
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
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
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
      const requestedSubtasks = normalizeSubtasks(req.body.subtasks ?? task.subtasks);
      if (requestedSubtasks.length !== previousSubtasks.length) {
        return res.status(403).json({ message: "Employees cannot add or remove subtasks" });
      }

      const subtasks = previousSubtasks.map((subtask, index) => {
        const requestedSubtask = requestedSubtasks[index];
        const completionChanged =
          Boolean(requestedSubtask?.completed) !== Boolean(subtask.completed);

        if (completionChanged && !canEmployeeUpdateSubtask(task, subtask, req.user._id)) {
          return null;
        }

        return {
          ...subtask,
          completed: Boolean(requestedSubtask?.completed),
          completedAt: requestedSubtask?.completed ? subtask.completedAt : undefined,
        };
      });

      if (subtasks.some((subtask) => !subtask)) {
        return res.status(403).json({ message: "You can only update subtasks assigned to you" });
      }
      const subtaskValidationMessage = validateSubtaskSequence(subtasks);
      if (subtaskValidationMessage) {
        return res.status(400).json({ message: subtaskValidationMessage });
      }
      const clientReviewGateMessage = validateClientReviewGate(task, subtasks);
      if (clientReviewGateMessage) {
        return res.status(400).json({ message: clientReviewGateMessage });
      }
      recordSubtaskActivities(task, previousSubtasks, subtasks, req.user);
      task.subtasks = subtasks;
      task.status = getStatusFromSubtasks(subtasks, task.status);
      task.completedAt = task.status === "done" ? task.completedAt || new Date() : undefined;

      await task.save();

      const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
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
        amount: req.body.amount ?? task.amount ?? task.budget,
        paid: req.body.paid ?? task.paid,
        assignedTo: req.user.role === "admin" ? req.body.assignedTo ?? task.assignedTo : task.assignedTo,
        assignees: req.user.role === "admin" ? req.body.assignees ?? taskAssigneeIds(task) : taskAssigneeIds(task),
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
        assignees: req.user.role === "admin" ? req.body.assignees ?? taskAssigneeIds(task) : taskAssigneeIds(task),
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

    if (req.user.role === "admin") {
      const assigneeValidationMessage = await validateEmployeeAssignees(payload.assignees);
      if (assigneeValidationMessage) {
        return res.status(400).json({ message: assigneeValidationMessage });
      }
    }

    const subtaskValidationMessage = validateSubtaskSequence(payload.subtasks);
    if (subtaskValidationMessage) {
      return res.status(400).json({ message: subtaskValidationMessage });
    }

    const clientReviewGateMessage = validateClientReviewGate(task, payload.subtasks);
    if (clientReviewGateMessage) {
      return res.status(400).json({ message: clientReviewGateMessage });
    }

    const subtaskAssigneeMessage = validateSubtaskAssignees(payload.subtasks, payload.assignees);
    if (subtaskAssigneeMessage) {
      return res.status(400).json({ message: subtaskAssigneeMessage });
    }

    if (req.body.status === "done" && !allSubtasksCompleted(payload.subtasks)) {
      return res.status(400).json({ message: "Complete every subtask before completing the task" });
    }

    if (payload.paid > payload.amount) {
      return res.status(400).json({ message: "Paid amount cannot be greater than the total amount" });
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
    task.amount = payload.amount;
    task.paid = payload.paid;
    task.assignedTo = payload.assignedTo;
    task.assignees = payload.assignees;
    task.requestedBy = payload.requestedBy;
    task.requestedByName = payload.requestedByName;
    task.subtasks = payload.subtasks;
    task.completedAt = payload.status === "done" ? task.completedAt || new Date() : undefined;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Unable to update task" });
  }
});

router.patch("/:id/archive", protect, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can archive their projects" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });
    if (!task) {
      return res.status(404).json({ message: "Project not found" });
    }

    const archived = req.body?.archived !== false;
    if (Boolean(task.archived) !== archived) {
      task.archived = archived;
      task.archivedAt = archived ? new Date() : undefined;
      task.archivedBy = archived ? req.user._id : undefined;
      addActivity(task, {
        type: archived ? "project_archived" : "project_restored",
        title: archived ? "Project archived" : "Project restored",
        details: archived ? "Project moved to the archive" : "Project restored to My Projects",
        actor: req.user._id,
        actorName: getActorName(req.user),
      });
      await task.save();
    }

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("activities.actor", "firstName lastName companyName email role avatar")
      .populate("createdBy", "firstName lastName companyName email role avatar")
      .populate("requestedBy", "firstName lastName companyName email role avatar")
      .populate("feedback.user", "firstName lastName companyName email role avatar")
      .populate("feedback.submittedBy", "firstName lastName companyName email role avatar")
      .populate("feedback.reply.repliedBy", "firstName lastName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Archive project error:", error);
    res.status(500).json({ message: "Unable to update the project archive" });
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

    if (task.status !== "review" || !task.finalOutput?.submittedAt) {
      return res.status(400).json({
        message: "A revision can only be requested after the assigned user submits the project for client review",
      });
    }

    const payload = normalizeRevisionPayload(req.body);
    if (!payload.title) {
      return res.status(400).json({ message: "Revision title is required" });
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
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    res.status(201).json(updatedTask);
  } catch (error) {
    console.error("Create task revision request error:", error);
    res.status(500).json({ message: "Unable to submit revision request" });
  }
});

router.post("/:id/approve", protect, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can approve projects" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "review" || !task.finalOutput?.submittedAt) {
      return res.status(400).json({ message: "This project is not awaiting client approval" });
    }

    const reviewIndex = task.subtasks.findIndex(isClientReviewSubtask);
    const hasRemainingSubtasks =
      reviewIndex >= 0 &&
      task.subtasks.slice(reviewIndex + 1).some((subtask) => !subtask.completed);
    task.status = hasRemainingSubtasks ? "in_progress" : "done";
    task.completedAt = hasRemainingSubtasks ? undefined : new Date();
    addActivity(task, {
      type: "client_approved",
      title: "Client approved the project",
      details: "Submitted output was approved",
      actor: req.user._id,
      actorName: getActorName(req.user),
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Approve project error:", error);
    res.status(500).json({ message: "Unable to approve the project" });
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
      return res.status(400).json({ message: "Feedback is available after the project is completed" });
    }

    const rating = Number(req.body.overallRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Please select an overall rating" });
    }

    const optionalRating = (value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
    };

    task.feedback = {
      submittedBy: req.user._id,
      overallRating: rating,
      quality: optionalRating(req.body.quality),
      communication: optionalRating(req.body.communication),
      timeliness: optionalRating(req.body.timeliness),
      overallSatisfaction: optionalRating(req.body.overallSatisfaction),
      comment: String(req.body.comment || "").trim().slice(0, 1000),
      wouldRecommend: req.body.wouldRecommend === true,
      submittedAt: new Date(),
    };

    addActivity(task, {
      type: "feedback_submitted",
      title: "Client submitted feedback",
      details: `${rating}/5 rating${task.feedback.comment ? `: ${task.feedback.comment}` : ""}`,
      actor: req.user._id,
      actorName: getActorName(req.user),
    });
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .populate("feedback.user", "firstName lastName email role")
      .populate("feedback.submittedBy", "firstName lastName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Submit task feedback error:", error);
    res.status(500).json({ message: "Unable to submit feedback" });
  }
});

router.post("/:id/feedback/reply", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can reply to client feedback" });
    }

    const message = String(req.body.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Please enter a reply" });
    }
    if (message.length > 1000) {
      return res.status(400).json({ message: "Reply must be 1000 characters or fewer" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (!task.feedback?.submittedAt) {
      return res.status(400).json({ message: "This project does not have submitted feedback yet" });
    }

    const repliedAt = new Date();
    task.feedback.reply = {
      message,
      repliedBy: req.user._id,
      repliedAt,
    };
    addActivity(task, {
      type: "feedback_replied",
      title: "Admin replied to your feedback",
      details: message,
      actor: req.user._id,
      actorName: getActorName(req.user),
      createdAt: repliedAt,
    });
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .select("-comments")
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName companyName email role avatar")
      .populate("requestedBy", "firstName lastName companyName email role avatar")
      .populate("feedback.user", "firstName lastName companyName email role avatar")
      .populate("feedback.submittedBy", "firstName lastName companyName email role avatar")
      .populate("feedback.reply.repliedBy", "firstName lastName email role")
      .lean();

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Reply to feedback error:", error);
    res.status(500).json({ message: "Unable to send feedback reply" });
  }
});

router.get("/:id/output/download", protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    }).select("amount paid finalOutput");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.finalOutput?.fileName) {
      return res.status(404).json({ message: "No uploaded output is available for this task" });
    }

    const fullyPaid = Number(task.amount || 0) > 0 && Number(task.paid || 0) >= Number(task.amount || 0);
    const canAccessOriginal = req.user.role !== "client" || fullyPaid;
    const canUseOriginal = canAccessOriginal && task.finalOutput.originalStoredName;
    if (!canAccessOriginal && !task.finalOutput.fileUrl) {
      return res.status(402).json({
        message: "The original output is protected until the project is fully paid",
      });
    }

    const selectedRoot = canUseOriginal ? privateUploadsRoot : uploadsRoot;
    const storedFileName = canUseOriginal
      ? path.basename(task.finalOutput.originalStoredName)
      : path.basename(task.finalOutput.fileUrl);
    const filePath = path.join(selectedRoot, String(task._id), storedFileName);
    const rootPath = `${selectedRoot}${path.sep}`;
    if (!filePath.startsWith(rootPath)) {
      return res.status(400).json({ message: "Invalid output file" });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: "The uploaded output file could not be found" });
    }

    const downloadName = canAccessOriginal
      ? task.finalOutput.fileName
      : task.finalOutput.previewFileName || `watermarked-${task.finalOutput.fileName}`;
    return res.download(filePath, safeFileName(downloadName || storedFileName));
  } catch (error) {
    console.error("Download task output error:", error);
    return res.status(500).json({ message: "Unable to download task output" });
  }
});

router.post("/:id/submit-output", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssignedUser = canUserSubmitTask(task, req.user._id);
    if (req.user.role !== "admin" && !isAssignedUser) {
      return res.status(403).json({ message: "Only the assigned user can submit this output" });
    }

    const outputMethod = req.body.outputMethod === "link" ? "link" : "file";
    const finalize = req.body.finalize !== false;
    const message = String(req.body.message || "").trim();
    const previousSubtasks = task.subtasks.toObject();
    let subtasks = req.body.subtasks !== undefined
      ? normalizeSubtasks(req.body.subtasks)
      : task.subtasks;
    let fileOutput = {};
    let link = "";

    if (req.user.role === "employee") {
      if (subtasks.length !== previousSubtasks.length) {
        return res.status(403).json({ message: "Employees cannot add or remove subtasks" });
      }

      const mergedSubtasks = previousSubtasks.map((subtask, index) => {
        const requestedSubtask = subtasks[index];
        const completionChanged =
          Boolean(requestedSubtask?.completed) !== Boolean(subtask.completed);
        if (completionChanged && !canEmployeeUpdateSubtask(task, subtask, req.user._id)) {
          return null;
        }
        return {
          ...subtask,
          completed: Boolean(requestedSubtask?.completed),
          completedAt: requestedSubtask?.completed ? subtask.completedAt : undefined,
        };
      });

      if (mergedSubtasks.some((subtask) => !subtask)) {
        return res.status(403).json({ message: "You can only update subtasks assigned to you" });
      }
      subtasks = mergedSubtasks;
    }

    const subtaskValidationMessage = validateSubtaskSequence(subtasks);
    if (subtaskValidationMessage) {
      return res.status(400).json({ message: subtaskValidationMessage });
    }

    const clientReviewGateMessage = validateClientReviewGate(task, subtasks);
    if (clientReviewGateMessage) {
      return res.status(400).json({ message: clientReviewGateMessage });
    }

    if (finalize && !allSubtasksCompleted(subtasks)) {
      return res.status(400).json({
        message: "Complete every subtask before submitting the final output",
      });
    }

    if (!finalize && !isClientReviewReady(subtasks)) {
      return res.status(400).json({
        message: "Complete the Client review and revisions step before submitting for client review",
      });
    }

    if (outputMethod === "file") {
      if (!req.body.file?.dataUrl) {
        return res.status(400).json({ message: "Please upload a file before submitting" });
      }

      const requiresPaymentProtection =
        Number(task.amount || 0) <= 0 || Number(task.paid || 0) < Number(task.amount || 0);
      if (requiresPaymentProtection) {
        const originalFile = await saveOutputFile(task._id, req.body.file, { private: true });
        const reviewFile = req.body.watermarkedFile?.dataUrl
          ? await saveOutputFile(task._id, req.body.watermarkedFile)
          : await saveOutputFile(task._id, req.body.file);
        fileOutput = {
          fileName: originalFile.fileName,
          fileUrl: reviewFile.fileUrl,
          previewFileName: reviewFile.fileName,
          originalStoredName: originalFile.storedName,
          mimeType: originalFile.mimeType,
          watermarked: Boolean(req.body.watermarkedFile?.dataUrl),
        };
      } else {
        fileOutput = await saveOutputFile(task._id, req.body.file);
      }
    } else {
      link = String(req.body.link || "").trim();
      if (!link) {
        return res.status(400).json({ message: "Please paste a link before submitting" });
      }
    }

    recordSubtaskActivities(task, previousSubtasks, subtasks, req.user);
    task.subtasks = subtasks;
    task.status = finalize ? "done" : "review";
    task.completedAt = finalize ? task.completedAt || new Date() : undefined;
    task.finalOutput = {
      submittedBy: req.user._id,
      message,
      outputMethod,
      fileName: fileOutput.fileName,
      fileUrl: fileOutput.fileUrl,
      previewFileName: fileOutput.previewFileName,
      originalStoredName: fileOutput.originalStoredName,
      mimeType: fileOutput.mimeType,
      watermarked: Boolean(fileOutput.watermarked),
      link,
      submittedAt: new Date(),
    };
    addActivity(task, {
      type: "output_submitted",
      title: finalize ? "Final output submitted" : "Output submitted for client review",
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
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
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
