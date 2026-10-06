import mongoose from "mongoose";
import { Project, ProjectTask as Task } from "../models/projectModel.js";
import AdminTask from "../models/Admin/taskmodel.js";
import Budget from "../models/Admin/budgetmodel.js";
import Message from "../models/messageModel.js";
import Client from "../models/Admin/Clientmodel.js";
import User from "../models/userModel.js";
import { extractProjectFromChat } from "../services/chatExtraction.service.js";

/**
 * Controller: Preview Project Extraction from Conversation
 * Route: POST /api/chat/:conversationId/extract-preview
 */
export const previewProjectExtraction = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID parameter.",
      });
    }

    const convId = new mongoose.Types.ObjectId(conversationId);

    // Fetch up to 60 most recent messages from the conversation thread,
    // then reverse to present in clean chronological order for the LLM.
    const messageFilter = req.user?._id
      ? {
          $or: [
            { sender: req.user._id, recipient: convId },
            { sender: convId, recipient: req.user._id },
            { sender: convId },
            { recipient: convId },
          ],
        }
      : {
          $or: [
            { sender: convId },
            { recipient: convId },
          ],
        };

    const messages = await Message.find(messageFilter)
      .populate("sender", "firstName lastName companyName role email")
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    if (!messages || messages.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No chat messages found for this conversation. Start a conversation or exchange requirements first.",
      });
    }

    // Reverse to chronological order for the LLM transcript
    const chronologicalMessages = messages.reverse();

    // Call the LLM extraction service
    const extractedProposal = await extractProjectFromChat(chronologicalMessages);

    return res.status(200).json({
      success: true,
      message: "Project proposal extracted successfully.",
      data: extractedProposal,
    });
  } catch (error) {
    console.error("[chatProjectController.previewProjectExtraction] Error:", error);
    let cleanMessage = error?.message || "An unexpected error occurred.";
    if (typeof cleanMessage === "string" && cleanMessage.startsWith("{") && cleanMessage.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanMessage);
        if (parsed?.error?.message) {
          cleanMessage = parsed.error.message;
        }
      } catch {
        // use raw message
      }
    }
    if (error?.status === 429 || cleanMessage.includes("quota") || cleanMessage.includes("RESOURCE_EXHAUSTED")) {
      cleanMessage = "Gemini API rate limit or free-tier quota reached. Please wait a few seconds and try again.";
    }

    return res.status(error?.status || 500).json({
      success: false,
      message: cleanMessage,
    });
  }
};

/**
 * Controller: Commit Reviewed Inferred Project and Backlog Tasks
 * Route: POST /api/chat/:conversationId/commit-project
 */
export const commitProject = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const {
      projectName,
      clientSummary,
      budgetCeiling,
      startDate,
      targetDeadline,
      downPayment,
      clientId,
      tasks,
    } = req.body;

    if (!projectName || typeof projectName !== "string" || !projectName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required.",
      });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one backlog task is required to commit the project.",
      });
    }

    // Resolve client reference if valid
    let resolvedClientId = null;
    let resolvedClientName = "Client";
    const candidateId = clientId || conversationId;
    if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      const clientDoc = await Client.findById(candidateId).lean();
      if (clientDoc) {
        resolvedClientName = clientDoc.companyName || clientDoc.contactPerson || "Client";
      }
      const userClientDoc = await User.findOne({ _id: candidateId, role: "client" }).lean();
      if (userClientDoc) {
        resolvedClientId = userClientDoc._id;
        resolvedClientName =
          userClientDoc.companyName ||
          [userClientDoc.firstName, userClientDoc.lastName].filter(Boolean).join(" ") ||
          resolvedClientName;
      }
    }

    // Parse start date
    let parsedStartDate = null;
    if (startDate) {
      const sDate = new Date(startDate);
      if (!isNaN(sDate.getTime())) {
        parsedStartDate = sDate;
      }
    }

    // Parse target deadline
    let parsedDeadline = null;
    if (targetDeadline) {
      const deadlineDate = new Date(targetDeadline);
      if (!isNaN(deadlineDate.getTime())) {
        parsedDeadline = deadlineDate;
      }
    }

    const effectiveStartDate = parsedStartDate || new Date();
    const effectiveDueDate = parsedDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Parse numeric budget
    const numericBudget =
      typeof budgetCeiling === "number" && !isNaN(budgetCeiling)
        ? Math.max(0, budgetCeiling)
        : Number(budgetCeiling) || 0;

    // Parse down payment
    let downPaymentData = { mode: "none", value: 0, amount: 0 };
    let taskDownPayment = undefined;
    if (downPayment && ["percentage", "fixed"].includes(downPayment.mode)) {
      const val = Number(downPayment.value) || 0;
      if (val > 0) {
        const amount =
          downPayment.mode === "percentage"
            ? (numericBudget * (val / 100))
            : val;
        downPaymentData = {
          mode: downPayment.mode,
          value: val,
          amount,
        };
        taskDownPayment = {
          mode: downPayment.mode,
          value: val,
          amount,
          paidAt: new Date(),
        };
      }
    }

    // Prepare Subtasks for AdminTask (CLIENTRA project standard)
    const adminUser = req.user?._id || null;
    const subtaskDocs = tasks.map((task) => ({
      title: String(task.title || "Untitled Deliverable").trim(),
      completed: false,
      assignedTo: adminUser,
    }));
    if (!subtaskDocs.some((s) => s.title.toLowerCase() === "submit output")) {
      subtaskDocs.push({
        title: "Submit Output",
        completed: false,
        assignedTo: adminUser,
      });
    }

    // 1. Create the primary Task (Project) document in Admin Task collection (used by Dashboard Projects page)
    const adminTask = await AdminTask.create({
      title: projectName.trim(),
      description: (clientSummary || "").trim(),
      status: "in_progress",
      priority: "medium",
      startDate: effectiveStartDate,
      dueDate: effectiveDueDate,
      amount: numericBudget,
      paid: taskDownPayment?.amount || 0,
      downPayment: taskDownPayment,
      subtasks: subtaskDocs,
      assignees: adminUser ? [adminUser] : [],
      assignedTo: adminUser,
      requestedBy: resolvedClientId || undefined,
      requestedByName: resolvedClientName,
      createdBy: adminUser || (new mongoose.Types.ObjectId()),
      activities: [
        {
          type: "task_created",
          title: "Task created",
          details: "Project was created via CLIENTRA Assistant",
          actor: adminUser || undefined,
          actorName: req.user
            ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email
            : "Admin",
        },
      ],
    });

    if (taskDownPayment?.amount > 0) {
      try {
        await Budget.create({
          type: "income",
          description: `Project down payment: ${adminTask.title}`,
          category: "Project Down Payment",
          date: taskDownPayment.paidAt,
          amount: taskDownPayment.amount,
          sourceTask: adminTask._id,
        });
      } catch (budgetError) {
        console.warn("[commitProject] Failed creating down payment budget entry:", budgetError);
      }
    }

    // 2. Also keep Project and ProjectTask synchronized in projectModel.js
    try {
      const newProject = await Project.create({
        _id: adminTask._id,
        name: projectName.trim(),
        description: (clientSummary || "").trim(),
        client: resolvedClientId,
        budget: numericBudget,
        startDate: effectiveStartDate,
        deadline: effectiveDueDate,
        downPayment: downPaymentData,
        status: "Planning",
        progress: 0,
      });

      const validPriorities = ["Low", "Medium", "High", "Urgent"];
      const legacyTaskDocs = tasks.map((task) => ({
        project: newProject._id,
        title: String(task.title || "Untitled Task").trim(),
        description: String(task.description || "").trim(),
        requiredSkills: Array.isArray(task.requiredSkills)
          ? task.requiredSkills.map((s) => String(s).trim()).filter(Boolean)
          : [],
        priority: validPriorities.includes(task.priority) ? task.priority : "Medium",
        status: "Backlog",
        assignedTo: null,
      }));
      await Task.insertMany(legacyTaskDocs);
    } catch (legacyErr) {
      console.warn("[commitProject] Legacy project sync note:", legacyErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Project and tasks created successfully.",
      data: {
        project: adminTask,
      },
    });
  } catch (error) {
    console.error("[chatProjectController.commitProject] Error:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "An unexpected error occurred while committing the project.",
    });
  }
};

/**
 * Controller: Preview Project Extraction from External Transcript (Browser Extension / Paste)
 * Route: POST /api/chat/external-preview
 */
export const previewExternalProjectExtraction = async (req, res) => {
  try {
    const { transcript, clientHint } = req.body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Transcript text is required and must contain at least 10 characters.",
      });
    }

    let inputForLlm = transcript.trim();
    if (clientHint && typeof clientHint === "string" && clientHint.trim()) {
      inputForLlm = `[Context Note: Client name/platform hint: ${clientHint.trim()}]\n\n${inputForLlm}`;
    }

    const extractedProposal = await extractProjectFromChat(inputForLlm);

    return res.status(200).json({
      success: true,
      message: "External project proposal extracted successfully.",
      data: extractedProposal,
    });
  } catch (error) {
    console.error("[chatProjectController.previewExternalProjectExtraction] Error:", error);
    let cleanMessage = error?.message || "An unexpected error occurred.";
    if (typeof cleanMessage === "string" && cleanMessage.startsWith("{") && cleanMessage.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanMessage);
        if (parsed?.error?.message) {
          cleanMessage = parsed.error.message;
        }
      } catch {
        // use raw message
      }
    }
    if (error?.status === 429 || cleanMessage.includes("quota") || cleanMessage.includes("RESOURCE_EXHAUSTED")) {
      cleanMessage = "Gemini API rate limit or free-tier quota reached. Please wait a few seconds and try again.";
    }

    return res.status(error?.status || 500).json({
      success: false,
      message: cleanMessage,
    });
  }
};

export default {
  previewProjectExtraction,
  previewExternalProjectExtraction,
  commitProject,
};
