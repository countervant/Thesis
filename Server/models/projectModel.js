import mongoose from "mongoose";

/**
 * Project Schema
 * Matches CLIENTRA specifications:
 * name, description, client (ObjectId), budget (Number), deadline (Date),
 * status (enum: 'Planning', 'Active', 'Completed'), progress (Number, default 0)
 */
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Planning", "Active", "Completed"],
      default: "Planning",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ client: 1, createdAt: -1 });
projectSchema.index({ status: 1, deadline: 1 });

/**
 * Task Schema for Project Backlog
 * Matches CLIENTRA specifications:
 * project (ObjectId), title, description, requiredSkills ([String]),
 * priority (enum: 'Low', 'Medium', 'High', 'Urgent'),
 * status (enum: 'Backlog', 'To Do', 'In Progress', 'In Review', 'Completed'),
 * assignedTo (ObjectId, ref: 'User', default: null)
 * (NO estimated hours)
 */
const projectTaskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 250,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Backlog", "To Do", "In Progress", "In Review", "Completed"],
      default: "Backlog",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectTaskSchema.index({ project: 1, status: 1 });
projectTaskSchema.index({ assignedTo: 1 });

export const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);

export const ProjectTask =
  mongoose.models.ProjectTask || mongoose.model("ProjectTask", projectTaskSchema);

export default Project;
