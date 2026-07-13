import { useEffect, useMemo, useState } from "react";
import { calendarAPI } from "../../../services/api.js";

const baseDepartments = [
  ["All Departments", "bg-violet-600"],
];

const departmentColors = ["bg-violet-600", "bg-blue-500", "bg-orange-500", "bg-pink-500", "bg-emerald-500", "bg-pink-400"];

const calendarChecks = [
  ["Company Events", "bg-violet-600"],
  ["Meetings", "bg-orange-500"],
  ["Deadlines", "bg-blue-500"],
  ["Leaves", "bg-pink-500"],
  ["Holidays", "bg-emerald-500"],
  ["Birthdays", "bg-violet-500"],
];

const toneStyles = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  violet: "bg-violet-50 text-violet-600",
};

const statCardStyles = {
  blue: "!border-[#754de8]/45 !border-b-[#754de8] !ring-[#754de8]/20 dark:!border-[#754de8] dark:!border-b-[#754de8] dark:!ring-[#754de8]/45",
  green: "!border-[#28b84c]/45 !border-b-[#28b84c] !ring-[#28b84c]/20 dark:!border-[#28b84c] dark:!border-b-[#28b84c] dark:!ring-[#28b84c]/45",
  orange: "!border-[#ff8317]/45 !border-b-[#ff8317] !ring-[#ff8317]/20 dark:!border-[#ff8317] dark:!border-b-[#ff8317] dark:!ring-[#ff8317]/45",
  pink: "!border-[#e347a8]/45 !border-b-[#e347a8] !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
  violet: "!border-[#754de8]/45 !border-b-[#754de8] !ring-[#754de8]/20 dark:!border-[#754de8] dark:!border-b-[#754de8] dark:!ring-[#754de8]/45",
};

const typeStyles = {
  "Company Event": "bg-violet-50 text-violet-700",
  Meeting: "bg-orange-50 text-orange-600",
  Deadline: "bg-violet-50 text-violet-700",
  Leave: "bg-pink-50 text-pink-700",
  Holiday: "bg-emerald-50 text-emerald-700",
  Birthday: "bg-violet-50 text-violet-700",
};

const calendarStyles = {
  "Company Events": "bg-violet-50 text-violet-700",
  Meetings: "bg-orange-50 text-orange-600",
  Deadlines: "bg-blue-50 text-blue-700",
  Leaves: "bg-pink-50 text-pink-700",
  Holidays: "bg-emerald-50 text-emerald-700",
  Birthdays: "bg-violet-50 text-violet-700",
};

const dotStyles = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  violet: "bg-violet-600",
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

const normalizeEvent = (event) => ({
  ...event,
  id: event._id || event.id,
  dateKey: toDateKey(event.date),
  time: event.startTime === "All Day" ? "All Day" : [event.startTime, event.endTime].filter(Boolean).join(" - "),
  dot: dotStyles[event.color || (event.type === "Deadline" ? "blue" : event.type === "Leave" ? "pink" : event.type === "Holiday" ? "emerald" : event.type === "Company Event" ? "emerald" : "orange")],
  typeClass: typeStyles[event.type] || typeStyles.Meeting,
  calendarClass: calendarStyles[event.calendar] || calendarStyles.Meetings,
});

const emptyEventForm = (date) => ({
  id: "",
  title: "",
  date,
  startTime: "09:00 AM",
  endTime: "10:00 AM",
  type: "Meeting",
  calendar: "Meetings",
  department: "All Departments",
  participantsText: "",
  color: "orange",
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

const EventListTable = ({ events, onEdit, onDelete, compact = false }) => (
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
                {(event.participants || []).slice(0, 4).map((participant) => <span key={participant} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-pink-100 text-[10px] font-black text-pink-700">{participant}</span>)}
              </div>
              <span className="text-xs font-black text-slate-500">{event.department}</span>
            </div>
          </td>
          <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${event.calendarClass}`}>{event.calendar}</span></td>
          <td className="px-3 py-3">
            {event.readOnly ? (
              <span className="text-xs font-bold text-slate-400">Managed in Tasks</span>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => onEdit(event)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-blue-600" aria-label={`Edit ${event.title}`}>
                  <Icon name="edit" className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onDelete(event)} className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-pink-600" aria-label={`Delete ${event.title}`}>
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            )}
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
  const [selectedView, setSelectedView] = useState("Company Calendar");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [enabledCalendars, setEnabledCalendars] = useState(() => Object.fromEntries(calendarChecks.map(([item]) => [item, true])));
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState(null);
  const [departmentForm, setDepartmentForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAllEventsPanel, setShowAllEventsPanel] = useState(false);

  const allDepartments = [
    ...baseDepartments,
    ...departments.map((department) => [department.name, department.color || "bg-violet-600"]),
  ];

  const loadEvents = async () => {
    const data = await calendarAPI.getAll({ month: monthKey(currentMonth) });
    setEvents(data.map(normalizeEvent));
  };

  const loadDepartments = async () => {
    const data = await calendarAPI.getDepartments();
    setDepartments(data);
  };

  useEffect(() => {
    let isActive = true;

    calendarAPI
      .getAll({ month: monthKey(currentMonth) })
      .then((data) => {
        if (isActive) {
          setEvents(data.map(normalizeEvent));
        }
      })
      .catch((error) => console.error("Unable to load calendar events", error));

    return () => {
      isActive = false;
    };
  }, [currentMonth]);

  useEffect(() => {
    let isActive = true;

    calendarAPI
      .getDepartments()
      .then((data) => {
        if (isActive) {
          setDepartments(data);
        }
      })
      .catch((error) => console.error("Unable to load calendar departments", error));

    return () => {
      isActive = false;
    };
  }, []);

  const monthEvents = useMemo(() => {
    return events.filter((event) => {
      const departmentMatches = selectedDepartment === "All Departments" || event.department === selectedDepartment || event.department === "All Departments";
      return enabledCalendars[event.calendar] !== false && departmentMatches;
    });
  }, [enabledCalendars, events, selectedDepartment]);

  const sortedMonthEvents = useMemo(() => {
    return [...monthEvents].sort((first, second) => first.dateKey.localeCompare(second.dateKey) || first.startTime.localeCompare(second.startTime));
  }, [monthEvents]);

  const stats = [
    { label: "Total Events", value: monthEvents.length, sublabel: "this month", tone: "violet", icon: "calendar" },
    { label: "Meetings", value: monthEvents.filter((event) => event.type === "Meeting").length, sublabel: "this month", tone: "orange", icon: "cup" },
    { label: "Deadlines", value: monthEvents.filter((event) => event.type === "Deadline").length, sublabel: "this month", tone: "green", icon: "check" },
    { label: "On Leave", value: monthEvents.filter((event) => event.type === "Leave" && event.dateKey === toDateKey(today)).length, sublabel: "today", tone: "pink", icon: "users" },
    { label: "Holidays", value: monthEvents.filter((event) => event.type === "Holiday").length, sublabel: "this month", tone: "blue", icon: "flag" },
  ];

  const analyticsTotal = Math.max(monthEvents.length, 1);
  const analytics = [
    ["Meetings", monthEvents.filter((event) => event.type === "Meeting").length, "bg-orange-500"],
    ["Deadlines", monthEvents.filter((event) => event.type === "Deadline").length, "bg-blue-500"],
    ["Leaves", monthEvents.filter((event) => event.type === "Leave").length, "bg-pink-500"],
    ["Holidays", monthEvents.filter((event) => event.type === "Holiday").length, "bg-emerald-500"],
  ];

  const upcomingEvents = [...monthEvents]
    .filter((event) => event.dateKey >= selectedDate && (showAllUpcoming || event.dateKey <= addDays(selectedDate, 6)))
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey) || first.startTime.localeCompare(second.startTime))
    .slice(0, 5);

  const addEvent = () => {
    setEventForm({
      ...emptyEventForm(selectedDate < todayKey ? todayKey : selectedDate),
      department: selectedDepartment,
    });
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
      department: event.department || "All Departments",
      participantsText: (event.participants || []).join(", "),
      color: event.color || "orange",
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
      department: eventForm.department,
      participants: eventForm.participantsText.split(",").map((item) => item.trim()).filter(Boolean),
      color: eventForm.color,
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

  const addDepartment = () => {
    setDepartmentForm({ name: "", color: "bg-violet-600" });
  };

  const saveDepartment = async (event) => {
    event.preventDefault();
    await calendarAPI.createDepartment(departmentForm);
    setDepartmentForm(null);
    await loadDepartments();
  };

  const resetFilters = () => {
    setSelectedDepartment("All Departments");
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
            <button type="button" onClick={resetFilters} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-[#10142d] shadow-sm"><Icon name="filter" className="h-4 w-4" />Filter</button>
            <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-[#10142d] shadow-sm outline-none">
              {allDepartments.map(([department]) => <option key={department}>{department}</option>)}
            </select>
            <button type="button" onClick={addEvent} className="flex h-9 items-center gap-2 rounded-lg bg-linear-to-b from-[#8b35ff] to-[#d72fc0] px-5 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)]"><Icon name="plus" className="h-4 w-4" />Add Event</button>
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
              <h2 className="mb-4 text-base font-black">Calendar View</h2>
              {["Company Calendar", "Team Calendar", "Employee Calendar", "Project Calendar"].map((item) => (
                <button key={item} type="button" onClick={() => setSelectedView(item)} className={`mb-2 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black ${selectedView === item ? "bg-violet-50 text-violet-700 dark:!bg-[#c72fb2] dark:text-white" : "text-slate-600 hover:bg-violet-50 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"}`}>
                  <Icon name="calendar" className="h-4 w-4" /> {item}
                </button>
              ))}
            </Card>

            <Card className="p-4">
              <h2 className="mb-4 text-base font-black">Teams / Departments</h2>
              {allDepartments.map(([item, color]) => (
                <button key={item} type="button" onClick={() => setSelectedDepartment(item)} className={`mb-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black ${selectedDepartment === item ? "bg-violet-50 text-violet-700 dark:!bg-[#c72fb2] dark:text-white" : "text-slate-600 hover:bg-violet-50 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {item}
                </button>
              ))}
              <button type="button" onClick={addDepartment} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-black text-[#26314f]"><Icon name="plus" className="h-4 w-4" />Add Department</button>
            </Card>

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
                const locked = dateKey < todayKey;
                const dayEvents = monthEvents.filter((event) => event.dateKey === dateKey);

                return (
                  <button key={dateKey} type="button" disabled={locked} onClick={() => setSelectedDate(dateKey)} className={`min-h-28 border-b border-r border-slate-200 p-2.5 text-left transition ${locked ? "cursor-not-allowed bg-slate-50 opacity-60 dark:!bg-neutral-900" : "hover:bg-pink-50/40 dark:hover:!bg-pink-500/15 dark:hover:text-white"} ${selected ? "bg-pink-50/70 dark:!bg-pink-500/20 dark:text-white" : ""}`}>
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
                <button type="button" onClick={() => setShowAllUpcoming((value) => !value)} className="text-xs font-black text-violet-700">{showAllUpcoming ? "This week" : "View all"}</button>
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
              <EventListTable events={sortedMonthEvents} onEdit={editEvent} onDelete={setDeleteTarget} />
            </div>
            <div className="pt-3 text-center">
              <button type="button" onClick={() => setShowAllEventsPanel(true)} className="text-base font-black text-violet-700">View all events</button>
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
                onDelete={(event) => {
                  setShowAllEventsPanel(false);
                  setDeleteTarget(event);
                }}
              />
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
                  onChange={(event) => setEventForm((form) => ({ ...form, type: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                >
                  {["Meeting", "Deadline", "Leave", "Holiday", "Company Event", "Birthday"].map((item) => <option key={item}>{item}</option>)}
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
              <Field label="Department">
                <select
                  value={eventForm.department}
                  onChange={(event) => setEventForm((form) => ({ ...form, department: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                >
                  {allDepartments.map(([item]) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Color">
                <select
                  value={eventForm.color}
                  onChange={(event) => setEventForm((form) => ({ ...form, color: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                >
                  {["orange", "blue", "pink", "emerald", "violet"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Participants / Assignees">
              <input
                value={eventForm.participantsText}
                onChange={(event) => setEventForm((form) => ({ ...form, participantsText: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                placeholder="AB, JT, MD"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEventForm(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-xs font-black text-slate-600">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-linear-to-b from-[#8b35ff] to-[#d72fc0] px-5 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)]">
                Save Event
              </button>
            </div>
          </form>
        </Modal>
      )}

      {departmentForm && (
        <Modal title="Add Department" onClose={() => setDepartmentForm(null)}>
          <form onSubmit={saveDepartment} className="space-y-4">
            <Field label="Department Name">
              <input
                required
                value={departmentForm.name}
                onChange={(event) => setDepartmentForm((form) => ({ ...form, name: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
              />
            </Field>
            <Field label="Dot Color">
              <select
                value={departmentForm.color}
                onChange={(event) => setDepartmentForm((form) => ({ ...form, color: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
              >
                {departmentColors.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDepartmentForm(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-xs font-black text-slate-600">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-linear-to-b from-[#8b35ff] to-[#d72fc0] px-5 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)]">
                Add Department
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
