import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "review", "done"],
      default: "in_progress",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },

        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],

    completedAt: {
      type: Date,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        comment: {
          type: String,
          required: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    attachments: [
      {
        fileName: String,
        fileUrl: String,
      },
    ],

    tags: [String],
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ assignedTo: 1, createdAt: -1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ priority: 1, dueDate: 1 });
taskSchema.index({ createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;
