import express from "express";
import mongoose from "mongoose";
import CalendarDepartment from "../model/calendarDepartmentModel.js";
import CalendarEvent from "../model/calendarEventModel.js";
import Task from "../model/Admin/taskmodel.js";
import { protect } from "../middleware/protectedjwt.js";

const router = express.Router();

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};
const isPastDate = (date) => startOfDay(date) < startOfToday();

const parseDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value;
  }
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const normalizePayload = (body, user) => {
  const date = parseDateOnly(body.date);

  return {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    date,
    startTime: String(body.startTime || body.time || "").trim(),
    endTime: String(body.endTime || "").trim(),
    type: String(body.type || "Meeting").trim(),
    calendar: String(body.calendar || "Meetings").trim(),
    department: String(body.department || "All Departments").trim(),
    participants: Array.isArray(body.participants) ? body.participants.map(String) : [],
    color: String(body.color || "").trim(),
    visibility: user.role === "admin" ? String(body.visibility || "all") : "employee",
  };
};

const eventQueryForUser = (user) => {
  if (user.role === "admin") return {};

  if (user.role === "client") {
    return {
      $or: [
        { visibility: "all" },
        { createdBy: user._id },
      ],
    };
  }

  return {
    $or: [
      { visibility: "all" },
      { visibility: "employee" },
      { createdBy: user._id },
    ],
  };
};

const writableEventQueryForUser = (user) => {
  if (user.role === "admin") return {};

  return { createdBy: user._id };
};

const taskQueryForUser = (user) => {
  if (user.role === "admin") return {};
  if (user.role === "client") {
    return { $or: [{ createdBy: user._id }, { requestedBy: user._id }] };
  }
  return {
    $or: [
      { assignedTo: user._id },
      { assignees: user._id },
      { "subtasks.assignedTo": user._id },
    ],
  };
};

const getTaskAssigneeNames = (task) => {
  const people = [
    task.assignedTo,
    ...(Array.isArray(task.assignees) ? task.assignees : []),
    ...(Array.isArray(task.subtasks) ? task.subtasks.map((subtask) => subtask.assignedTo) : []),
  ].filter(Boolean);

  const seen = new Set();
  return people
    .map((person) => {
      const id = String(person._id || person.id || person.email || "");
      if (!id || seen.has(id)) return "";
      seen.add(id);
      return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "";
    })
    .filter(Boolean);
};

router.get("/departments", protect, async (req, res) => {
  try {
    const departments = await CalendarDepartment.find({})
      .sort({ name: 1 })
      .lean()
      .maxTimeMS(8000);

    res.status(200).json(departments);
  } catch (error) {
    console.error("Get calendar departments error:", error);
    res.status(500).json({ message: "Unable to fetch calendar departments" });
  }
});

router.post("/departments", protect, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const department = await CalendarDepartment.findOneAndUpdate(
      { name },
      {
        $setOnInsert: {
          name,
          color: String(req.body.color || "bg-violet-600").trim(),
          createdBy: req.user._id,
        },
      },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    res.status(201).json(department);
  } catch (error) {
    console.error("Create calendar department error:", error);
    res.status(500).json({ message: "Unable to create calendar department" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const query = { ...eventQueryForUser(req.user) };
    const month = String(req.query.month || "").trim();
    let taskDateQuery = {};

    if (month) {
      const [year, monthIndex] = month.split("-").map(Number);
      if (year && monthIndex) {
        const from = new Date(year, monthIndex - 1, 1);
        const to = new Date(year, monthIndex, 1);
        query.date = { $gte: from, $lt: to };
        taskDateQuery = { dueDate: { $gte: from, $lt: to } };
      }
    }

    if (req.query.calendar) query.calendar = req.query.calendar;
    if (req.query.department && req.query.department !== "All Departments") {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { department: req.query.department },
            { department: "All Departments" },
          ],
        },
      ];
    }

    const includeTaskDeadlines = !req.query.calendar || req.query.calendar === "Deadlines";
    const [events, tasks] = await Promise.all([
      CalendarEvent.find(query)
        .sort({ date: 1, startTime: 1, createdAt: 1 })
        .lean()
        .maxTimeMS(8000),
      includeTaskDeadlines
        ? Task.find({ ...taskQueryForUser(req.user), ...taskDateQuery })
            .select("title description dueDate assignedTo assignees subtasks.assignedTo status")
            .populate("assignedTo", "firstName lastName email")
            .populate("assignees", "firstName lastName email")
            .populate("subtasks.assignedTo", "firstName lastName email")
            .lean()
            .maxTimeMS(8000)
        : [],
    ]);

    const taskDeadlineEvents = tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        _id: `task-${task._id}`,
        title: `Task deadline: ${task.title}`,
        description: task.description || "",
        date: task.dueDate,
        startTime: "All Day",
        endTime: "",
        type: "Deadline",
        calendar: "Deadlines",
        department: "All Departments",
        participants: getTaskAssigneeNames(task),
        color: "blue",
        readOnly: true,
        taskId: String(task._id),
      }));

    res.status(200).json([...events, ...taskDeadlineEvents].sort((first, second) =>
      new Date(first.date) - new Date(second.date) || String(first.startTime).localeCompare(String(second.startTime))
    ));
  } catch (error) {
    console.error("Get calendar events error:", error);
    res.status(500).json({ message: "Unable to fetch calendar events" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const payload = normalizePayload(req.body, req.user);

    if (!payload.title) {
      return res.status(400).json({ message: "Event title is required" });
    }

    if (!payload.date || Number.isNaN(payload.date.getTime())) {
      return res.status(400).json({ message: "Valid event date is required" });
    }

    if (isPastDate(payload.date)) {
      return res.status(400).json({ message: "Past dates cannot be selected" });
    }

    const event = await CalendarEvent.create({
      ...payload,
      date: startOfDay(payload.date),
      createdBy: req.user._id,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Create calendar event error:", error);
    res.status(500).json({ message: "Unable to create calendar event" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const query = { _id: req.params.id, ...writableEventQueryForUser(req.user) };
    const event = await CalendarEvent.findOne(query);

    if (!event) {
      return res.status(404).json({ message: "Calendar event not found" });
    }

    const payload = normalizePayload({ ...event.toObject(), ...req.body }, req.user);

    if (!payload.title) {
      return res.status(400).json({ message: "Event title is required" });
    }

    if (!payload.date || Number.isNaN(payload.date.getTime())) {
      return res.status(400).json({ message: "Valid event date is required" });
    }

    if (isPastDate(payload.date)) {
      return res.status(400).json({ message: "Past dates cannot be selected" });
    }

    Object.assign(event, {
      ...payload,
      date: startOfDay(payload.date),
    });

    await event.save();
    res.status(200).json(event);
  } catch (error) {
    console.error("Update calendar event error:", error);
    res.status(500).json({ message: "Unable to update calendar event" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      ...writableEventQueryForUser(req.user),
    });

    if (!event) {
      return res.status(404).json({ message: "Calendar event not found" });
    }

    res.status(200).json({ message: "Calendar event deleted" });
  } catch (error) {
    console.error("Delete calendar event error:", error);
    res.status(500).json({ message: "Unable to delete calendar event" });
  }
});

export default router;
