import mongoose from "mongoose";
import { Project, ProjectTask as Task } from "../models/projectModel.js";
import Message from "../models/messageModel.js";
import Client from "../models/Admin/Clientmodel.js";
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

    // Fetch up to 50 recent messages from the conversation.
    // Supports both direct conversation reference and participant user threads.
    const messages = await Message.find({
      $or: [
        { conversation: convId },
        { sender: convId },
        { recipient: convId },
      ],
    })
      .populate("sender", "firstName lastName companyName role email")
      .sort({ createdAt: 1 })
      .limit(60)
      .lean();

    if (!messages || messages.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No chat messages found for this conversation. Start a conversation or exchange requirements first.",
      });
    }

    // Call the LLM extraction service
    const extractedProposal = await extractProjectFromChat(messages);

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
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      resolvedClientId = new mongoose.Types.ObjectId(clientId);
    } else if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      const clientDoc = await Client.findById(conversationId).select("_id").lean();
      if (clientDoc) {
        resolvedClientId = clientDoc._id;
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

    // Parse numeric budget
    const numericBudget =
      typeof budgetCeiling === "number" && !isNaN(budgetCeiling)
        ? Math.max(0, budgetCeiling)
        : Number(budgetCeiling) || 0;

    // Parse down payment
    let downPaymentData = { mode: "none", value: 0, amount: 0 };
    if (downPayment && ["percentage", "fixed"].includes(downPayment.mode)) {
      const val = Number(downPayment.value) || 0;
      const amount =
        downPayment.mode === "percentage"
          ? (numericBudget * (val / 100))
          : val;
      downPaymentData = {
        mode: downPayment.mode,
        value: val,
        amount,
      };
    }

    // 1. Create the Project document in MongoDB
    const newProject = await Project.create({
      name: projectName.trim(),
      description: (clientSummary || "").trim(),
      client: resolvedClientId,
      budget: numericBudget,
      startDate: parsedStartDate,
      deadline: parsedDeadline,
      downPayment: downPaymentData,
      status: "Planning",
      progress: 0,
    });

    // 2. Prepare Task documents matching Task Schema
    // (assignedTo: null, status: 'Backlog', NO estimated hours)
    const validPriorities = ["Low", "Medium", "High", "Urgent"];
    const taskDocs = tasks.map((task) => ({
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

    // 3. Insert tasks into MongoDB
    const createdTasks = await Task.insertMany(taskDocs);

    return res.status(201).json({
      success: true,
      message: "Project and backlog tasks created successfully.",
      data: {
        project: newProject,
        tasks: createdTasks,
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

export default {
  previewProjectExtraction,
  commitProject,
};
