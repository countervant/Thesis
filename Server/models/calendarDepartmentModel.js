import mongoose from "mongoose";

const calendarDepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    color: {
      type: String,
      default: "bg-violet-600",
      trim: true,
      maxlength: 40,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

calendarDepartmentSchema.index({ name: 1 }, { unique: true });

const CalendarDepartment = mongoose.model("CalendarDepartment", calendarDepartmentSchema);

export default CalendarDepartment;
