import mongoose from "mongoose";

const calendarDepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    color: {
      type: String,
      default: "bg-violet-600",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

calendarDepartmentSchema.index({ name: 1 });

const CalendarDepartment = mongoose.model("CalendarDepartment", calendarDepartmentSchema);

export default CalendarDepartment;
