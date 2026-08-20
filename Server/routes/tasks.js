import express from "express";
import { createHash, randomUUID } from "crypto";
import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import Budget from "../models/Admin/budgetmodel.js";
import { BudgetPlannerEntry } from "../models/Employee/budgetPlannerModel.js";
import Task from "../models/Admin/taskmodel.js";
import User from "../models/userModel.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";
import { getSafeSearchPattern } from "../utils/search.js";
import { withAvatarUrl } from "../utils/avatar.js";
import { getEmployeesOnApprovedLeave } from "../utils/leaveAvailability.js";
import {
  deleteCloudinaryAsset,
  getCloudinaryResourceType,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} from "../utils/cloudinary.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configuredStorageRoot = String(process.env.OUTPUT_STORAGE_ROOT || "").trim();
const legacyUploadsRoot = path.resolve(__dirname, "../uploads/tasks");
const legacyPrivateUploadsRoot = path.resolve(__dirname, "../private_uploads/tasks");
const uploadsRoot = configuredStorageRoot
  ? path.resolve(configuredStorageRoot, "public/tasks")
  : legacyUploadsRoot;
const privateUploadsRoot = configuredStorageRoot
  ? path.resolve(configuredStorageRoot, "private/tasks")
  : legacyPrivateUploadsRoot;

const allowedStatuses = ["pending", "in_progress", "review", "done"];
const allowedPriorities = ["low", "medium", "high"];
const allowedTaskViews = new Set(["calendar", "dashboard", "employee", "notification", "projects"]);

const fullTaskFields = [
  "title", "description", "status", "priority", "startDate", "dueDate", "amount", "paid",
  "downPayment.mode", "downPayment.value", "downPayment.amount", "downPayment.paidAt",
  "subtasks", "activities", "completedAt", "assignedTo", "assignees", "createdBy",
  "requestedBy", "requestedByName", "revisionRequests.user", "revisionRequests.title",
  "revisionRequests.section", "revisionRequests.priority", "revisionRequests.description",
  "revisionRequests.preferredCompletionDate", "revisionRequests.createdAt",
  "revisionRequests.startedAt", "revisionRequests.startedBy", "finalOutput.submittedBy",
  "finalOutput.message", "finalOutput.outputMethod", "finalOutput.fileName",
  "finalOutput.fileUrl", "finalOutput.previewFileName", "finalOutput.mimeType",
  "finalOutput.watermarked", "finalOutput.link",
  "finalOutput.submittedAt", "feedback.user", "feedback.rating", "feedback.submittedBy",
  "feedback.overallRating", "feedback.communication", "feedback.communicationRating",
  "feedback.quality", "feedback.qualityRating", "feedback.timeliness",
  "feedback.timelinessRating", "feedback.overallSatisfaction", "feedback.comment",
  "feedback.wouldRecommend", "feedback.submittedAt", "feedback.reply.message",
  "feedback.reply.repliedBy", "feedback.reply.repliedAt",
  "newsfeedPermission.allowed", "newsfeedPermission.grantedAt", "newsfeedPermission.grantedBy",
  "attachments.fileName", "attachments.fileUrl", "archived", "archivedAt", "archivedBy",
  "employeePayments.employee", "employeePayments.amount", "employeePayments.paidAt",
  "employeePayments.paidBy", "employeePayments.budgetEntry", "employeePayments.employeeBudgetEntry",
  "createdAt", "updatedAt",
].join(" ");

const taskFieldsByView = {
  projects: [
    "title", "description", "status", "priority", "startDate", "dueDate", "amount", "paid",
    "downPayment.mode", "downPayment.value", "downPayment.amount", "downPayment.paidAt",
    "assignedTo", "assignees", "requestedBy", "requestedByName",
    "subtasks._id", "subtasks.title", "subtasks.completed", "subtasks.assignedTo",
    "activities.type", "revisionRequests._id", "finalOutput.submittedBy", "finalOutput.submittedAt",
    "finalOutput.message", "finalOutput.outputMethod", "finalOutput.fileName", "finalOutput.fileUrl",
    "finalOutput.link", "finalOutput.mimeType", "finalOutput.watermarked",
    "attachments.fileName", "attachments.fileUrl", "feedback.rating", "feedback.overallRating",
    "feedback.comment", "feedback.submittedAt", "feedback.reply.message", "archived", "archivedAt",
    "newsfeedPermission.allowed", "newsfeedPermission.grantedAt", "newsfeedPermission.grantedBy",
    "employeePayments.employee", "employeePayments.amount", "employeePayments.paidAt",
    "employeePayments.paidBy", "employeePayments.budgetEntry", "employeePayments.employeeBudgetEntry",
    "createdAt", "updatedAt",
  ].join(" "),
  notification: [
    "title", "assignedTo", "assignees", "subtasks.assignedTo", "createdBy",
    "activities._id", "activities.type", "activities.actor", "activities.actorName",
    "activities.title", "activities.details", "activities.createdAt", "createdAt", "updatedAt",
  ].join(" "),
  employee: "title status dueDate assignedTo assignees subtasks.assignedTo archived createdAt updatedAt",
  calendar: "title status startDate dueDate assignedTo assignees subtasks._id archived createdAt updatedAt",
  dashboard: [
    "title", "description", "status", "priority", "startDate", "dueDate", "amount", "paid",
    "completedAt", "assignedTo", "assignees", "createdBy", "requestedBy", "requestedByName",
    "subtasks.title", "subtasks.completed", "subtasks.assignedTo", "revisionRequests.title",
    "revisionRequests.description", "revisionRequests.priority", "revisionRequests.createdAt",
    "archived", "createdAt", "updatedAt",
  ].join(" "),
};

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
  if (!subtasks.length) return "At least one task is required";

  const firstIncompleteIndex = subtasks.findIndex((subtask) => !subtask.completed);
  const hasCompletedTaskAfterGap =
    firstIncompleteIndex >= 0 &&
    subtasks.slice(firstIncompleteIndex + 1).some((subtask) => subtask.completed);

  if (hasCompletedTaskAfterGap) {
    return "Tasks must be completed in order";
  }

  return "";
};

const allSubtasksCompleted = (subtasks) =>
  subtasks.length > 0 && subtasks.every((subtask) => subtask.completed);

const isClientReviewSubtask = (subtask) =>
  /client\s+(?:review.*revision|revision)|review.*revision/i.test(
    String(subtask?.title || "")
  );

const isSubmitOutputSubtask = (subtask) =>
  String(subtask?.title || "").trim().toLowerCase() === "submit output";

const ensureSubmitOutputSubtask = (subtasks = []) =>
  subtasks.some(isSubmitOutputSubtask)
    ? subtasks
    : [
        ...subtasks,
        {
          title: "Submit Output",
          completed: false,
        },
      ];

const getDownPayment = (body, projectAmount) => {
  const mode = ["percentage", "fixed"].includes(body.downPaymentType)
    ? body.downPaymentType
    : "";
  if (!mode) return { downPayment: undefined, message: "" };

  const value = Number(body.downPaymentValue);
  if (!Number.isFinite(value) || value <= 0) {
    return { message: "Down payment must be greater than 0" };
  }
  if (!Number.isFinite(projectAmount) || projectAmount <= 0) {
    return { message: "Set a project amount before adding a down payment" };
  }
  if (mode === "percentage" && value > 100) {
    return { message: "Down payment percentage cannot be greater than 100%" };
  }

  const amount = Math.round(
    (mode === "percentage" ? projectAmount * (value / 100) : value) * 100
  ) / 100;
  if (amount > projectAmount) {
    return { message: "Down payment cannot be greater than the project amount" };
  }

  return {
    downPayment: {
      mode,
      value,
      amount,
      paidAt: new Date(),
    },
    message: "",
  };
};

const getSubmissionSubtaskIndex = (subtasks) => {
  const submitOutputIndex = subtasks.findIndex(isSubmitOutputSubtask);
  if (submitOutputIndex >= 0) return submitOutputIndex;
  const reviewIndex = subtasks.findIndex(isClientReviewSubtask);
  return reviewIndex >= 0 ? reviewIndex : subtasks.length - 1;
};

const isClientReviewReady = (subtasks) => {
  const submissionIndex = getSubmissionSubtaskIndex(subtasks);
  return submissionIndex >= 0 && subtasks
    .slice(0, submissionIndex + 1)
    .every((subtask) => subtask.completed);
};

const hasClientApproval = (task) =>
  task.activities?.some((activity) => activity.type === "client_approved");

const validateClientReviewGate = (task, subtasks) => {
  if (subtasks.some(isSubmitOutputSubtask)) return "";
  const reviewIndex = subtasks.findIndex(isClientReviewSubtask);
  if (reviewIndex < 0 || hasClientApproval(task)) return "";

  return subtasks.slice(reviewIndex + 1).some((subtask) => subtask.completed)
    ? "Wait for the client to approve the review before completing the remaining tasks"
    : "";
};

const validateSubtaskAssignees = (subtasks, assignees) => {
  const teamIds = new Set(assignees.map(String));
  return subtasks.some(
    (subtask) => subtask.assignedTo && !teamIds.has(String(subtask.assignedTo))
  )
    ? "Every task assignee must also be assigned to the project"
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

const validateProjectAssignees = async (assignees, adminUserId, existingAssignees = []) => {
  if (!assignees.length) return "Select at least one project assignee";

  const employeeAssignees = assignees.filter(
    (assigneeId) => String(assigneeId) !== String(adminUserId)
  );
  const employeeCount = await User.countDocuments({
    _id: { $in: employeeAssignees },
    role: "employee",
    isActive: true,
  }).maxTimeMS(8000);
  if (employeeCount !== employeeAssignees.length) {
    return "Projects can only be assigned to active employees or yourself";
  }

  const existingAssigneeIds = new Set(existingAssignees.map(String));
  const newlyAssignedEmployeeIds = employeeAssignees.filter(
    (employeeId) => !existingAssigneeIds.has(String(employeeId))
  );
  const approvedLeaves = await getEmployeesOnApprovedLeave(newlyAssignedEmployeeIds);

  if (approvedLeaves.length === 0) return "";

  const employeeNames = approvedLeaves
    .map((leaveRequest) => leaveRequest.employeeName)
    .filter(Boolean)
    .join(", ");

  return employeeNames
    ? `${employeeNames} cannot be assigned because ${approvedLeaves.length === 1 ? "this employee is" : "these employees are"} currently on approved leave`
    : "Employees currently on approved leave cannot be assigned to a project";
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

export const isPaymentProtectedTask = (task) =>
  Number(task?.amount || 0) <= 0 || Number(task?.paid || 0) < Number(task?.amount || 0);

export const getTaskFinalOutputForViewer = (task, viewer) => {
  if (!task?.finalOutput) return task?.finalOutput;
  const safeOutput = {
    ...task.finalOutput,
    originalStoredName: undefined,
    previewStoredName: undefined,
  };
  if (viewer?.role !== "client") return safeOutput;

  const paymentProtected = isPaymentProtectedTask(task);
  return {
    ...safeOutput,
    fileUrl: undefined,
    link: paymentProtected ? "" : safeOutput.link,
    linkProtected: paymentProtected && Boolean(safeOutput.link),
  };
};

const addTaskAvatarUrls = (task, viewer) => {
  const responseTask = {
  ...task,
  assignedTo: withAvatarUrl(task.assignedTo),
  assignees: Array.isArray(task.assignees) ? task.assignees.map(withAvatarUrl) : [],
  subtasks: Array.isArray(task.subtasks)
    ? task.subtasks.map((subtask) => ({
        ...subtask,
        assignedTo: withAvatarUrl(subtask.assignedTo),
      }))
    : [],
  createdBy: withAvatarUrl(task.createdBy),
  requestedBy: withAvatarUrl(task.requestedBy),
  finalOutput: task.finalOutput
    ? {
        ...task.finalOutput,
        submittedBy: withAvatarUrl(task.finalOutput.submittedBy),
      }
    : task.finalOutput,
  employeePayments: Array.isArray(task.employeePayments)
    ? task.employeePayments.map((payment) => ({
        ...payment,
        employee: withAvatarUrl(payment.employee),
        paidBy: withAvatarUrl(payment.paidBy),
      }))
    : [],
  activities: Array.isArray(task.activities)
    ? task.activities.map((activity) => ({
        ...activity,
        actor: withAvatarUrl(activity.actor),
      }))
    : [],
  feedback: task.feedback
    ? {
        ...task.feedback,
        user: withAvatarUrl(task.feedback.user),
        submittedBy: withAvatarUrl(task.feedback.submittedBy),
        reply: task.feedback.reply
          ? {
              ...task.feedback.reply,
              repliedBy: withAvatarUrl(task.feedback.reply.repliedBy),
            }
          : task.feedback.reply,
      }
    : task.feedback,
  newsfeedPermission: task.newsfeedPermission
    ? {
        ...task.newsfeedPermission,
        grantedBy: withAvatarUrl(task.newsfeedPermission.grantedBy),
      }
    : task.newsfeedPermission,
  };

  responseTask.finalOutput = getTaskFinalOutputForViewer(responseTask, viewer);

  return responseTask;
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
      title: `${completed ? "Completed" : "Reopened"} task: ${subtask.title}`,
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
  const subtasks = ensureSubmitOutputSubtask(normalizeSubtasks(body.subtasks)).map((subtask) => ({
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

const MAX_OUTPUT_FILE_BYTES = 10 * 1024 * 1024;
// Project outputs intentionally exclude active browser content and executable
// formats. Stored names and extensions are derived only from this allowlist.
const OUTPUT_MIME_EXTENSIONS = new Map([
  ["application/msword", ".doc"],
  ["application/pdf", ".pdf"],
  ["application/rtf", ".rtf"],
  ["application/vnd.ms-excel", ".xls"],
  ["application/vnd.ms-powerpoint", ".ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["audio/mpeg", ".mp3"],
  ["audio/ogg", ".ogg"],
  ["audio/wav", ".wav"],
  ["image/gif", ".gif"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["text/csv", ".csv"],
  ["text/plain", ".txt"],
]);
const RASTER_IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ACTIVE_OR_EXECUTABLE_MIME_PATTERN = /^(?:text\/html|image\/svg\+xml|application\/(?:xhtml\+xml|xml|javascript|ecmascript|x-httpd-php|x-executable|x-msdownload|x-sh|x-shellscript))$/i;

const outputValidationError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const hasRasterImageSignature = (mimeType, buffer) => {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (mimeType === "image/gif") {
    const signature = buffer.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (mimeType === "image/webp") {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
};

export const parseOutputFile = (file, options = {}) => {
  const dataUrl = String(file?.dataUrl || "");
  const match = /^data:([^;,]+);base64,([a-z0-9+/]*={0,2})$/i.exec(dataUrl);
  if (!match) {
    throw outputValidationError("File must be a valid base64-encoded data URL");
  }

  const mimeType = match[1].trim().toLowerCase();
  if (ACTIVE_OR_EXECUTABLE_MIME_PATTERN.test(mimeType)) {
    throw outputValidationError("HTML, SVG, XML, JavaScript, and executable files are not supported");
  }

  const extension = OUTPUT_MIME_EXTENSIONS.get(mimeType);
  if (!extension) {
    throw outputValidationError("This file type is not supported for project outputs");
  }
  if (options.reviewCopy && !RASTER_IMAGE_MIME_TYPES.has(mimeType)) {
    throw outputValidationError("Review copies must be JPEG, PNG, WebP, or GIF files");
  }
  if (options.rasterImageOnly && !RASTER_IMAGE_MIME_TYPES.has(mimeType)) {
    throw outputValidationError("Image review copies must be JPEG, PNG, WebP, or GIF files");
  }


  const encodedData = match[2];
  if (!encodedData || encodedData.length % 4 !== 0) {
    throw outputValidationError("File data is not valid base64");
  }

  const paddingLength = encodedData.endsWith("==") ? 2 : encodedData.endsWith("=") ? 1 : 0;
  const decodedBytes = (encodedData.length * 3) / 4 - paddingLength;
  if (decodedBytes > MAX_OUTPUT_FILE_BYTES) {
    throw outputValidationError("File size must be 10MB or less", 413);
  }

  const buffer = Buffer.from(encodedData, "base64");
  if (buffer.length !== decodedBytes || buffer.toString("base64") !== encodedData) {
    throw outputValidationError("File data is not valid base64");
  }
  if (RASTER_IMAGE_MIME_TYPES.has(mimeType) && !hasRasterImageSignature(mimeType, buffer)) {
    throw outputValidationError("Image data does not match its declared file type");
  }

  const prefix = buffer.subarray(0, 1024).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  const isActiveDocument = /^(?:<!doctype\s+html|<html|<svg|<\?xml|<script)\b/i.test(prefix);
  const isWindowsExecutable = buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a;
  const isElfExecutable =
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46;
  if (isActiveDocument || isWindowsExecutable || isElfExecutable) {
    throw outputValidationError("Active or executable file content is not supported");
  }

  const suppliedName = safeFileName(file?.fileName || `output${extension}`);
  const baseName = suppliedName.replace(/\.[^.]*$/, "").slice(0, 100) || "output";

  return {
    buffer,
    extension,
    fileName: `${baseName}${extension}`,
    mimeType,
  };
};

const saveOutputFile = async (taskId, parsedFile, options = {}) => {
  const storageRoot = options.private ? privateUploadsRoot : uploadsRoot;
  const taskUploadDir = path.join(storageRoot, String(taskId));
  await fs.mkdir(taskUploadDir, { recursive: true });

  const storedName = `${randomUUID()}${parsedFile.extension}`;
  const filePath = path.join(taskUploadDir, storedName);
  await fs.writeFile(filePath, parsedFile.buffer);

  return {
    fileName: parsedFile.fileName,
    mimeType: parsedFile.mimeType,
    storedName,
    fileUrl: options.private ? undefined : `/uploads/tasks/${taskId}/${storedName}`,
    filePath,
  };
};

const saveTaskOutput = async (taskId, parsedFile, options = {}) => {
  if (isCloudinaryConfigured()) {
    const resourceType = getCloudinaryResourceType(parsedFile.mimeType);
    const folder = `clientra/tasks/${taskId}`;
    const result = await uploadBufferToCloudinary(parsedFile.buffer, {
      folder,
      resourceType,
    });
    return {
      fileName: parsedFile.fileName,
      mimeType: parsedFile.mimeType,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type || resourceType,
    };
  }

  const localFile = await saveOutputFile(taskId, parsedFile, options);
  return {
    ...localFile,
    resourceType: getCloudinaryResourceType(parsedFile.mimeType),
  };
};

const removeFileIfPresent = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const findStoredTaskFile = async (primaryRoot, legacyRoot, taskId, storedFileName) => {
  const roots = configuredStorageRoot && primaryRoot !== legacyRoot
    ? [primaryRoot, legacyRoot]
    : [primaryRoot];

  for (const storageRoot of roots) {
    const filePath = path.join(storageRoot, String(taskId), storedFileName);
    if (!filePath.startsWith(`${storageRoot}${path.sep}`)) continue;

    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return "";
};

const removeStoredTaskOutput = async (taskId, finalOutput) => {
  if (!finalOutput) return;
  const safeTaskId = String(taskId);
  const paths = [];

  if (finalOutput.publicId) {
    await deleteCloudinaryAsset(finalOutput.publicId, finalOutput.resourceType || "raw");
  }
  if (finalOutput.previewPublicId) {
    await deleteCloudinaryAsset(finalOutput.previewPublicId, "image");
  }

  const originalName = path.basename(String(finalOutput?.originalStoredName || ""));
  if (originalName && originalName === finalOutput?.originalStoredName) {
    paths.push(path.join(privateUploadsRoot, safeTaskId, originalName));
  }

  const publicPrefix = `/uploads/tasks/${safeTaskId}/`;
  const publicUrl = String(finalOutput?.fileUrl || "");
  if (publicUrl.startsWith(publicPrefix)) {
    const reviewName = path.basename(publicUrl.slice(publicPrefix.length));
    if (reviewName) paths.push(path.join(uploadsRoot, safeTaskId, reviewName));
  }
  const previewName = path.basename(String(finalOutput?.previewStoredName || ""));
  if (previewName && previewName === finalOutput?.previewStoredName) {
    paths.push(path.join(privateUploadsRoot, safeTaskId, previewName));
  }

  await Promise.all(paths.map(removeFileIfPresent));
};

const removeTaskOutputDirectories = async (taskId, finalOutput) => {
  const safeTaskId = String(taskId);
  if (finalOutput) {
    await removeStoredTaskOutput(taskId, finalOutput).catch((cleanupError) => {
      console.error("Unable to remove task Cloudinary assets:", cleanupError);
    });
  }
  await Promise.all([
    fs.rm(path.join(privateUploadsRoot, safeTaskId), { recursive: true, force: true }),
    fs.rm(path.join(uploadsRoot, safeTaskId), { recursive: true, force: true }),
  ]);
};

export const normalizeHttpOutputLink = (value) => {
  const link = String(value || "").trim();
  if (!link) return "";

  try {
    const parsed = new URL(link);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
};

export const assertDistinctReviewFile = (originalFile, reviewFile) => {
  if (!Buffer.isBuffer(originalFile?.buffer) || !Buffer.isBuffer(reviewFile?.buffer)) {
    throw outputValidationError("Invalid protected review file");
  }
  if (originalFile.buffer.equals(reviewFile.buffer)) {
    throw outputValidationError("The protected review copy must be different from the original file");
  }
};

export const createProtectedImageReview = async (originalFile) => {
  try {
    const source = sharp(originalFile.buffer, {
      animated: false,
      failOn: "warning",
      limitInputPixels: 40_000_000,
    }).rotate();
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Image dimensions are unavailable");
    }

    const scale = Math.min(1, 1600 / Math.max(metadata.width, metadata.height));
    const width = Math.max(1, Math.round(metadata.width * scale));
    const height = Math.max(1, Math.round(metadata.height * scale));
    const centerFontSize = Math.max(12, Math.min(56, Math.round(Math.min(width, height) / 8)));
    const watermark = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs>
          <pattern id="preview" width="360" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
            <text x="12" y="100" fill="rgba(255,255,255,0.48)" stroke="rgba(20,20,20,0.2)" stroke-width="1" font-family="sans-serif" font-size="34" font-weight="700">CLIENTRA PREVIEW</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#preview)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.62)" stroke="rgba(20,20,20,0.35)" stroke-width="1" font-family="sans-serif" font-size="${centerFontSize}" font-weight="800">CLIENTRA PREVIEW</text>
      </svg>
    `);
    const buffer = await source
      .resize({ width, height, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .composite([{ input: watermark, blend: "over" }])
      .jpeg({ quality: 72, chromaSubsampling: "4:2:0" })
      .toBuffer();
    const baseName = originalFile.fileName.replace(/\.[^.]*$/, "").slice(0, 80) || "output";

    return {
      buffer,
      extension: ".jpg",
      fileName: `${baseName}-protected-review.jpg`,
      mimeType: "image/jpeg",
    };
  } catch (error) {
    throw outputValidationError(`Unable to generate a protected image review: ${error.message}`);
  }
};

router.get("/", protect, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query = { ...taskQueryForUser(req.user) };
    const search = getSafeSearchPattern(req.query.search);
    const view = allowedTaskViews.has(req.query.view) ? req.query.view : "";

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
    if (view === "employee") {
      query.status = { $ne: "done" };
      query.archived = { $ne: true };
    }

    let taskRequest = Task.find(query)
      .select(taskFieldsByView[view] || fullTaskFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .maxTimeMS(8000);

    if (!view) {
      // Select only the avatar version here. The response transformer adds a
      // lightweight signed image URL instead of repeating Base64 image data.
      taskRequest = taskRequest
        .populate("assignedTo", "firstName lastName email role updatedAt")
      .populate("assignees", "firstName lastName email role updatedAt")
      .populate("subtasks.assignedTo", "firstName lastName email role updatedAt")
      .populate("createdBy", "firstName lastName companyName email role updatedAt")
      .populate("requestedBy", "firstName lastName companyName email role updatedAt")
      .populate("finalOutput.submittedBy", "firstName lastName email role updatedAt")
      .populate("employeePayments.employee", "firstName lastName email role updatedAt")
      .populate("employeePayments.paidBy", "firstName lastName email role updatedAt")
      .populate("feedback.user", "firstName lastName companyName email role updatedAt")
      .populate("feedback.submittedBy", "firstName lastName companyName email role updatedAt")
        .populate("feedback.reply.repliedBy", "firstName lastName companyName email role updatedAt")
        .populate("newsfeedPermission.grantedBy", "firstName lastName companyName email role updatedAt");
    } else if (view === "projects") {
      taskRequest = taskRequest
        .populate("assignedTo", "firstName lastName email role updatedAt")
        .populate("assignees", "firstName lastName email role updatedAt")
        .populate("subtasks.assignedTo", "firstName lastName email role updatedAt")
        .populate("requestedBy", "firstName lastName companyName email role updatedAt")
        .populate("finalOutput.submittedBy", "firstName lastName email role updatedAt")
        .populate("employeePayments.employee", "firstName lastName email role updatedAt")
        .populate("employeePayments.paidBy", "firstName lastName email role updatedAt");
    } else if (view === "dashboard" || view === "notification") {
      taskRequest = taskRequest
        .populate("assignedTo", "firstName lastName email role updatedAt")
        .populate("createdBy", "firstName lastName companyName email role updatedAt");
    }

    const [rawTasks, total] = await Promise.all([
      taskRequest.lean(),
      Task.countDocuments(query).maxTimeMS(8000),
    ]);
    const tasks = rawTasks.map((task) => addTaskAvatarUrls(task, req.user));

    res.status(200).json(pagedResponse({ data: tasks, page, limit, total, key: "tasks" }));
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Unable to fetch tasks" });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    })
      .select(fullTaskFields)
      .populate("assignedTo", "firstName lastName email role updatedAt")
      .populate("assignees", "firstName lastName email role updatedAt")
      .populate("subtasks.assignedTo", "firstName lastName email role updatedAt")
      .populate("activities.actor", "firstName lastName companyName email role updatedAt")
      .populate("createdBy", "firstName lastName companyName email role updatedAt")
      .populate("requestedBy", "firstName lastName companyName email role updatedAt")
      .populate("finalOutput.submittedBy", "firstName lastName email role updatedAt")
      .populate("employeePayments.employee", "firstName lastName email role updatedAt")
      .populate("employeePayments.paidBy", "firstName lastName email role updatedAt")
      .populate("feedback.user", "firstName lastName companyName email role updatedAt")
      .populate("feedback.submittedBy", "firstName lastName companyName email role updatedAt")
      .populate("feedback.reply.repliedBy", "firstName lastName companyName email role updatedAt")
      .populate("newsfeedPermission.grantedBy", "firstName lastName companyName email role updatedAt")
      .maxTimeMS(8000)
      .lean();

    if (!task) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.status(200).json(addTaskAvatarUrls(task, req.user));
  } catch (error) {
    console.error("Get project details error:", error);
    return res.status(500).json({ message: "Unable to fetch project details" });
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
    const downPaymentResult = req.user.role === "admin"
      ? getDownPayment(req.body, payload.amount)
      : { downPayment: undefined, message: "" };
    if (downPaymentResult.message) {
      return res.status(400).json({ message: downPaymentResult.message });
    }
    const downPayment = downPaymentResult.downPayment;
    payload.paid = downPayment?.amount || 0;

    if (!payload.title) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (req.user.role === "admin") {
      const assigneeValidationMessage = await validateProjectAssignees(
        payload.assignees,
        req.user._id
      );
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
      return res.status(400).json({ message: "Complete every task before completing the project" });
    }

    if (payload.paid > payload.amount) {
      return res.status(400).json({ message: "Paid amount cannot be greater than the total amount" });
    }

    if (!payload.subtasks.length) {
      return res.status(400).json({ message: "At least one task is required" });
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

    const activities = [{
      type: "task_created",
      title: "Task created",
      details: "Project task was created",
      actor: req.user._id,
      actorName: getActorName(req.user),
    }];
    if (downPayment?.amount > 0) {
      activities.push({
        type: "down_payment_received",
        title: "Down payment received",
        details: `Received ₱${downPayment.amount.toFixed(2)} down payment`,
        actor: req.user._id,
        actorName: getActorName(req.user),
      });
    }

    const task = await Task.create({
      ...payload,
      createdBy: req.user._id,
      downPayment,
      completedAt: payload.status === "done" ? new Date() : undefined,
      activities,
    });

    if (downPayment?.amount > 0) {
      try {
        await Budget.create({
          type: "income",
          description: `Project down payment: ${task.title}`,
          category: "Project Down Payment",
          date: downPayment.paidAt,
          amount: downPayment.amount,
          sourceTask: task._id,
        });
      } catch (error) {
        await task.deleteOne();
        throw error;
      }
    }

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
        return res.status(403).json({ message: "Employees cannot add or remove tasks" });
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
        return res.status(403).json({ message: "You can only update tasks assigned to you" });
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

      await task.populate([
        { path: "assignedTo", select: "firstName lastName email role" },
        { path: "assignees", select: "firstName lastName email role" },
        { path: "subtasks.assignedTo", select: "firstName lastName email role" },
        { path: "createdBy", select: "firstName lastName email role" },
        { path: "requestedBy", select: "firstName lastName companyName email role" },
      ]);

      return res.status(200).json(addTaskAvatarUrls(task.toObject(), req.user));
    }

    if (req.user.role !== "admin") {
      if (req.user.role !== "client") {
        return res.status(403).json({ message: "You cannot update this project" });
      }

      const amountWasChanged =
        Object.hasOwn(req.body, "amount") &&
        Number(req.body.amount) !== Number(task.amount || 0);
      const paidWasChanged =
        Object.hasOwn(req.body, "paid") &&
        Number(req.body.paid) !== Number(task.paid || 0);
      if (amountWasChanged || paidWasChanged) {
        return res.status(403).json({ message: "Clients cannot change project payment details" });
      }

      const title = req.body.title === undefined
        ? task.title
        : String(req.body.title || "").trim();
      const description = req.body.description === undefined
        ? task.description
        : String(req.body.description || "").trim();
      const priority = req.body.priority === undefined
        ? task.priority
        : String(req.body.priority || "").trim().toLowerCase();
      const startDate = req.body.startDate === undefined
        ? new Date(task.startDate || task.createdAt || task.dueDate)
        : new Date(req.body.startDate);
      const dueDate = req.body.dueDate === undefined
        ? new Date(task.dueDate)
        : new Date(req.body.dueDate);

      if (!title) {
        return res.status(400).json({ message: "Task title is required" });
      }
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({ message: "Invalid project priority" });
      }
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ message: "Valid start date is required" });
      }
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ message: "Valid due date is required" });
      }
      if (startDate > dueDate) {
        return res.status(400).json({ message: "Start date cannot be after due date" });
      }
      if (
        (req.body.startDate !== undefined && isPastDate(startDate)) ||
        (req.body.dueDate !== undefined && isPastDate(dueDate))
      ) {
        return res.status(400).json({ message: "Past dates cannot be selected" });
      }

      task.title = title;
      task.description = description;
      task.startDate = startDate;
      task.dueDate = dueDate;
      task.priority = priority;
      await task.save();

      await task.populate([
        { path: "assignedTo", select: "firstName lastName email role" },
        { path: "assignees", select: "firstName lastName email role" },
        { path: "subtasks.assignedTo", select: "firstName lastName email role" },
        { path: "createdBy", select: "firstName lastName email role" },
        { path: "requestedBy", select: "firstName lastName companyName email role" },
        { path: "finalOutput.submittedBy", select: "firstName lastName email role" },
      ]);

      return res.status(200).json(addTaskAvatarUrls(task.toObject(), req.user));
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
        paid: task.paid,
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
      const assigneeValidationMessage = await validateProjectAssignees(
        payload.assignees,
        req.user._id,
        taskAssigneeIds(task)
      );
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
      return res.status(400).json({ message: "Complete every task before completing the project" });
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

    await task.populate([
      { path: "assignedTo", select: "firstName lastName email role" },
      { path: "assignees", select: "firstName lastName email role" },
      { path: "subtasks.assignedTo", select: "firstName lastName email role" },
      { path: "createdBy", select: "firstName lastName email role" },
      { path: "requestedBy", select: "firstName lastName companyName email role" },
      { path: "finalOutput.submittedBy", select: "firstName lastName email role" },
    ]);

    res.status(200).json(addTaskAvatarUrls(task.toObject(), req.user));
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Unable to update task" });
  }
});

router.post("/:id/mark-paid", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can mark projects as paid" });
    }

    let removedPreviewPublicId = "";
    let removedPreviewStoredName = "";

    await session.withTransaction(async () => {
      const task = await Task.findById(req.params.id).session(session);
      if (!task) throw outputValidationError("Project not found", 404);

      const projectAmount = Number(task.amount || 0);
      if (!Number.isFinite(projectAmount) || projectAmount <= 0) {
        throw outputValidationError("Set a project amount before marking it as paid");
      }

      const paymentDate = new Date();
      await Budget.findOneAndUpdate(
        { sourceTask: task._id },
        {
          $set: {
            type: "income",
            description: `Project payment: ${task.title}`,
            category: "Project Income",
            date: paymentDate,
            amount: projectAmount,
            sourceTask: task._id,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
          session,
        }
      );

      task.paid = projectAmount;

      if (task.finalOutput && task.finalOutput.watermarked) {
        removedPreviewPublicId = task.finalOutput.previewPublicId || "";
        removedPreviewStoredName = task.finalOutput.previewStoredName || "";

        task.finalOutput.watermarked = false;
        task.finalOutput.previewFileName = undefined;
        task.finalOutput.previewStoredName = undefined;
        task.finalOutput.previewPublicId = undefined;
        task.finalOutput.previewUrl = undefined;
      }

      await task.save({ session });
    });

    // Clean up watermarked preview files after the transaction commits (best-effort)
    const cleanupTasks = [];
    if (removedPreviewPublicId) {
      cleanupTasks.push(deleteCloudinaryAsset(removedPreviewPublicId, "image"));
    }
    if (removedPreviewStoredName) {
      const previewName = path.basename(String(removedPreviewStoredName));
      if (previewName && previewName === removedPreviewStoredName) {
        cleanupTasks.push(
          removeFileIfPresent(path.join(privateUploadsRoot, String(req.params.id), previewName))
        );
      }
    }
    if (cleanupTasks.length > 0) {
      await Promise.all(cleanupTasks).catch((cleanupError) => {
        console.error("Unable to remove watermarked preview files after marking paid:", cleanupError);
      });
    }

    const updatedTask = await Task.findById(req.params.id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName companyName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();

    return res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Mark project paid error:", error);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    return res.status(status).json({
      message: status < 500 ? error.message : "Unable to mark this project as paid",
    });
  } finally {
    await session.endSession();
  }
});

router.post("/:id/pay-employee", protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can pay assigned employees" });
    }

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than 0" });
    }

    const task = await Task.findById(req.params.id)
      .select("title assignedTo assignees employeePayments")
      .maxTimeMS(8000);
    if (!task) {
      return res.status(404).json({ message: "Project not found" });
    }

    const assignedEmployeeIds = taskAssigneeIds(task);
    if (!assignedEmployeeIds.length) {
      return res.status(400).json({ message: "Assign an employee to this project before recording payment" });
    }

    const employeeId = String(
      req.body?.employeeId || (assignedEmployeeIds.length === 1 ? assignedEmployeeIds[0] : "")
    );
    if (!employeeId) {
      return res.status(400).json({ message: "Select one of the employees assigned to this project" });
    }
    if (!assignedEmployeeIds.includes(employeeId)) {
      return res.status(400).json({ message: "Only an employee assigned to this project can be paid" });
    }

    const employee = await User.findOne({ _id: employeeId, role: "employee" })
      .select("firstName lastName email role")
      .maxTimeMS(8000);
    if (!employee) {
      return res.status(400).json({ message: "The selected project assignee is not an employee" });
    }

    const hasExistingPayment = task.employeePayments?.some(
      (payment) => String(payment.employee?._id || payment.employee) === employeeId
    );
    if (hasExistingPayment) {
      return res.status(409).json({ message: "This employee has already been paid for this project" });
    }

    const employeeName = getActorName(employee);
    const sourceEmployeePayment = `${task._id}:${employee._id}`;
    const budgetEntryId = createHash("sha256")
      .update(`employee-payment:${sourceEmployeePayment}`)
      .digest("hex")
      .slice(0, 24);
    const employeeIncomeEntryId = createHash("sha256")
      .update(`employee-budget-income:${sourceEmployeePayment}`)
      .digest("hex")
      .slice(0, 24);

    await session.withTransaction(async () => {
      const currentTask = await Task.findById(task._id)
        .select("title assignedTo assignees employeePayments")
        .session(session);
      if (!currentTask) throw outputValidationError("Project not found", 404);
      const currentAssignedEmployeeIds = taskAssigneeIds(currentTask);
      if (!currentAssignedEmployeeIds.includes(employeeId)) {
        throw outputValidationError("Only an employee assigned to this project can be paid");
      }
      if (currentTask.employeePayments?.some(
        (payment) => String(payment.employee?._id || payment.employee) === employeeId
      )) {
        throw outputValidationError("This employee has already been paid for this project", 409);
      }
      const currentEmployee = await User.findOne({
        _id: employeeId,
        role: "employee",
        isActive: { $ne: false },
      }).session(session);
      if (!currentEmployee) {
        throw outputValidationError("The selected project assignee is not an active employee");
      }

      const paidAt = new Date();
      const budgetEntry = await Budget.findOneAndUpdate(
        { _id: budgetEntryId },
        {
          $setOnInsert: {
            type: "expense",
            description: `Employee payment: ${employeeName} — ${currentTask.title}`,
            category: "Employee Payment",
            date: paidAt,
            amount,
            sourceEmployeePayment,
            relatedTask: currentTask._id,
            paidEmployee: currentEmployee._id,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
          session,
        }
      );

      const employeeIncomeEntry = await BudgetPlannerEntry.findOneAndUpdate(
        { _id: employeeIncomeEntryId },
        {
          $setOnInsert: {
            owner: currentEmployee._id,
            type: "income",
            description: `Project income: ${currentTask.title}`,
            category: "Project Income",
            date: budgetEntry.date,
            amount: budgetEntry.amount,
            sourceEmployeePayment,
            relatedTask: currentTask._id,
            paidBy: req.user._id,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
          session,
        }
      );

      const updatedTaskId = await Task.findOneAndUpdate(
        {
          _id: currentTask._id,
          "employeePayments.employee": { $ne: currentEmployee._id },
        },
        {
          $push: {
            employeePayments: {
              employee: currentEmployee._id,
              amount: budgetEntry.amount,
              paidAt: budgetEntry.date,
              paidBy: req.user._id,
              budgetEntry: budgetEntry._id,
              employeeBudgetEntry: employeeIncomeEntry._id,
            },
            activities: {
              type: "employee_paid",
              title: `Paid employee: ${employeeName}`,
              details: `${employeeName} was paid ₱${Number(budgetEntry.amount).toFixed(2)} for this project`,
              actor: req.user._id,
              actorName: getActorName(req.user),
              createdAt: budgetEntry.date,
            },
          },
        },
        { returnDocument: "after", runValidators: true, session }
      ).select("_id");

      if (!updatedTaskId) {
        throw outputValidationError("This employee has already been paid for this project", 409);
      }
    });

    const updatedTask = await Task.findById(task._id)
      .select(fullTaskFields)
      .populate("assignedTo", "firstName lastName email role updatedAt")
      .populate("assignees", "firstName lastName email role updatedAt")
      .populate("subtasks.assignedTo", "firstName lastName email role updatedAt")
      .populate("createdBy", "firstName lastName companyName email role updatedAt")
      .populate("requestedBy", "firstName lastName companyName email role updatedAt")
      .populate("employeePayments.employee", "firstName lastName email role updatedAt")
      .populate("employeePayments.paidBy", "firstName lastName email role updatedAt")
      .lean();

    return res.status(201).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Pay employee error:", error);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    return res.status(status).json({
      message: status < 500 ? error.message : "Unable to record the employee payment",
    });
  } finally {
    await session.endSession();
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

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
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

    if (payload.preferredCompletionDate && isPastDate(payload.preferredCompletionDate)) {
      return res.status(400).json({ message: "Preferred completion date cannot be in the past" });
    }

    let attachment = undefined;
    if (req.body.file?.dataUrl) {
      const parsedFile = parseOutputFile(req.body.file);
      const savedFile = await saveTaskOutput(task._id, parsedFile, { private: true });
      attachment = {
        fileName: savedFile.fileName,
        fileUrl: savedFile.fileUrl,
        publicId: savedFile.publicId,
        resourceType: savedFile.resourceType,
      };
    }

    task.revisionRequests.push({
      ...payload,
      attachment,
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

    res.status(201).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Create task revision request error:", error);
    res.status(500).json({ message: "Unable to submit revision request" });
  }
});

router.post("/:id/revisions/start", protect, async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only assigned team members can start revisions" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const revision = task.revisionRequests[task.revisionRequests.length - 1];
    if (!revision || revision.startedAt || task.status !== "pending") {
      return res.status(400).json({ message: "This task does not have a pending revision request" });
    }

    if (req.user.role === "employee" && !canUserSubmitTask(task, req.user._id)) {
      return res.status(403).json({ message: "Only the assigned user can start this revision" });
    }

    const restartIndex = getSubmissionSubtaskIndex(task.subtasks);
    if (restartIndex >= 0) {
      task.subtasks.forEach((subtask, index) => {
        if (index >= restartIndex) {
          subtask.completed = false;
          subtask.completedAt = undefined;
        }
      });
    }

    revision.startedAt = new Date();
    revision.startedBy = req.user._id;
    task.status = "in_progress";
    task.completedAt = undefined;
    addActivity(task, {
      type: "revision_started",
      title: "Revision work started",
      details: revision.title,
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
      .populate("revisionRequests.user", "firstName lastName companyName email role")
      .populate("revisionRequests.startedBy", "firstName lastName email role")
      .lean();

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Start task revision error:", error);
    res.status(500).json({ message: "Unable to start revision" });
  }
});

router.post("/:id/approve", protect, async (req, res) => {
  try {
    if (!["admin", "client"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only clients can approve projects" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role === "admin" && task.requestedBy) {
      return res.status(403).json({
        message: "A project linked to a client account must be approved by that client",
      });
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
      title: req.user.role === "admin"
        ? "Admin recorded custom client approval"
        : "Client approved the project",
      details: req.user.role === "admin"
        ? `${task.requestedByName || "Custom client"} approved the submitted output offline`
        : "Submitted output was approved",
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

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Approve project error:", error);
    res.status(500).json({ message: "Unable to approve the project" });
  }
});

router.patch("/:id/newsfeed-permission", protect, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can manage newsfeed posting permission" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    });

    if (!task) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!hasClientApproval(task) || !task.finalOutput?.submittedAt) {
      return res.status(400).json({ message: "Posting permission is only available for an approved submitted output" });
    }

    const allowed = req.body?.allowed === true;
    const permissionChanged = Boolean(task.newsfeedPermission?.allowed) !== allowed;

    if (permissionChanged) {
      task.newsfeedPermission = allowed
        ? {
            allowed: true,
            grantedAt: new Date(),
            grantedBy: req.user._id,
          }
        : { allowed: false };
      addActivity(task, {
        type: allowed ? "newsfeed_permission_granted" : "newsfeed_permission_revoked",
        title: allowed ? "Client allowed newsfeed posting" : "Client removed newsfeed posting permission",
        details: allowed
          ? "The approved project output may now be posted to the newsfeed"
          : "The approved project output may no longer be posted to the newsfeed",
        actor: req.user._id,
        actorName: getActorName(req.user),
      });
      await task.save();
    }

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName companyName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .populate("newsfeedPermission.grantedBy", "firstName lastName companyName email role")
      .lean();

      return res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Update newsfeed permission error:", error);
    return res.status(500).json({ message: "Unable to update newsfeed posting permission" });
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

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Submit task feedback error:", error);
    res.status(500).json({ message: "Unable to submit feedback" });
  }
});

router.delete("/:id/feedback", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can delete client feedback" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (!task.feedback?.submittedAt) {
      return res.status(404).json({ message: "This project does not have submitted feedback" });
    }

    task.set("feedback", undefined);
    task.activities = task.activities.filter(
      (activity) => !["feedback_submitted", "feedback_replied"].includes(activity.type)
    );
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .select("-comments")
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName companyName email role avatar")
      .populate("requestedBy", "firstName lastName companyName email role avatar")
      .lean();

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    console.error("Delete task feedback error:", error);
    res.status(500).json({ message: "Unable to delete feedback" });
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

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
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

    const fullyPaid = !isPaymentProtectedTask(task);
    const canAccessOriginal = req.user.role !== "client" || fullyPaid;
    const canUseOriginal = canAccessOriginal && (task.finalOutput.fileUrl || task.finalOutput.originalStoredName);
    if (!canAccessOriginal && !task.finalOutput.previewUrl && !task.finalOutput.previewStoredName && !task.finalOutput.fileUrl) {
      return res.status(402).json({
        message: "The original output is protected until the project is fully paid",
      });
    }

    const downloadName = canAccessOriginal
      ? task.finalOutput.fileName
      : task.finalOutput.previewFileName || `watermarked-${task.finalOutput.fileName}`;

    // Cloudinary remote URL download
    const cloudinaryFileUrl = canUseOriginal
      ? (task.finalOutput.fileUrl?.startsWith("http") ? task.finalOutput.fileUrl : null)
      : (task.finalOutput.previewUrl?.startsWith("http")
          ? task.finalOutput.previewUrl
          : (task.finalOutput.fileUrl?.startsWith("http") ? task.finalOutput.fileUrl : null));

    if (cloudinaryFileUrl) {
      const response = await fetch(cloudinaryFileUrl);
      if (!response.ok) {
        return res.status(404).json({ message: "The uploaded output file could not be retrieved" });
      }

      const contentType =
        task.finalOutput.mimeType || response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Disposition", `attachment; filename="${safeFileName(downloadName)}"`);
      res.setHeader("Content-Type", contentType);
      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const { Readable } = await import("stream");
      return Readable.fromWeb(response.body).pipe(res);
    }

    // Local filesystem download fallback
    const hasPrivatePreview = !canUseOriginal && Boolean(task.finalOutput.previewStoredName);
    const selectedRoot = canUseOriginal || hasPrivatePreview ? privateUploadsRoot : uploadsRoot;
    const selectedStoredValue = canUseOriginal
      ? String(task.finalOutput.originalStoredName || "")
      : hasPrivatePreview
        ? String(task.finalOutput.previewStoredName || "")
        : String(task.finalOutput.fileUrl || "");
    const storedFileName = path.basename(selectedStoredValue);
    if (
      !storedFileName ||
      ((canUseOriginal || hasPrivatePreview) && storedFileName !== selectedStoredValue)
    ) {
      return res.status(400).json({ message: "Invalid output file" });
    }
    const selectedLegacyRoot = canUseOriginal || hasPrivatePreview
      ? legacyPrivateUploadsRoot
      : legacyUploadsRoot;
    const filePath = await findStoredTaskFile(
      selectedRoot,
      selectedLegacyRoot,
      task._id,
      storedFileName
    );
    if (!filePath) {
      return res.status(404).json({ message: "The uploaded output file could not be found" });
    }

    return res.download(filePath, safeFileName(downloadName || storedFileName));
  } catch (error) {
    console.error("Download task output error:", error);
    return res.status(500).json({ message: "Unable to download task output" });
  }
});

router.get("/:id/attachments/:index/download", protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      ...taskQueryForUser(req.user),
    }).select("attachments");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const attachmentIndex = Number(req.params.index);
    const attachment = Number.isInteger(attachmentIndex) && attachmentIndex >= 0
      ? task.attachments?.[attachmentIndex]
      : null;
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });

    const fileUrl = String(attachment.fileUrl || "");
    const expectedPrefix = `/uploads/tasks/${task._id}/`;
    if (!fileUrl.startsWith(expectedPrefix)) {
      return res.status(400).json({ message: "This attachment is not stored by CLIENTRA" });
    }
    const storedFileName = path.basename(fileUrl.slice(expectedPrefix.length));
    if (!storedFileName) {
      return res.status(400).json({ message: "Invalid attachment file" });
    }

    const filePath = await findStoredTaskFile(
      uploadsRoot,
      legacyUploadsRoot,
      task._id,
      storedFileName
    );
    if (!filePath) {
      return res.status(404).json({ message: "The attachment file could not be found" });
    }
    return res.download(filePath, safeFileName(attachment.fileName || storedFileName));
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ message: "The attachment file could not be found" });
    }
    console.error("Download task attachment error:", error);
    return res.status(500).json({ message: "Unable to download task attachment" });
  }
});

router.post("/:id/submit-output", protect, async (req, res) => {
  const createdFilePaths = [];
  const createdPublicIds = [];
  let outputCommitted = false;
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
    const previousFinalOutput = task.finalOutput?.toObject?.() || task.finalOutput || null;

    if (req.user.role === "employee") {
      if (subtasks.length !== previousSubtasks.length) {
        return res.status(403).json({ message: "Employees cannot add or remove tasks" });
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
        return res.status(403).json({ message: "You can only update tasks assigned to you" });
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
        message: "Complete every task before submitting the final output",
      });
    }

    if (!finalize && !isClientReviewReady(subtasks)) {
      return res.status(400).json({
        message: "Complete the review task or final custom task before submitting for client review",
      });
    }

    if (outputMethod === "file") {
      if (!req.body.file?.dataUrl) {
        return res.status(400).json({ message: "Please upload a file before submitting" });
      }

      const parsedOriginalFile = parseOutputFile(req.body.file);
      const requiresPaymentProtection = isPaymentProtectedTask(task);
      if (requiresPaymentProtection) {
        let parsedReviewFile = null;
        if (RASTER_IMAGE_MIME_TYPES.has(parsedOriginalFile.mimeType)) {
          parsedReviewFile = await createProtectedImageReview(parsedOriginalFile);
        } else {
          parsedReviewFile = req.body.watermarkedFile?.dataUrl
            ? parseOutputFile(req.body.watermarkedFile, { reviewCopy: true })
            : null;
        }

        if (!parsedReviewFile) {
          return res.status(400).json({
            message: "A protected image review copy is required until the project is fully paid",
          });
        }

        if (parsedReviewFile) {
          assertDistinctReviewFile(parsedOriginalFile, parsedReviewFile);
        }

        const [originalFile, reviewFile] = await Promise.all([
          saveTaskOutput(task._id, parsedOriginalFile, { private: true }),
          parsedReviewFile
            ? saveTaskOutput(task._id, parsedReviewFile, { private: true })
            : null,
        ]);
        if (originalFile.filePath) createdFilePaths.push(originalFile.filePath);
        if (originalFile.publicId) {
          createdPublicIds.push({ id: originalFile.publicId, type: originalFile.resourceType });
        }
        if (reviewFile?.filePath) createdFilePaths.push(reviewFile.filePath);
        if (reviewFile?.publicId) {
          createdPublicIds.push({ id: reviewFile.publicId, type: reviewFile.resourceType });
        }

        fileOutput = {
          fileName: originalFile.fileName,
          fileUrl: originalFile.fileUrl,
          publicId: originalFile.publicId,
          resourceType: originalFile.resourceType,
          previewFileName: reviewFile?.fileName,
          previewStoredName: reviewFile?.storedName,
          previewPublicId: reviewFile?.publicId,
          previewUrl: reviewFile?.fileUrl || originalFile.fileUrl,
          originalStoredName: originalFile.storedName,
          mimeType: originalFile.mimeType,
          watermarked: true,
        };
      } else {
        const originalFile = await saveTaskOutput(task._id, parsedOriginalFile, { private: true });
        if (originalFile.filePath) createdFilePaths.push(originalFile.filePath);
        if (originalFile.publicId) {
          createdPublicIds.push({ id: originalFile.publicId, type: originalFile.resourceType });
        }

        fileOutput = {
          fileName: originalFile.fileName,
          fileUrl: originalFile.fileUrl,
          publicId: originalFile.publicId,
          resourceType: originalFile.resourceType,
          originalStoredName: originalFile.storedName,
          mimeType: originalFile.mimeType,
          watermarked: false,
        };
      }
    } else {
      const requestedLink = String(req.body.link || "").trim();
      if (!requestedLink) {
        return res.status(400).json({ message: "Please paste a link before submitting" });
      }
      link = normalizeHttpOutputLink(requestedLink);
      if (!link) {
        return res.status(400).json({ message: "Output links must use HTTP or HTTPS" });
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
      publicId: fileOutput.publicId,
      resourceType: fileOutput.resourceType,
      previewFileName: fileOutput.previewFileName,
      previewStoredName: fileOutput.previewStoredName,
      previewPublicId: fileOutput.previewPublicId,
      previewUrl: fileOutput.previewUrl,
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
    outputCommitted = true;
    await removeStoredTaskOutput(task._id, previousFinalOutput).catch((cleanupError) => {
      console.error("Unable to remove superseded task output files:", cleanupError);
    });

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .populate("finalOutput.submittedBy", "firstName lastName email role")
      .lean();

    res.status(200).json(addTaskAvatarUrls(updatedTask, req.user));
  } catch (error) {
    if (!outputCommitted) {
      if (createdFilePaths.length > 0) {
        await Promise.all(createdFilePaths.map(removeFileIfPresent)).catch((cleanupError) => {
          console.error("Unable to roll back task output files after a failed submission:", cleanupError);
        });
      }
      if (createdPublicIds.length > 0) {
        await Promise.all(
          createdPublicIds.map((item) => deleteCloudinaryAsset(item.id, item.type))
        ).catch((cleanupError) => {
          console.error("Unable to roll back Cloudinary assets after a failed submission:", cleanupError);
        });
      }
    }
    console.error("Submit task output error:", error);
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    res.status(status).json({
      message: status < 500 ? error.message : "Unable to submit output",
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

    await removeTaskOutputDirectories(task._id, task.finalOutput).catch((cleanupError) => {
      console.error("Unable to remove deleted task output files:", cleanupError);
    });

    res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Unable to delete task" });
  }
});

export default router;
