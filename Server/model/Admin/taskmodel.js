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

    amount: {
      type: Number,
      min: 0,
      default: 0,
    },

    paid: {
      type: Number,
      min: 0,
      default: 0,
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

        completedAt: {
          type: Date,
        },

        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    activities: [
      {
        type: {
          type: String,
          enum: ["task_created", "subtask_completed", "subtask_reopened", "revision_requested", "revision_started", "output_submitted", "client_approved", "feedback_submitted", "feedback_replied", "project_archived", "project_restored"],
          required: true,
        },

        title: {
          type: String,
          required: true,
          trim: true,
        },

        details: {
          type: String,
          default: "",
          trim: true,
        },

        subtaskId: String,
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        actorName: {
          type: String,
          default: "",
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
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

    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    requestedByName: {
      type: String,
      default: "",
      trim: true,
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

    revisionRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        title: {
          type: String,
          required: true,
          trim: true,
        },

        section: {
          type: String,
          default: "",
          trim: true,
        },

        priority: {
          type: String,
          enum: ["low", "medium", "high", "urgent"],
          default: "medium",
        },

        description: {
          type: String,
          required: true,
          trim: true,
        },

        preferredCompletionDate: {
          type: Date,
        },

        startedAt: Date,

        startedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
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

    finalOutput: {
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      message: {
        type: String,
        default: "",
      },
      outputMethod: {
        type: String,
        enum: ["file", "link"],
      },
      fileName: String,
      fileUrl: String,
      previewFileName: String,
      originalStoredName: String,
      mimeType: String,
      watermarked: {
        type: Boolean,
        default: false,
      },
      link: String,
      submittedAt: Date,
    },

    feedback: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      overallRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      quality: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      overallSatisfaction: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },
      wouldRecommend: Boolean,
      submittedAt: Date,
      reply: {
        message: {
          type: String,
          default: "",
          trim: true,
          maxlength: 1000,
        },
        repliedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        repliedAt: Date,
      },
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: Date,
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    tags: [String],
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ assignedTo: 1, createdAt: -1 });
taskSchema.index({ assignees: 1, createdAt: -1 });
taskSchema.index({ "subtasks.assignedTo": 1, createdAt: -1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ requestedBy: 1, createdAt: -1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ priority: 1, dueDate: 1 });
taskSchema.index({ createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;
