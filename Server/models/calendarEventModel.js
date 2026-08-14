import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: "",
      trim: true,
    },
    endTime: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      default: "Meeting",
      trim: true,
    },
    calendar: {
      type: String,
      default: "Meetings",
      trim: true,
    },
    department: {
      type: String,
      default: "All Departments",
      trim: true,
    },
    participants: {
      type: [String],
      default: [],
    },
    color: {
      type: String,
      default: "",
      trim: true,
    },
    visibility: {
      type: String,
      enum: ["all", "admin", "employee"],
      default: "all",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

calendarEventSchema.index({ date: 1, calendar: 1 });
calendarEventSchema.index({ createdBy: 1, date: 1 });
calendarEventSchema.index({ visibility: 1, date: 1 });

const CalendarEvent = mongoose.model("CalendarEvent", calendarEventSchema);

export default CalendarEvent;
