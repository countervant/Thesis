import { useEffect, useMemo, useState } from "react";
import { authAPI, calendarAPI, taskAPI } from "../../../services/api.js";

const calendarChecks = [
  ["Company Events", "bg-violet-500"],
  ["Meetings", "bg-orange-500"],
  ["Deadlines", "bg-blue-500"],
  ["Leaves", "bg-rose-500"],
  ["Holidays", "bg-emerald-500"],
  ["Birthdays", "bg-cyan-500"],
  ["Tasks & Projects", "bg-indigo-500"],
];

const toneStyles = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  violet: "bg-pink-50 text-pink-600",
};

const statCardStyles = {
  blue: "!border-[#3b82f6]/45 !border-b-[#3b82f6] !ring-[#3b82f6]/20 dark:!border-[#3b82f6] dark:!border-b-[#3b82f6] dark:!ring-[#3b82f6]/45",
  green: "!border-[#28b84c]/45 !border-b-[#28b84c] !ring-[#28b84c]/20 dark:!border-[#28b84c] dark:!border-b-[#28b84c] dark:!ring-[#28b84c]/45",
  orange: "!border-[#ff8317]/45 !border-b-[#ff8317] !ring-[#ff8317]/20 dark:!border-[#ff8317] dark:!border-b-[#ff8317] dark:!ring-[#ff8317]/45",
  pink: "!border-[#e347a8]/45 !border-b-[#e347a8] !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
  violet: "!border-[#e347a8]/45 !border-b-[#e347a8] !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
};

const typeStyles = {
  "Company Event": "bg-violet-50 text-violet-700",
  Meeting: "bg-orange-50 text-orange-600",
  Deadline: "bg-blue-50 text-blue-700",
  Leave: "bg-rose-50 text-rose-700",
  Holiday: "bg-emerald-50 text-emerald-700",
  Birthday: "bg-cyan-50 text-cyan-700",
  Task: "bg-indigo-50 text-indigo-700",
  Project: "bg-amber-50 text-amber-700",
};

const calendarStyles = {
  "Company Events": "bg-violet-50 text-violet-700",
  Meetings: "bg-orange-50 text-orange-600",
  Deadlines: "bg-blue-50 text-blue-700",
  Leaves: "bg-rose-50 text-rose-700",
  Holidays: "bg-emerald-50 text-emerald-700",
  Birthdays: "bg-cyan-50 text-cyan-700",
  "Tasks & Projects": "bg-indigo-50 text-indigo-700",
};

const dotStyles = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
};

const typeTones = {
  "Company Event": "violet",
  Meeting: "orange",
  Deadline: "blue",
  Leave: "rose",
  Holiday: "emerald",
  Birthday: "cyan",
  Task: "indigo",
  Project: "amber",
};

const calendarTones = {
  "Company Events": "violet",
  Meetings: "orange",
  Deadlines: "blue",
  Leaves: "rose",
  Holidays: "emerald",
  Birthdays: "cyan",
  "Tasks & Projects": "indigo",
};

const typeCalendars = {
  "Company Event": "Company Events",
  Meeting: "Meetings",
  Deadline: "Deadlines",
  Leave: "Leaves",
  Holiday: "Holidays",
  Birthday: "Birthdays",
  Task: "Tasks & Projects",
  Project: "Tasks & Projects",
};

const getMonthOptions = (year) => Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 border-b-2 border-b-[#f7b7e6] bg-white shadow-[0_3px_4px_rgba(190,65,158,0.12),0_8px_24px_rgba(190,65,158,0.04)] ${className}`}>
    {children}
  </section>
);

const Icon = ({ name, className = "h-6 w-6" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.9" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  if (name === "cup") return <svg {...props}><path d="M6 5h10v7a5 5 0 0 1-10 0zM16 7h2a3 3 0 0 1 0 6h-2M8 20h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...props}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "users") return <svg {...props}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" /><circle cx="16" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.7" /><path d="M3.8 19c.6-3.2 2.4-4.9 5.2-4.9s4.6 1.7 5.2 4.9M13.5 18.5c.5-2.1 1.8-3.2 3.7-3.2 2 0 3.2 1.1 3.7 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  if (name === "flag") return <svg {...props}><path d="M6 21V4M7 4h10l-1.5 4L17 12H7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "filter") return <svg {...props}><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "plus") return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "gear") return <svg {...props}><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" stroke="currentColor" strokeWidth="1.7" /><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.9A7 7 0 0 0 7.5 7l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.9h4.6l.4-2.9c.7-.3 1.3-.6 1.9-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1.1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "edit") return <svg {...props}><path d="M5 19h4l9.4-9.4a2.1 2.1 0 0 0-3-3L6 16v3zM13.8 8.2l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "trash") return <svg {...props}><path d="M5 7h14M10 11v5M14 11v5M8 7l1-3h6l1 3M7 7l.8 13h8.4L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthKey = (date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
const sameMonth = (first, second) => first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
const formatMonth = (date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const formatDate = (value) => new Date(value).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
const addDays = (dateKey, days) => {
  const date = new Date(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

const getCalendarDays = (monthDate) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstCell = new Date(firstDay);
  firstCell.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
};

const getEntityId = (entity) => typeof entity === "string" ? entity : entity?._id || entity?.id || "";
const getPersonName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.email || "Employee";

const normalizeEvent = (event) => {
  const tone = calendarTones[event.calendar] || typeTones[event.type] || "orange";
  const visualClass = calendarStyles[event.calendar] || typeStyles[event.type] || typeStyles.Meeting;

  return {
    ...event,
    id: event._id || event.id,
    dateKey: toDateKey(event.date),
    time: event.startTime === "All Day" ? "All Day" : [event.startTime, event.endTime].filter(Boolean).join(" - "),
    dot: dotStyles[tone],
    typeClass: visualClass,
    calendarClass: visualClass,
  };
};

const normalizeTaskEvent = (task) => ({
  id: `task-${task._id || task.id}`,
  sourceId: task._id || task.id,
  source: "task",
  readOnly: true,
  title: task.title || "Untitled task / project",
  date: task.dueDate,
  dateKey: toDateKey(task.dueDate),
  startTime: "All Day",
  endTime: "",
  time: "All Day",
  type: task.subtasks?.length ? "Project" : "Task",
  calendar: "Tasks & Projects",
  participants: (task.assignees?.length ? task.assignees : [task.assignedTo]).filter(Boolean).map(getEntityId),
  dot: dotStyles.indigo,
  typeClass: calendarStyles["Tasks & Projects"],
  calendarClass: calendarStyles["Tasks & Projects"],
});

const emptyEventForm = (date) => ({
  id: "",
  title: "",
  date,
  startTime: "09:00 AM",
  endTime: "10:00 AM",
  type: "Meeting",
  calendar: "Meetings",
  participants: [],
  visibility: "all",
});

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
    <section className="w-full max-w-xl rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-[#10142d]">{title}</h2>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">
          x
        </button>
      </div>
      {children}
    </section>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-black text-[#10142d]">{label}</span>
    {children}
  </label>
);

const EmployeeMultiSelect = ({ employees, selected, onChange }) => {
  const selectedEmployees = employees.filter((employee) => selected.includes(getEntityId(employee)));
  const toggleEmployee = (employeeId) => onChange(
    selected.includes(employeeId)
      ? selected.filter((id) => id !== employeeId)
      : [...selected, employeeId],
  );

  return (
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-pink-300">
        <span className={selectedEmployees.length ? "text-[#10142d]" : "text-slate-400"}>
          {selectedEmployees.length ? `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? "s" : ""} selected` : "Select employees"}
        </span>
        <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
        {employees.length ? employees.map((employee) => {
          const employeeId = getEntityId(employee);
          const name = getPersonName(employee);
          return (
            <label key={employeeId} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold hover:bg-pink-50">
              <input type="checkbox" checked={selected.includes(employeeId)} onChange={() => toggleEmployee(employeeId)} className="h-4 w-4 accent-[#c72fb2]" />
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pink-100 text-[10px] font-black text-pink-700">{initials(name)}</span>
              <span>{name}</span>
            </label>
          );
        }) : <p className="px-3 py-2 text-sm font-bold text-slate-400">No employees available.</p>}
      </div>
      {selectedEmployees.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedEmployees.map((employee) => <span key={getEntityId(employee)} className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-black text-pink-700">{getPersonName(employee)}</span>)}
        </div>
      )}
    </details>
  );
};

const initials = (name) => String(name || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const EventListTable = ({ events, onEdit, onDelete, employeeNames, compact = false }) => (
  <table className={`w-full text-left text-xs ${compact ? "min-w-[960px]" : "min-w-[1180px]"}`}>
    <thead className="sticky top-0 z-10 bg-white text-xs font-black text-slate-500">
      <tr>{["Event", "Type", "Date & Time", "Participants / Assignees", "Calendar", "Actions"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {events.map((event) => (
        <tr key={event.id}>
          <td className="px-3 py-3 font-black"><span className={`mr-4 inline-block h-3 w-3 rounded-full ${event.dot}`} />{event.title}</td>
          <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${event.typeClass}`}>{event.type}</span></td>
          <td className="px-3 py-3 font-bold text-slate-600">{formatDate(event.date)} <span className="ml-8">{event.time}</span></td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {(event.participants || []).slice(0, 4).map((participant) => {
                  const name = employeeNames.get(getEntityId(participant)) || (typeof participant === "string" ? participant : getPersonName(participant));
                  return <span key={getEntityId(participant) || name} title={name} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-pink-100 text-[10px] font-black text-pink-700">{initials(name)}</span>;
                })}
              </div>
              <span className="text-xs font-black text-slate-500">{(event.participants || []).length || "No"} assigned</span>
            </div>
          </td>
          <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${event.calendarClass}`}>{event.calendar}</span></td>
          <td className="px-3 py-3">
            <div className="flex gap-2">
              {event.readOnly ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">Synced</span>
              ) : (
                <>
                  <button type="button" onClick={() => onEdit(event)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-blue-600" aria-label={`Edit ${event.title}`}>
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(event)} className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-pink-600" aria-label={`Delete ${event.title}`}>
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const AdminCalendar = () => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [enabledCalendars, setEnabledCalendars] = useState(() => Object.fromEntries(calendarChecks.map(([item]) => [item, true])));
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [eventForm, setEventForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAllEventsPanel, setShowAllEventsPanel] = useState(false);
  const [showDayEventsPanel, setShowDayEventsPanel] = useState(false);

  const employeeNames = useMemo(() => new Map(employees.map((employee) => [getEntityId(employee), getPersonName(employee)])), [employees]);

  const loadEvents = async () => {
    const monthStart = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const monthEnd = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
    const [calendarEvents, tasks] = await Promise.all([
      calendarAPI.getAll({ month: monthKey(currentMonth) }),
      taskAPI.getAll({ dueFrom: monthStart, dueTo: monthEnd, limit: 200 }),
    ]);
    setEvents([...calendarEvents.map(normalizeEvent), ...tasks.filter((task) => task.dueDate).map(normalizeTaskEvent)]);
  };

  useEffect(() => {
    let isActive = true;

    const monthStart = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const monthEnd = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

    Promise.all([
      calendarAPI.getAll({ month: monthKey(currentMonth) }),
      taskAPI.getAll({ dueFrom: monthStart, dueTo: monthEnd, limit: 200 }),
    ])
      .then(([calendarEvents, tasks]) => {
        if (isActive) {
          setEvents([...calendarEvents.map(normalizeEvent), ...tasks.filter((task) => task.dueDate).map(normalizeTaskEvent)]);
        }
      })
      .catch((error) => console.error("Unable to load calendar events", error));

    return () => {
      isActive = false;
    };
  }, [currentMonth]);

  useEffect(() => {
    let isActive = true;

    authAPI
      .getAssignees()
      .then((data) => {
        if (isActive) {
          setEmployees(data.filter((person) => person?.role === "employee"));
        }
      })
      .catch((error) => console.error("Unable to load calendar employees", error));

    return () => {
      isActive = false;
    };
  }, []);

  const monthEvents = useMemo(() => {
    return events.filter((event) => {
      return enabledCalendars[event.calendar] !== false;
    });
  }, [enabledCalendars, events]);

  const sortedMonthEvents = useMemo(() => {
    return [...monthEvents].sort((first, second) => first.dateKey.localeCompare(second.dateKey) || first.startTime.localeCompare(second.startTime));
  }, [monthEvents]);

  const selectedDayEvents = useMemo(
    () => sortedMonthEvents.filter((event) => event.dateKey === selectedDate),
    [selectedDate, sortedMonthEvents],
  );

  const stats = [
    { label: "Total Events", value: monthEvents.length, sublabel: "this month", tone: "violet", icon: "calendar" },
    { label: "Meetings", value: monthEvents.filter((event) => event.type === "Meeting").length, sublabel: "this month", tone: "orange", icon: "cup" },
    { label: "Deadlines", value: monthEvents.filter((event) => event.type === "Deadline").length, sublabel: "this month", tone: "green", icon: "check" },
    { label: "On Leave", value: monthEvents.filter((event) => event.type === "Leave" && event.dateKey === toDateKey(today)).length, sublabel: "today", tone: "pink", icon: "users" },
    { label: "Tasks & Projects", value: monthEvents.filter((event) => event.type === "Task" || event.type === "Project").length, sublabel: "due this month", tone: "blue", icon: "flag" },
  ];

  const analyticsTotal = Math.max(monthEvents.length, 1);
  const analytics = [
    ["Meetings", monthEvents.filter((event) => event.type === "Meeting").length, "bg-orange-500"],
    ["Deadlines", monthEvents.filter((event) => event.type === "Deadline").length, "bg-blue-500"],
    ["Leaves", monthEvents.filter((event) => event.type === "Leave").length, "bg-pink-500"],
    ["Holidays", monthEvents.filter((event) => event.type === "Holiday").length, "bg-emerald-500"],
    ["Tasks & Projects", monthEvents.filter((event) => event.type === "Task" || event.type === "Project").length, "bg-indigo-500"],
  ];

  const upcomingEvents = [...monthEvents]
    .filter((event) => event.dateKey >= selectedDate && (showAllUpcoming || event.dateKey <= addDays(selectedDate, 6)))
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey) || first.startTime.localeCompare(second.startTime))
    .slice(0, 5);

  const addEvent = () => {
    setEventForm(emptyEventForm(selectedDate < todayKey ? todayKey : selectedDate));
  };

  const editEvent = (event) => {
    setShowAllEventsPanel(false);
    setEventForm({
      id: event.id,
      title: event.title,
      date: event.dateKey,
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      type: event.type || "Meeting",
      calendar: event.calendar || "Meetings",
      participants: (event.participants || []).map(getEntityId).filter(Boolean),
      visibility: event.visibility || "all",
    });
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    const payload = {
      title: eventForm.title,
      date: eventForm.date,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      type: eventForm.type,
      calendar: eventForm.calendar,
      participants: eventForm.participants,
      visibility: eventForm.visibility,
    };

    if (eventForm.id) {
      await calendarAPI.update(eventForm.id, payload);
    } else {
      await calendarAPI.create(payload);
    }

    setEventForm(null);
    await loadEvents();
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTarget) return;
    await calendarAPI.delete(deleteTarget.id);
    setDeleteTarget(null);
    setShowAllEventsPanel(false);
    await loadEvents();
  };

  const resetFilters = () => {
    setEnabledCalendars(Object.fromEntries(calendarChecks.map(([item]) => [item, true])));
  };

  const setAllCalendars = (checked) => {
    setEnabledCalendars(Object.fromEntries(calendarChecks.map(([item]) => [item, checked])));
  };

  const goToMonth = (offset) => setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));

  const goToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
  };

  return (
    <div className="-mx-4 -mb-8 -mt-4 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-4 text-[#111936] md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <section className="mx-auto max-w-[1840px] rounded-2xl border border-pink-100 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(190,65,158,0.08)]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl uppercase leading-none text-neutral-950 dark:text-white" style={{ fontFamily: "var(--font-bruno)" }}>
              Calendar
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Manage company schedules, events, meetings, and deadlines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={goToday} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-[#10142d] shadow-sm">Today</button>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => goToMonth(-1)} className="grid h-9 w-10 place-items-center text-slate-700" aria-label="Previous month"><Icon className="h-4 w-4 rotate-180" /></button>
              <button type="button" onClick={() => goToMonth(1)} className="grid h-9 w-10 place-items-center border-l border-slate-200 text-slate-700" aria-label="Next month"><Icon className="h-4 w-4" /></button>
            </div>
            <select value={currentMonth.getMonth()} onChange={(event) => setCurrentMonth(new Date(currentMonth.getFullYear(), Number(event.target.value), 1))} className="h-9 rounded-xl border border-transparent bg-white px-3 text-sm font-black text-[#26314f] outline-none">
              {getMonthOptions(currentMonth.getFullYear()).map((month) => <option key={month.getMonth()} value={month.getMonth()}>{formatMonth(month)}</option>)}
            </select>
            <button type="button" onClick={resetFilters} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-[#10142d] shadow-sm"><Icon name="filter" className="h-4 w-4" />Reset filters</button>
            <button type="button" onClick={addEvent} className="flex h-9 items-center gap-2 rounded-lg bg-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)]"><Icon name="plus" className="h-4 w-4" />Add Event</button>
          </div>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => (
            <Card key={item.label} className={`min-h-28 px-5 py-4 !shadow-sm dark:!shadow-none ring-1 ${statCardStyles[item.tone]}`}>
              <div className="flex items-center gap-4">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl ${toneStyles[item.tone]}`}>
                  <Icon name={item.icon} className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-2xl font-black leading-none text-[#10142d]">{item.value}</p>
                  <p className="mt-1 text-xs font-black leading-tight text-[#10142d]">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.sublabel}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(680px,1fr)_370px]">
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="mb-4 text-base font-black">Calendars</h2>
              {calendarChecks.map(([item, color]) => (
                <label key={item} className="mb-3 flex items-center gap-3 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={enabledCalendars[item]}
                    onChange={(event) => setEnabledCalendars((current) => ({ ...current, [item]: event.target.checked }))}
                    className="peer sr-only"
                  />
                  <span className={`grid h-4 w-4 place-items-center rounded ${enabledCalendars[item] ? color : "border border-slate-300 bg-white"}`}>
                    {enabledCalendars[item] && (
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-white" aria-hidden="true">
                        <path d="m4 8 2.5 2.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {item}
                </label>
              ))}
              <button type="button" onClick={() => setAllCalendars(!Object.values(enabledCalendars).every(Boolean))} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-black text-[#26314f]"> Select All</button>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 text-center text-base font-black text-[#10142d]">
              {weekDays.map((day) => <span key={day} className="py-3">{day}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {getCalendarDays(currentMonth).map((date) => {
                const dateKey = toDateKey(date);
                const muted = !sameMonth(date, currentMonth);
                const selected = selectedDate === dateKey;
                const dayEvents = monthEvents.filter((event) => event.dateKey === dateKey);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dateKey);
                      setShowDayEventsPanel(true);
                    }}
                    className={`min-h-28 border-b border-r border-slate-200 p-2.5 text-left transition hover:bg-pink-50/40 dark:hover:!bg-pink-500/15 dark:hover:text-white ${dateKey < todayKey ? "bg-slate-50/70 dark:!bg-neutral-900" : ""} ${selected ? "bg-pink-50/70 dark:!bg-pink-500/20 dark:text-white" : ""}`}
                    aria-label={`View events for ${formatDate(dateKey)}`}
                  >
                    <div className={`mb-2 text-sm font-black ${muted ? "text-slate-400" : "text-[#10142d]"}`}>{date.getDate()}</div>
                    <div className="space-y-1.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className={`relative truncate rounded-lg px-2.5 py-1.5 text-xs font-black ${event.calendarClass}`}>
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
                          {event.title}
                          {event.time && <span className="block pl-3 font-bold opacity-80">{event.time}</span>}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <p className="pl-2 text-xs font-black text-slate-500">+ {dayEvents.length - 2} more</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black">Upcoming Events</h2>
                <button type="button" onClick={() => setShowAllUpcoming((value) => !value)} className="text-xs font-black text-pink-700">{showAllUpcoming ? "This week" : "View all"}</button>
              </div>
              {upcomingEvents.map((event) => (
                <div key={event.id} className="grid grid-cols-[14px_1fr_auto] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
                  <span className={`h-3 w-3 rounded-full ${event.dot}`} />
                  <span>
                    <span className="block text-sm font-black">{event.title}</span>
                    <span className="text-xs font-bold text-slate-500">{formatDate(event.date)} • {event.time}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${event.typeClass}`}>{event.type}</span>
                </div>
              ))}
            </Card>

            <Card className="p-4">
              <h2 className="mb-4 text-base font-black">Calendar Analytics</h2>
              <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
                <div className="grid h-32 w-32 place-items-center rounded-full" style={{ background: "conic-gradient(#f97316 0 39%, #3b82f6 39% 61%, #ec4899 61% 82%, #22c55e 82% 100%)" }}>
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-sm">
                    <span className="text-3xl font-black leading-none">{monthEvents.length}<span className="mt-1 block text-xs text-slate-500">Total Events</span></span>
                  </div>
                </div>
                <div className="min-w-0 space-y-4 text-sm font-bold">
                  {analytics.map(([label, value, color]) => (
                    <p key={label} className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
                        <span>{label}</span>
                      </span>
                      <span className="whitespace-nowrap text-right text-xs tabular-nums">{value} ({Math.round((value / analyticsTotal) * 100)}%)</span>
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="px-5 pt-4">
            <h2 className="text-base font-black">Event List <span className="text-xs font-bold text-slate-500">({formatMonth(currentMonth)})</span></h2>
          </div>
          <div className="px-5 pb-4">
            <div className="max-h-[326px] overflow-auto">
            <EventListTable events={sortedMonthEvents} onEdit={editEvent} onDelete={setDeleteTarget} employeeNames={employeeNames} />
            </div>
            <div className="pt-3 text-center">
              <button type="button" onClick={() => setShowAllEventsPanel(true)} className="text-base font-black text-pink-700">View all events</button>
            </div>
          </div>
        </Card>
      </section>

      {showAllEventsPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <section className="flex max-h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-[#10142d]">All Events</h2>
                <p className="text-xs font-bold text-slate-500">{formatMonth(currentMonth)} - {sortedMonthEvents.length} events</p>
              </div>
              <button type="button" onClick={() => setShowAllEventsPanel(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">
                x
              </button>
            </div>
            <div className="overflow-auto p-5">
              <EventListTable
                compact
                events={sortedMonthEvents}
                onEdit={editEvent}
                employeeNames={employeeNames}
                onDelete={(event) => {
                  setShowAllEventsPanel(false);
                  setDeleteTarget(event);
                }}
              />
            </div>
          </section>
        </div>
      )}

      {showDayEventsPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <section className="flex max-h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-[#10142d]">Events for {formatDate(selectedDate)}</h2>
                <p className="text-xs font-bold text-slate-500">{selectedDayEvents.length} {selectedDayEvents.length === 1 ? "event" : "events"}</p>
              </div>
              <button type="button" onClick={() => setShowDayEventsPanel(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-sm font-black text-slate-500" aria-label="Close daily events">
                x
              </button>
            </div>
            <div className="overflow-auto p-5">
              {selectedDayEvents.length ? (
                <EventListTable
                  compact
                  events={selectedDayEvents}
                  onEdit={(event) => {
                    setShowDayEventsPanel(false);
                    editEvent(event);
                  }}
                  onDelete={(event) => {
                    setShowDayEventsPanel(false);
                    setDeleteTarget(event);
                  }}
                  employeeNames={employeeNames}
                />
              ) : (
                <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <div>
                    <p className="text-base font-black text-[#10142d]">No events on this day</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">There are no schedules for the selected date.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {eventForm && (
        <Modal title={eventForm.id ? "Edit Event" : "Add Event"} onClose={() => setEventForm(null)}>
          <form onSubmit={saveEvent} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title">
                <input
                  required
                  value={eventForm.title}
                  onChange={(event) => setEventForm((form) => ({ ...form, title: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                />
              </Field>
              <Field label="Date">
                <input
                  required
                  type="date"
                  min={todayKey}
                  value={eventForm.date}
                  onChange={(event) => setEventForm((form) => ({ ...form, date: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                />
              </Field>
              <Field label="Start Time">
                <input
                  value={eventForm.startTime}
                  onChange={(event) => setEventForm((form) => ({ ...form, startTime: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                  placeholder="09:00 AM"
                />
              </Field>
              <Field label="End Time">
                <input
                  value={eventForm.endTime}
                  onChange={(event) => setEventForm((form) => ({ ...form, endTime: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                  placeholder="10:00 AM"
                />
              </Field>
              <Field label="Type">
                <select
                  value={eventForm.type}
                  onChange={(event) => setEventForm((form) => ({ ...form, type: event.target.value, calendar: typeCalendars[event.target.value] }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                >
                  {["Meeting", "Deadline", "Leave", "Holiday", "Company Event", "Birthday", "Task", "Project"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Calendar">
                <select
                  value={eventForm.calendar}
                  onChange={(event) => setEventForm((form) => ({ ...form, calendar: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                >
                  {calendarChecks.map(([item]) => <option key={item}>{item}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Participants / Assignees">
              <EmployeeMultiSelect employees={employees} selected={eventForm.participants} onChange={(participants) => setEventForm((form) => ({ ...form, participants }))} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEventForm(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-xs font-black text-slate-600">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)]">
                Save Event
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Do you want to delete?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm font-semibold leading-6 text-slate-500">
            This will permanently delete "{deleteTarget.title}" from the calendar.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteTarget(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-xs font-black text-slate-600">
              Cancel
            </button>
            <button type="button" onClick={confirmDeleteEvent} className="h-10 rounded-lg bg-pink-600 px-5 text-xs font-black text-white shadow-[0_9px_18px_rgba(219,39,119,0.25)]">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminCalendar;
