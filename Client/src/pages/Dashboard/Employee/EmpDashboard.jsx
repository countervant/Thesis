import { useAuth } from "../../../context/AuthContext.jsx";
import done from "../../../assets/done.png";
import pending from "../../../assets/pendingrequest.png";
import task from "../../../assets/task.png";
import progress from "../../../assets/progress.png";

const stats = [
  { label: "My Tasks", value: "12", sub: "Total Tasks", icon: task, tone: "pink" },
  { label: "Due Today", value: "3", sub: "Tasks", icon: pending, tone: "orange" },
  { label: "Pending", value: "5", sub: "Tasks", icon: progress, tone: "blue" },
  { label: "Completed", value: "20", sub: "Tasks", icon: done, tone: "green" },
];

const tasks = [
  { title: "Design landing page", project: "Website Redesign", priority: "High", date: "May 10, 2026", progress: 75, dot: "bg-[#7427ff]" },
  { title: "Prepare client presentation", project: "Marketing Campaign", priority: "Medium", date: "May 11, 2026", progress: 50, dot: "bg-orange-500" },
  { title: "Fix bugs on dashboard", project: "Web Application", priority: "High", date: "May 12, 2026", progress: 30, dot: "bg-pink-500" },
  { title: "Create UI components", project: "Design System", priority: "Low", date: "May 14, 2026", progress: 10, dot: "bg-emerald-500" },
  { title: "Update user guide", project: "Documentation", priority: "Low", date: "May 15, 2026", progress: 0, dot: "bg-lime-500" },
];

const schedule = [
  { time: "10:00 AM", title: "Team Stand-up Meeting", type: "Online Meeting", color: "bg-[#7427ff]", chip: "bg-purple-50 text-purple-600", icon: "video" },
  { time: "01:00 PM", title: "Client Revision", type: "Website Redesign", color: "bg-orange-500", chip: "bg-orange-50 text-orange-600", icon: "file" },
  { time: "03:00 PM", title: "Work on Dashboard", type: "Web Application", color: "bg-blue-500", chip: "bg-blue-50 text-blue-600", icon: "code" },
  { time: "04:30 PM", title: "Submit UI Design", type: "Design System", color: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600", icon: "check" },
  { time: "06:00 PM", title: "End of Day Summary", type: "Daily Report", color: "bg-slate-400", chip: "bg-slate-100 text-slate-600", icon: "calendar" },
];

const events = [
  { month: "MAY", day: "10", title: "Team Meeting", detail: "May 10, 2026 - 10:00 AM", tag: "Meeting", tone: "bg-pink-50 text-pink-600" },
  { month: "MAY", day: "12", title: "Project Deadline", detail: "May 12, 2026 - 11:59 PM", tag: "Deadline", tone: "bg-rose-50 text-rose-600" },
  { month: "MAY", day: "15", title: "Client Call", detail: "May 15, 2026 - 02:00 PM", tag: "Meeting", tone: "bg-blue-50 text-blue-600" },
];

const toneStyles = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
};

const priorityStyles = {
  High: "bg-pink-50 text-pink-600",
  Medium: "bg-orange-50 text-orange-600",
  Low: "bg-emerald-50 text-emerald-600",
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white shadow-[0_3px_4px_rgba(190,65,158,0.35)] ${className}`}>
    {children}
  </section>
);

const ImageIcon = ({ src, className = "h-7 w-7" }) => (
  <img src={src} alt="" className={`${className} object-contain`} aria-hidden="true" />
);

const TinyIcon = ({ name }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className: "h-5 w-5", "aria-hidden": "true" };
  if (name === "video") return <svg {...props}><path d="M5 7h10v10H5zM15 11l4-3v8l-4-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "file") return <svg {...props}><path d="M7 4h7l4 4v12H7zM14 4v5h5M10 13h5M10 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "code") return <svg {...props}><path d="m9 8-4 4 4 4M15 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...props}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const getDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return fullName || user?.email?.split("@")[0] || "Peeyay";
};

const EmpDashboard = () => {
  const { user } = useAuth();
  const firstName = getDisplayName(user).split(" ")[0];

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-6 bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#10142d]">
            Good morning, {firstName}!
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Let's make today productive and achieve your goals.
          </p>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="p-5">
            <div className="flex items-center gap-4">
              <span className={`grid h-16 w-16 place-items-center rounded-2xl ring-1 ${toneStyles[item.tone]}`}>
                <ImageIcon src={item.icon} className="h-9 w-9" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-600">{item.label}</p>
                <p className="mt-1 text-4xl font-black text-[#10142d]">{item.value}</p>
                <p className="text-xs font-bold text-slate-500">{item.sub}</p>
                <p className={`mt-3 text-xs font-black ${item.tone === "green" ? "text-emerald-600" : item.tone === "orange" ? "text-orange-500" : "text-pink-600"}`}>
                  {item.note}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-xl font-black">My Tasks</h2>
            <button type="button" className="text-sm font-black text-pink-600">View all tasks</button>
          </div>
          <div className="flex flex-wrap gap-2 px-5">
            {["All", "In Progress", "Pending", "In Review", "Done"].map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`rounded-full px-4 py-2 text-xs font-black ${index === 0 ? "bg-pink-100 text-pink-700" : "border border-pink-100 bg-white text-slate-600"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="px-5 py-4">
            {tasks.map((item) => (
              <div key={item.title} className="grid gap-3 border-b border-pink-50 py-4 last:border-b-0 md:grid-cols-[1.2fr_110px_130px_120px] md:items-center">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-3 w-3 rounded-full ${item.dot}`} />
                  <span>
                    <span className="block text-sm font-black">{item.title}</span>
                    <span className="text-xs font-bold text-slate-500">{item.project}</span>
                  </span>
                </div>
                <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority]}`}>
                  {item.priority}
                </span>
                <span className="text-xs font-bold text-slate-600">{item.date}</span>
                <span>
                  <span className="mb-1 block text-xs font-black">{item.progress}%</span>
                  <span className="block h-2 rounded-full bg-slate-100">
                    <span className="block h-2 rounded-full bg-pink-500" style={{ width: `${item.progress}%` }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-xl font-black">Today's Schedule</h2>
            <button type="button" className="text-sm font-black text-pink-600">View calendar</button>
          </div>
          <div className="px-5 pb-5">
            {schedule.map((item) => (
              <div key={`${item.time}-${item.title}`} className="grid grid-cols-[84px_1fr_44px] items-center gap-4 border-b border-pink-50 py-4 last:border-b-0">
                <span className="flex items-center gap-3 text-xs font-black text-slate-500">
                  <span className={`h-3 w-3 rounded-full ${item.color}`} />
                  {item.time}
                </span>
                <span>
                  <span className="block text-sm font-black">{item.title}</span>
                  <span className="text-xs font-bold text-slate-500">{item.type}</span>
                </span>
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.chip}`}>
                  <TinyIcon name={item.icon} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.25fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">My Progress <span className="text-sm text-slate-500">(This Week)</span></h2>
            <button type="button" className="text-sm font-black text-pink-600">View report</button>
          </div>
          <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
            <div className="grid h-44 w-44 place-items-center rounded-full" style={{ background: "conic-gradient(#7427ff 0 55%, #f53b98 55% 75%, #ff7a00 75% 88%, #10b867 88% 100%)" }}>
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-sm">
                <span className="text-4xl font-black leading-none">75%<span className="mt-1 block text-xs text-slate-500">Overall Progress</span></span>
              </div>
            </div>
            <div className="space-y-4 text-sm font-bold">
              {[
                ["Completed", "20", "bg-emerald-500"],
                ["In Progress", "5", "bg-blue-500"],
                ["Pending", "3", "bg-orange-500"],
                ["In Review", "2", "bg-pink-500"],
              ].map(([label, value, color]) => (
                <p key={label} className="grid grid-cols-[1fr_auto] items-center gap-6">
                  <span className="flex items-center gap-3 text-slate-600"><span className={`h-3 w-3 rounded-full ${color}`} />{label}</span>
                  <span className="font-black">{value}</span>
                </p>
              ))}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-xl font-black">Upcoming Events</h2>
            <button type="button" className="text-sm font-black text-pink-600">View calendar</button>
          </div>
          <div className="px-5 pb-5">
            {events.map((event) => (
              <div key={event.title} className="grid grid-cols-[58px_1fr_auto] items-center gap-4 border-b border-pink-50 py-4 last:border-b-0">
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-slate-50 text-center text-xs font-black text-slate-600">
                  <span>{event.month}<span className="block text-lg text-[#10142d]">{event.day}</span></span>
                </span>
                <span>
                  <span className="block text-sm font-black">{event.title}</span>
                  <span className="text-xs font-bold text-slate-500">{event.detail}</span>
                </span>
                <span className={`rounded-full px-4 py-1 text-xs font-black ${event.tone}`}>{event.tag}</span>
              </div>
            ))}
            <div className="pt-4 text-center">
              <button type="button" className="text-sm font-black text-pink-600">View all events</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmpDashboard;
