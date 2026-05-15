const stats = [
  { label: "Total Events", value: "38", sublabel: "this month", tone: "violet", icon: "calendar" },
  { label: "Meetings", value: "15", sublabel: "this month", tone: "orange", icon: "cup" },
  { label: "Deadlines", value: "23", sublabel: "this month", tone: "green", icon: "check" },
  { label: "On Leave", value: "12", sublabel: "today", tone: "pink", icon: "users" },
  { label: "Holidays", value: "5", sublabel: "this month", tone: "blue", icon: "flag" },
];

const calendarEvents = [
  { day: 1, label: "Labor Day", time: "", color: "bg-emerald-50 text-emerald-700" },
  { day: 4, label: "Team Meeting", time: "10:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 5, label: "Project Deadline", time: "11:59 PM", color: "bg-blue-50 text-blue-700" },
  { day: 6, label: "Client Call", time: "11:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 7, label: "Marketing Sync", time: "02:00 PM", color: "bg-violet-50 text-violet-700" },
  { day: 9, label: "Stand-up", time: "10:00 AM", color: "bg-pink-50 text-pink-700", badge: "9", more: 2 },
  { day: 11, label: "Client Review", time: "01:00 PM", color: "bg-orange-50 text-orange-700" },
  { day: 12, label: "UI/UX Review", time: "03:00 PM", color: "bg-blue-50 text-blue-700" },
  { day: 12, label: "Leave (3)", time: "All Day", color: "bg-pink-50 text-pink-700" },
  { day: 14, label: "Team Meeting", time: "10:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 15, label: "Monthly Report", time: "05:00 PM", color: "bg-blue-50 text-blue-700" },
  { day: 18, label: "Leave (3)", time: "All Day", color: "bg-pink-50 text-pink-700" },
  { day: 19, label: "Client Call", time: "11:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 20, label: "Website Deadline", time: "11:59 PM", color: "bg-blue-50 text-blue-700" },
  { day: 21, label: "Sprint Planning", time: "10:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 22, label: "Stand-up", time: "10:00 AM", color: "bg-pink-50 text-pink-700", more: 1 },
  { day: 25, label: "Team Building", time: "All Day", color: "bg-emerald-50 text-emerald-700" },
  { day: 26, label: "Client Meeting", time: "02:00 PM", color: "bg-orange-50 text-orange-700" },
  { day: 28, label: "Marketing Plan", time: "11:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 29, label: "Project Update", time: "04:00 PM", color: "bg-blue-50 text-blue-700" },
  { day: 31, label: "Holiday", time: "", color: "bg-emerald-50 text-emerald-700" },
];

const upcomingEvents = [
  { title: "Team Stand-up Meeting", time: "Today, 10:00 AM", tag: "Meeting", dot: "bg-violet-600", tagClass: "bg-violet-50 text-violet-700" },
  { title: "Client Call", time: "Today, 11:00 AM", tag: "Meeting", dot: "bg-orange-500", tagClass: "bg-violet-50 text-violet-700" },
  { title: "Project Deadline", time: "Tomorrow, 11:59 PM", tag: "Deadline", dot: "bg-blue-500", tagClass: "bg-blue-50 text-blue-700" },
  { title: "Leave (3 employees)", time: "Tomorrow, All Day", tag: "Leave", dot: "bg-pink-500", tagClass: "bg-pink-50 text-pink-700" },
  { title: "Marketing Sync", time: "May 07, 02:00 PM", tag: "Meeting", dot: "bg-orange-500", tagClass: "bg-violet-50 text-violet-700" },
];

const departments = [
  ["All Departments", "bg-violet-600"],
  ["Management", "bg-blue-500"],
  ["Development", "bg-orange-500"],
  ["Design", "bg-pink-500"],
  ["Marketing", "bg-emerald-500"],
  ["Sales", "bg-pink-400"],
  ["Support", "bg-violet-600"],
];

const calendarChecks = [
  ["Company Events", "accent-violet-600"],
  ["Meetings", "accent-orange-500"],
  ["Deadlines", "accent-blue-500"],
  ["Leaves", "accent-pink-500"],
  ["Holidays", "accent-emerald-500"],
  ["Birthdays", "accent-violet-500"],
];

const eventList = [
  { title: "Team Stand-up Meeting", dot: "bg-violet-600", type: "Meeting", typeClass: "bg-orange-50 text-orange-600", date: "May 09, 2026", time: "10:00 AM - 11:00 AM", participants: ["AB", "JT", "MD", "SR"], extra: "+6", calendar: "Meetings", calendarClass: "bg-orange-50 text-orange-600" },
  { title: "Client Call", dot: "bg-orange-500", type: "Meeting", typeClass: "bg-orange-50 text-orange-600", date: "May 09, 2026", time: "11:00 AM - 12:00 PM", participants: ["LC", "PV", "AG", "KM"], extra: "+2", calendar: "Meetings", calendarClass: "bg-orange-50 text-orange-600" },
  { title: "Project Deadline", dot: "bg-blue-500", type: "Deadline", typeClass: "bg-violet-50 text-violet-700", date: "May 10, 2026", time: "11:59 PM", participants: ["PD"], extra: "Peejay David", calendar: "Deadlines", calendarClass: "bg-blue-50 text-blue-700" },
];

const toneStyles = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  violet: "bg-violet-50 text-violet-600",
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.045)] ${className}`}>
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

const AdminCalendar = () => {
  const days = Array.from({ length: 42 }, (_, index) => index - 4);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <section className="mx-auto max-w-[1840px] rounded-3xl border border-slate-200/70 bg-white px-7 py-7 shadow-[0_12px_38px_rgba(15,23,42,0.04)]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-4xl uppercase leading-none text-neutral-950 dark:text-white"
              style={{ fontFamily: "var(--font-bruno)" }}
            >
              Calendar
            </h1>
            <p className="mt-2 text-base font-semibold text-slate-500">
              Manage company schedules, events, meetings, and deadlines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#10142d] shadow-sm">Today</button>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" className="grid h-11 w-12 place-items-center text-slate-700" aria-label="Previous month"><Icon className="h-4 w-4 rotate-180" /></button>
              <button type="button" className="grid h-11 w-12 place-items-center border-l border-slate-200 text-slate-700" aria-label="Next month"><Icon className="h-4 w-4" /></button>
            </div>
            <select className="h-11 rounded-xl border border-transparent bg-white px-3 text-base font-black text-[#26314f] outline-none"><option>May 2026</option></select>
            <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#10142d] shadow-sm"><Icon name="filter" className="h-4 w-4" />Filter</button>
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#10142d] shadow-sm outline-none"><option>Team / Department</option></select>
            <button type="button" className="flex h-11 items-center gap-2 rounded-lg bg-linear-to-b from-[#8b35ff] to-[#d72fc0] px-6 text-sm font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)]"><Icon name="plus" className="h-5 w-5" />Add Event</button>
          </div>
        </header>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => (
            <Card key={item.label} className="min-h-40 px-6 py-6">
              <div className="flex items-center gap-6">
                <span className={`grid h-20 w-20 place-items-center rounded-2xl ${toneStyles[item.tone]}`}>
                  <Icon name={item.icon} className="h-10 w-10" />
                </span>
                <div>
                  <p className="text-5xl font-black leading-none text-[#10142d]">{item.value}</p>
                  <p className="mt-2 text-base font-black leading-tight text-[#10142d]">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-500">{item.sublabel}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(760px,1fr)_390px]">
          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="mb-4 text-base font-black">Calendar View</h2>
              {["Company Calendar", "Team Calendar", "Employee Calendar", "Project Calendar"].map((item, index) => (
                <button key={item} type="button" className={`mb-2 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black ${index === 0 ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-violet-50"}`}>
                  <Icon name="calendar" className="h-4 w-4" /> {item}
                </button>
              ))}
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-black">Teams / Departments</h2>
              {departments.map(([item, color], index) => (
                <button key={item} type="button" className={`mb-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black ${index === 0 ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-violet-50"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {item}
                </button>
              ))}
              <button type="button" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-black text-[#26314f]"><Icon name="plus" className="h-4 w-4" />Add Department</button>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-black">Calendars</h2>
              {calendarChecks.map(([item, accent]) => (
                <label key={item} className="mb-3 flex items-center gap-3 text-sm font-bold text-slate-600">
                  <input type="checkbox" defaultChecked className={`h-4 w-4 rounded ${accent}`} />
                  {item}
                </label>
              ))}
              <button type="button" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-black text-[#26314f]"><Icon name="gear" className="h-4 w-4" />Manage Calendars</button>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 text-center text-base font-black text-[#10142d]">
              {weekDays.map((day) => <span key={day} className="py-5">{day}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const label = day < 1 ? 31 + day : day > 31 ? day - 31 : day;
                const muted = day < 1 || day > 31;
                const events = calendarEvents.filter((event) => event.day === day);

                return (
                  <div key={`${day}-${index}`} className="min-h-34 border-b border-r border-slate-200 p-3 last:border-r-0">
                    <div className={`mb-3 text-base font-black ${muted ? "text-slate-400" : "text-[#10142d]"}`}>{label}</div>
                    <div className="space-y-1.5">
                      {events.map((event) => (
                        <div key={`${day}-${event.label}`} className={`relative truncate rounded-lg px-2.5 py-1.5 text-xs font-black ${event.color}`}>
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
                          {event.label}
                          {event.time && <span className="block pl-3 font-bold opacity-80">{event.time}</span>}
                        </div>
                      ))}
                      {events.find((event) => event.more) && <p className="pl-2 text-xs font-black text-slate-500">+ {events.find((event) => event.more)?.more} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black">Upcoming Events</h2>
                <button type="button" className="text-sm font-black text-violet-700">View all</button>
              </div>
              {upcomingEvents.map((event) => (
                <div key={event.title} className="grid grid-cols-[16px_1fr_auto] items-center gap-4 border-b border-slate-100 py-4 last:border-b-0">
                  <span className={`h-3 w-3 rounded-full ${event.dot}`} />
                  <span>
                    <span className="block text-sm font-black">{event.title}</span>
                    <span className="text-xs font-bold text-slate-500">{event.time}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${event.tagClass}`}>{event.tag}</span>
                </div>
              ))}
            </Card>

            <Card className="p-6">
              <h2 className="mb-7 text-lg font-black">Calendar Analytics</h2>
              <div className="grid gap-7 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: "conic-gradient(#f97316 0 39%, #3b82f6 39% 61%, #ec4899 61% 82%, #22c55e 82% 100%)" }}>
                  <div className="grid h-22 w-22 place-items-center rounded-full bg-white text-center shadow-sm">
                    <span className="text-3xl font-black leading-none">38<span className="mt-1 block text-xs text-slate-500">Total Events</span></span>
                  </div>
                </div>
                <div className="space-y-4 text-sm font-bold">
                  {[
                    ["Meetings", "15 (39%)", "bg-orange-500"],
                    ["Deadlines", "23 (61%)", "bg-blue-500"],
                    ["Leaves", "8 (21%)", "bg-pink-500"],
                    ["Holidays", "5 (13%)", "bg-emerald-500"],
                  ].map(([label, value, color]) => (
                    <p key={label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${color}`} />{label}</span>
                      <span>{value}</span>
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-5 overflow-hidden">
          <div className="px-6 pt-5">
            <h2 className="text-lg font-black">Event List <span className="text-sm font-bold text-slate-500">(May 2026)</span></h2>
          </div>
          <div className="overflow-x-auto px-6 pb-5">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="text-xs font-black text-slate-500">
                <tr>{["Event", "Type", "Date & Time", "Participants / Assignees", "Calendar", "Actions"].map((heading) => <th key={heading} className="px-3 py-4">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventList.map((event) => (
                  <tr key={event.title}>
                    <td className="px-3 py-3 font-black"><span className={`mr-4 inline-block h-3 w-3 rounded-full ${event.dot}`} />{event.title}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${event.typeClass}`}>{event.type}</span></td>
                    <td className="px-3 py-3 font-bold text-slate-600">{event.date} <span className="ml-8">{event.time}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {event.participants.map((participant) => <span key={participant} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-pink-100 text-[10px] font-black text-pink-700">{participant}</span>)}
                        </div>
                        <span className="text-xs font-black text-slate-500">{event.extra}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${event.calendarClass}`}>{event.calendar}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-blue-600" aria-label={`Edit ${event.title}`}>
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-pink-600" aria-label={`Delete ${event.title}`}>
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-3 text-center">
              <button type="button" className="text-base font-black text-violet-700">View all events</button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default AdminCalendar;
