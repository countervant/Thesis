import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },
    endTime: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },
    type: {
      type: String,
      default: "Meeting",
      trim: true,
      maxlength: 60,
    },
    calendar: {
      type: String,
      default: "Meetings",
      trim: true,
      maxlength: 100,
    },
    department: {
      type: String,
      default: "All Departments",
      trim: true,
      maxlength: 120,
    },
    participants: {
      type: [String],
      default: [],
      validate: {
        validator: (participants) => participants.length <= 100,
        message: "An event can have at most 100 participants",
      },
    },
    color: {
      type: String,
      default: "",
      trim: true,
      maxlength: 40,
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
