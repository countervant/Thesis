import { useEffect, useMemo, useState } from "react";
import { calendarAPI, taskAPI } from "../../../services/api.js";

const calendars = [
  ["My Schedule", "accent-pink-600"],
  ["Tasks & Deadlines", "accent-orange-500"],
  ["Meetings", "accent-blue-500"],
  ["Personal", "accent-emerald-500"],
  ["Company Holidays", "accent-pink-500"],
];

const toneStyles = {
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  red: "bg-red-50 text-red-600",
  violet: "bg-pink-50 text-pink-600",
};

const statCardStyles = {
  green: "!border-[#28b84c]/45 border-b-2 !border-b-[#28b84c] ring-1 !ring-[#28b84c]/20 dark:!border-[#28b84c] dark:!border-b-[#28b84c] dark:!ring-[#28b84c]/45",
  orange: "!border-[#ff8317]/45 border-b-2 !border-b-[#ff8317] ring-1 !ring-[#ff8317]/20 dark:!border-[#ff8317] dark:!border-b-[#ff8317] dark:!ring-[#ff8317]/45",
  pink: "!border-[#e347a8]/45 border-b-2 !border-b-[#e347a8] ring-1 !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
  red: "!border-[#dc2626]/45 border-b-2 !border-b-[#dc2626] ring-1 !ring-[#dc2626]/20 dark:!border-[#dc2626] dark:!border-b-[#dc2626] dark:!ring-[#dc2626]/45",
  violet: "!border-[#e347a8]/45 border-b-2 !border-b-[#e347a8] ring-1 !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
};

const typeStyles = {
  "Company Event": "bg-violet-50 text-violet-700",
  Meeting: "bg-blue-50 text-blue-700",
  Deadline: "bg-rose-50 text-rose-700",
  Holiday: "bg-emerald-50 text-emerald-700",
  Personal: "bg-teal-50 text-teal-700",
  Task: "bg-orange-50 text-orange-700",
  Review: "bg-indigo-50 text-indigo-700",
  Project: "bg-amber-50 text-amber-700",
};

const eventStyles = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-700",
  pink: "bg-pink-50 text-pink-700",
  violet: "bg-violet-50 text-violet-700",
  rose: "bg-rose-50 text-rose-700",
  teal: "bg-teal-50 text-teal-700",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-700",
};

const dotStyles = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
};

const typeTones = {
  "Company Event": "violet",
  Meeting: "blue",
  Deadline: "rose",
  Holiday: "emerald",
  Personal: "teal",
  Task: "orange",
  Review: "indigo",
  Project: "amber",
};

const getMonthOptions = (year) => Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)] ${className}`}>
    {children}
  </section>
);

const Icon = ({ name, className = "h-6 w-6" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.9" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  if (name === "clock") return <svg {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...props}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "bell") return <svg {...props}><path d="M7 10a5 5 0 0 1 10 0v3.5l2 3H5l2-3V10zM10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "more") return <svg {...props}><circle cx="12" cy="5" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="19" r="1.6" fill="currentColor" /></svg>;
  if (name === "people") return <svg {...props}><circle cx="9" cy="8.5" r="2.4" stroke="currentColor" strokeWidth="1.7" /><circle cx="15.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.7" /><path d="M4.5 18c.5-2.5 2-3.8 4.5-3.8 2.4 0 3.9 1.3 4.4 3.8M13.5 17.7c.5-1.8 1.6-2.7 3.3-2.7 1.6 0 2.7.9 3.2 2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  if (name === "briefcase") return <svg {...props}><path d="M9 7V5h6v2M5 8h14v11H5zM5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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
const formatShortDate = (value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
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

const getTone = (event) => typeTones[event.type] || "violet";

const normalizeEvent = (event) => {
  const tone = getTone(event);
  return {
    ...event,
    id: event._id || event.id,
    dateKey: toDateKey(event.date),
    time: event.startTime === "All Day" ? "All Day" : [event.startTime, event.endTime].filter(Boolean).join(" - "),
    color: eventStyles[tone] || eventStyles.violet,
    dot: dotStyles[tone] || dotStyles.violet,
    tagClass: typeStyles[event.type] || typeStyles.Meeting,
  };
};

const getEntityId = (entity) => typeof entity === "string" ? entity : entity?._id || entity?.id || "";

const normalizeTaskEvent = (task) => {
  const isProject = Boolean(task.subtasks?.length);
  const tone = isProject ? "amber" : "orange";
  return {
    id: `task-${task._id || task.id}`,
    source: "task",
    readOnly: true,
    title: task.title || "Untitled task / project",
    date: task.dueDate,
    dateKey: toDateKey(task.dueDate),
    startTime: "All Day",
    endTime: "",
    time: "All Day",
    type: isProject ? "Project" : "Task",
    calendar: "Tasks & Deadlines",
    participants: (task.assignees?.length ? task.assignees : [task.assignedTo]).filter(Boolean).map(getEntityId),
    color: eventStyles[tone],
    dot: dotStyles[tone],
    tagClass: typeStyles[isProject ? "Project" : "Task"],
  };
};

const loadCalendarSources = async (currentMonth) => {
  const monthStart = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const monthEnd = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
  const [calendarResult, taskResult] = await Promise.allSettled([
    calendarAPI.getAll({ month: monthKey(currentMonth) }),
    taskAPI.getAll({ dueFrom: monthStart, dueTo: monthEnd, limit: 200 }),
  ]);
  const calendarEvents = calendarResult.status === "fulfilled" ? calendarResult.value : [];
  const tasks = taskResult.status === "fulfilled" ? taskResult.value : [];

  if (calendarResult.status === "rejected") console.error("Unable to load employee calendar events", calendarResult.reason);
  if (taskResult.status === "rejected") console.error("Unable to load employee calendar tasks", taskResult.reason);

  return [
    ...calendarEvents.map(normalizeEvent),
    ...tasks.filter((task) => task.dueDate).map(normalizeTaskEvent),
  ];
};

const emptyPersonalForm = (date) => ({
  id: "",
  title: "",
  date,
  startTime: "09:00 AM",
  endTime: "10:00 AM",
  participantsText: "ME",
});

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
    <section className="w-full max-w-lg rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
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

const eventMatchesCalendar = (event, calendarName) => {
  if (calendarName === "My Schedule") return true;
  if (calendarName === "Tasks & Deadlines") return event.calendar === "Deadlines" || event.type === "Deadline" || event.type === "Task" || event.type === "Project";
  if (calendarName === "Company Holidays") return event.calendar === "Holidays" || event.type === "Holiday";
  return event.calendar === calendarName || event.type === calendarName;
};

const EmpCalendar = () => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [activeView, setActiveView] = useState("Month");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [visibleCalendars, setVisibleCalendars] = useState(() => Object.fromEntries(calendars.map(([item]) => [item, true])));
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState(null);
  const [showDayEventsPanel, setShowDayEventsPanel] = useState(false);

  const loadEvents = async () => {
    setEvents(await loadCalendarSources(currentMonth));
  };

  useEffect(() => {
    let isActive = true;

    loadCalendarSources(currentMonth)
      .then((calendarEvents) => {
        if (isActive) {
          setEvents(calendarEvents);
        }
      })
      .catch((error) => console.error("Unable to load employee calendar events", error));

    return () => {
      isActive = false;
    };
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) =>
      calendars.some(([calendarName]) => visibleCalendars[calendarName] && eventMatchesCalendar(event, calendarName)),
    );
  }, [events, visibleCalendars]);

  const selectedEvents = filteredEvents.filter((event) => event.dateKey === selectedDate);
  const sortedUpcoming = [...filteredEvents]
    .filter((event) => event.dateKey >= selectedDate && (showAllUpcoming || event.dateKey <= addDays(selectedDate, 6)))
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey) || first.startTime.localeCompare(second.startTime));

  const stats = [
    { label: "Total Events", value: filteredEvents.length, sublabel: "this month", tone: "violet", icon: "calendar" },
    { label: "Upcoming", value: sortedUpcoming.length, sublabel: "this week", tone: "orange", icon: "clock" },
    { label: "Completed", value: filteredEvents.filter((event) => event.dateKey < toDateKey(today)).length, sublabel: "this week", tone: "green", icon: "check" },
    { label: "Overdue", value: filteredEvents.filter((event) => event.type === "Deadline" && event.dateKey < toDateKey(today)).length, sublabel: "event", tone: "red", icon: "bell" },
  ];

  const addPersonalEvent = () => {
    setEventForm(emptyPersonalForm(selectedDate < todayKey ? todayKey : selectedDate));
  };

  const updateEvent = (event) => {
    setEventForm({
      id: event.id,
      title: event.title,
      date: event.dateKey,
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      participantsText: (event.participants || []).join(", "),
    });
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    const payload = {
      title: eventForm.title,
      date: eventForm.date,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      type: "Personal",
      calendar: "Personal",
      department: "All Departments",
      participants: eventForm.participantsText.split(",").map((item) => item.trim()).filter(Boolean),
      color: "emerald",
    };

    if (eventForm.id) {
      await calendarAPI.update(eventForm.id, payload);
    } else {
      await calendarAPI.create(payload);
    }

    setEventForm(null);
    await loadEvents();
  };

  const goToMonth = (offset) => setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));

  const goToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
  };

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1840px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl uppercase leading-none text-neutral-950 dark:text-white" style={{ fontFamily: "var(--font-bruno)" }}>
              Calendar
            </h1>
            <p className="mt-2 text-base font-semibold text-slate-500">
              Manage your schedule, events, and important deadlines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={goToday} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#10142d] shadow-sm">Today</button>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => goToMonth(-1)} className="grid h-11 w-12 place-items-center text-slate-700" aria-label="Previous month"><Icon className="h-4 w-4 rotate-180" /></button>
              <button type="button" onClick={() => goToMonth(1)} className="grid h-11 w-12 place-items-center border-l border-slate-200 text-slate-700" aria-label="Next month"><Icon className="h-4 w-4" /></button>
            </div>
            <select value={currentMonth.getMonth()} onChange={(event) => setCurrentMonth(new Date(currentMonth.getFullYear(), Number(event.target.value), 1))} className="h-11 rounded-xl border border-transparent bg-white px-3 text-base font-black text-[#26314f] outline-none">
              {getMonthOptions(currentMonth.getFullYear()).map((month) => <option key={month.getMonth()} value={month.getMonth()}>{formatMonth(month)}</option>)}
            </select>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {["Month", "Week", "Day"].map((item) => (
                <button key={item} type="button" onClick={() => setActiveView(item)} className={`h-9 min-w-20 rounded-lg px-4 text-sm font-black ${activeView === item ? "border border-pink-200 bg-pink-50 text-pink-600 dark:!bg-[#c72fb2] dark:text-white" : "text-[#10142d] dark:text-white dark:hover:!bg-pink-500/15"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label} className={`min-h-32 px-6 py-5 !shadow-sm dark:!shadow-none ${statCardStyles[item.tone]}`}>
              <div className="flex items-center gap-6">
                <span className={`grid h-17 w-17 place-items-center rounded-2xl ${toneStyles[item.tone]}`}>
                  <Icon name={item.icon} className="h-9 w-9" />
                </span>
                <div>
                  <p className="text-4xl font-black leading-none text-[#10142d]">{item.value}</p>
                  <p className="mt-2 text-sm font-black leading-tight text-[#10142d]">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.sublabel}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[310px_minmax(760px,1fr)]">
          <div className="space-y-5">
            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black">Upcoming Events</h2>
                <button type="button" onClick={() => setShowAllUpcoming((value) => !value)} className="text-sm font-black text-pink-600">{showAllUpcoming ? "This week" : "View all"}</button>
              </div>
              <div className="space-y-1">
                {sortedUpcoming.slice(0, 5).map((event) => (
                  <button key={event.id} type="button" onClick={() => setSelectedDate(event.dateKey)} className="grid w-full grid-cols-[14px_1fr_auto] items-start gap-3 border-b border-slate-100 py-4 text-left last:border-b-0">
                    <span className={`mt-1.5 h-3 w-3 rounded-full ${event.dot}`} />
                    <span>
                      <span className="block text-sm font-black">{event.title}</span>
                      <span className="text-xs font-bold text-slate-500">{event.time}</span>
                    </span>
                    <span className="text-right text-xs font-bold text-slate-500">{event.dateKey === toDateKey(today) ? "Today" : formatShortDate(event.date)}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black">My Calendars</h2>
                <button type="button" onClick={addPersonalEvent} className="grid h-7 w-7 place-items-center rounded-lg text-lg font-black text-slate-500">+</button>
              </div>
              {calendars.map(([item, accent]) => (
                <label key={item} className="mb-3 flex items-center gap-3 text-sm font-bold text-slate-600">
                  <input type="checkbox" checked={visibleCalendars[item]} onChange={(event) => setVisibleCalendars((current) => ({ ...current, [item]: event.target.checked }))} className={`h-4 w-4 rounded ${accent}`} />
                  {item}
                </label>
              ))}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 text-center text-base font-black text-[#10142d]">
              {weekDays.map((day) => <span key={day} className="py-5">{day}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {getCalendarDays(currentMonth).map((date) => {
                const dateKey = toDateKey(date);
                const muted = !sameMonth(date, currentMonth);
                const selected = selectedDate === dateKey;
                const dayEvents = filteredEvents.filter((event) => event.dateKey === dateKey);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dateKey);
                      setShowDayEventsPanel(true);
                    }}
                    className={`min-h-32 border-b border-r border-slate-200 p-3 text-left transition hover:bg-pink-50/40 dark:hover:!bg-pink-500/15 dark:hover:text-white ${dateKey < todayKey ? "bg-slate-50/70 dark:!bg-neutral-900" : ""} ${selected ? "bg-pink-50/70 dark:!bg-pink-500/20 dark:text-white" : ""}`}
                    aria-label={`View events for ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                  >
                    <div className={`mb-3 text-base font-black ${muted ? "text-slate-400" : "text-[#10142d]"}`}>{date.getDate()}</div>
                    <div className="space-y-1.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className={`relative truncate rounded-lg px-2.5 py-1.5 text-xs font-black ${event.color}`}>
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
        </div>

        <Card className="overflow-hidden p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">{activeView === "Month" ? "Today's Schedule" : `${activeView} Schedule`}</h2>
            <button type="button" onClick={goToday} className="text-sm font-black text-pink-600">View full day</button>
          </div>
          <div className="divide-y divide-slate-100">
            {(selectedEvents.length ? selectedEvents : sortedUpcoming.slice(0, 3)).map((row) => (
              <div key={row.id} className="grid grid-cols-[18px_170px_minmax(220px,1fr)_minmax(240px,1fr)_90px_36px] items-center gap-3 py-4 text-sm">
                <span className={`h-3 w-3 rounded-full ${row.dot}`} />
                <span className="font-bold text-slate-500">{row.time || "All Day"}</span>
                <span className="font-black text-[#10142d]">{row.title}</span>
                <span className="flex items-center gap-2 font-semibold text-slate-500">
                  <Icon name={row.type === "Meeting" ? "people" : "briefcase"} className="h-4 w-4" />
                  {(row.participants || []).join(", ") || row.department || "My schedule"}
                </span>
                <span className={`rounded-full px-3 py-1 text-center text-xs font-black ${row.tagClass}`}>{row.type}</span>
                {row.readOnly ? <span className="text-[10px] font-black text-slate-400">SYNCED</span> : (
                  <button type="button" onClick={() => updateEvent(row)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500" aria-label={`${row.title} options`}>
                    <Icon name="more" className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showDayEventsPanel && (
        <Modal title={`Events for ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`} onClose={() => setShowDayEventsPanel(false)}>
          <p className="mb-4 text-xs font-bold text-slate-500">{selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}</p>
          {selectedEvents.length ? (
            <div className="max-h-[60vh] space-y-3 overflow-auto">
              {selectedEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${event.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#10142d]">{event.title}</p>
                    <p className="text-xs font-bold text-slate-500">{event.time || "All Day"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${event.tagClass}`}>{event.type}</span>
                  {!event.readOnly && (
                    <button type="button" onClick={() => {
                      setShowDayEventsPanel(false);
                      updateEvent(event);
                    }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-pink-600">Edit</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div>
                <p className="text-sm font-black text-[#10142d]">No events on this day</p>
                <p className="mt-1 text-xs font-bold text-slate-500">There are no schedules for the selected date.</p>
              </div>
            </div>
          )}
        </Modal>
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
            </div>
            <Field label="Participants">
              <input
                value={eventForm.participantsText}
                onChange={(event) => setEventForm((form) => ({ ...form, participantsText: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-pink-300"
                placeholder="ME"
              />
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
    </div>
  );
};

export default EmpCalendar;
