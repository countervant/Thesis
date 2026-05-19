import mongoose from "mongoose";

const leaveRequestCommentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

const leaveRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeRole: {
      type: String,
      default: "",
      trim: true,
    },
    department: {
      type: String,
      default: "Unassigned",
      trim: true,
    },
    leaveType: {
      type: String,
      enum: ["Vacation Leave", "Sick Leave", "Emergency Leave", "Others"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContact: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    comments: [leaveRequestCommentSchema],
  },
  {
    timestamps: true,
  }
);

leaveRequestSchema.index({ status: 1, startDate: -1 });
leaveRequestSchema.index({ department: 1, startDate: -1 });
leaveRequestSchema.index({ employee: 1, createdAt: -1 });

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
