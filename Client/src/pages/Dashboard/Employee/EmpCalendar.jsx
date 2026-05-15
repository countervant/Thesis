const stats = [
  { label: "Total Events", value: "8", sublabel: "this month", tone: "violet", icon: "calendar" },
  { label: "Upcoming", value: "3", sublabel: "this week", tone: "orange", icon: "clock" },
  { label: "Completed", value: "2", sublabel: "this week", tone: "green", icon: "check" },
  { label: "Overdue", value: "1", sublabel: "event", tone: "pink", icon: "bell" },
];

const upcomingEvents = [
  { title: "Team Stand-up Meeting", time: "10:00 AM - 11:00 AM", date: "Today May 09", dot: "bg-violet-600" },
  { title: "Client Revision", time: "01:00 PM - 02:30 PM", date: "Today May 09", dot: "bg-orange-500" },
  { title: "UI Design Review", time: "03:00 PM - 04:00 PM", date: "Tomorrow May 10", dot: "bg-blue-500" },
  { title: "Project Deadline", time: "11:59 PM", date: "May 12", dot: "bg-pink-500" },
  { title: "Marketing Strategy Meeting", time: "02:00 PM - 03:30 PM", date: "May 14", dot: "bg-emerald-500" },
];

const calendarEvents = [
  { day: 1, label: "Labor Day", time: "", color: "bg-emerald-50 text-emerald-700" },
  { day: 4, label: "Team Meeting", time: "10:00 AM", color: "bg-violet-50 text-violet-700" },
  { day: 5, label: "Client Call", time: "10:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 7, label: "UI/UX Review", time: "02:00 PM", color: "bg-blue-50 text-blue-700" },
  { day: 8, label: "Project Deadline", time: "11:59 PM", color: "bg-pink-50 text-pink-700" },
  { day: 9, label: "Stand-up Meeting", time: "10:00 AM", color: "bg-violet-50 text-violet-700", badge: "9", more: 2 },
  { day: 11, label: "Client Revision", time: "01:00 PM", color: "bg-orange-50 text-orange-700" },
  { day: 12, label: "Submit Design", time: "11:00 AM", color: "bg-pink-50 text-pink-700" },
  { day: 13, label: "Website Review", time: "03:00 PM", color: "bg-blue-50 text-blue-700" },
  { day: 14, label: "Marketing Meeting", time: "02:00 PM", color: "bg-violet-50 text-violet-700" },
  { day: 15, label: "Progress Report", time: "05:00 PM", color: "bg-emerald-50 text-emerald-700" },
  { day: 18, label: "Sprint Planning", time: "10:30 AM", color: "bg-blue-50 text-blue-700" },
  { day: 19, label: "Client Call", time: "11:00 AM", color: "bg-orange-50 text-orange-700" },
  { day: 21, label: "Design Review", time: "02:00 PM", color: "bg-violet-50 text-violet-700" },
  { day: 22, label: "Project Update", time: "04:00 PM", color: "bg-pink-50 text-pink-700" },
  { day: 25, label: "Team Building", time: "All Day", color: "bg-emerald-50 text-emerald-700" },
];

const calendars = [
  ["My Schedule", "accent-violet-600"],
  ["Tasks & Deadlines", "accent-orange-500"],
  ["Meetings", "accent-blue-500"],
  ["Personal", "accent-emerald-500"],
  ["Company Holidays", "accent-pink-500"],
];

const scheduleRows = [
  { time: "10:00 AM - 11:00 AM", title: "Team Stand-up Meeting", meta: "With Van Dev, Peejay David +2", tag: "Meeting", tagClass: "bg-violet-50 text-violet-700", dot: "bg-violet-600" },
  { time: "01:00 PM - 02:30 PM", title: "Client Revision", meta: "Review website design and feedback", tag: "Task", tagClass: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  { time: "03:00 PM - 04:00 PM", title: "UI Design Review", meta: "Dashboard UI/UX review", tag: "Review", tagClass: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
];

const toneStyles = {
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
  if (name === "clock") return <svg {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" /><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...props}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "bell") return <svg {...props}><path d="M7 10a5 5 0 0 1 10 0v3.5l2 3H5l2-3V10zM10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "more") return <svg {...props}><circle cx="12" cy="5" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="19" r="1.6" fill="currentColor" /></svg>;
  if (name === "people") return <svg {...props}><circle cx="9" cy="8.5" r="2.4" stroke="currentColor" strokeWidth="1.7" /><circle cx="15.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.7" /><path d="M4.5 18c.5-2.5 2-3.8 4.5-3.8 2.4 0 3.9 1.3 4.4 3.8M13.5 17.7c.5-1.8 1.6-2.7 3.3-2.7 1.6 0 2.7.9 3.2 2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  if (name === "briefcase") return <svg {...props}><path d="M9 7V5h6v2M5 8h14v11H5zM5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

const EmpCalendar = () => {
  const days = Array.from({ length: 42 }, (_, index) => index - 4);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1840px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-4xl uppercase leading-none text-neutral-950 dark:text-white"
              style={{ fontFamily: "var(--font-bruno)" }}
            >
              Calendar
            </h1>
            <p className="mt-2 text-base font-semibold text-slate-500">
              Manage your schedule, events, and important deadlines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#10142d] shadow-sm">Today</button>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" className="grid h-11 w-12 place-items-center text-slate-700" aria-label="Previous month"><Icon className="h-4 w-4 rotate-180" /></button>
              <button type="button" className="grid h-11 w-12 place-items-center border-l border-slate-200 text-slate-700" aria-label="Next month"><Icon className="h-4 w-4" /></button>
            </div>
            <select className="h-11 rounded-xl border border-transparent bg-white px-3 text-base font-black text-[#26314f] outline-none"><option>May 2026</option></select>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {["Month", "Week", "Day"].map((item, index) => (
                <button key={item} type="button" className={`h-9 min-w-20 rounded-lg px-4 text-sm font-black ${index === 0 ? "border border-pink-200 bg-pink-50 text-pink-600" : "text-[#10142d]"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label} className="min-h-32 px-6 py-5">
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
                <button type="button" className="text-sm font-black text-pink-600">View all</button>
              </div>
              <div className="space-y-1">
                {upcomingEvents.map((event) => (
                  <div key={event.title} className="grid grid-cols-[14px_1fr_auto] items-start gap-3 border-b border-slate-100 py-4 last:border-b-0">
                    <span className={`mt-1.5 h-3 w-3 rounded-full ${event.dot}`} />
                    <span>
                      <span className="block text-sm font-black">{event.title}</span>
                      <span className="text-xs font-bold text-slate-500">{event.time}</span>
                    </span>
                    <span className="text-right text-xs font-bold text-slate-500">{event.date}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black">My Calendars</h2>
                <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-lg font-black text-slate-500">+</button>
              </div>
              {calendars.map(([item, accent]) => (
                <label key={item} className="mb-3 flex items-center gap-3 text-sm font-bold text-slate-600">
                  <input type="checkbox" defaultChecked className={`h-4 w-4 rounded ${accent}`} />
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
              {days.map((day, index) => {
                const label = day < 1 ? 31 + day : day > 31 ? day - 31 : day;
                const muted = day < 1 || day > 31;
                const events = calendarEvents.filter((event) => event.day === day);

                return (
                  <div key={`${day}-${index}`} className="min-h-32 border-b border-r border-slate-200 p-3 last:border-r-0">
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
        </div>

        <Card className="overflow-hidden p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Today's Schedule</h2>
            <button type="button" className="text-sm font-black text-pink-600">View full day</button>
          </div>
          <div className="divide-y divide-slate-100">
            {scheduleRows.map((row) => (
              <div key={row.title} className="grid grid-cols-[18px_170px_minmax(220px,1fr)_minmax(240px,1fr)_90px_36px] items-center gap-3 py-4 text-sm">
                <span className={`h-3 w-3 rounded-full ${row.dot}`} />
                <span className="font-bold text-slate-500">{row.time}</span>
                <span className="font-black text-[#10142d]">{row.title}</span>
                <span className="flex items-center gap-2 font-semibold text-slate-500">
                  <Icon name={row.title.includes("Team") ? "people" : "briefcase"} className="h-4 w-4" />
                  {row.meta}
                </span>
                <span className={`rounded-full px-3 py-1 text-center text-xs font-black ${row.tagClass}`}>{row.tag}</span>
                <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500" aria-label={`${row.title} options`}>
                  <Icon name="more" className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmpCalendar;
