import done from "../../../assets/done.png";
import notification from "../../../assets/notification.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import taskIcon from "../../../assets/task.png";

const taskStats = [
  { label: "Total Tasks", value: "12", icon: taskIcon, tone: "pink" },
  { label: "Due Today", value: "3", icon: pendingrequest, tone: "orange" },
  { label: "In Progress", value: "5", icon: progress, tone: "blue" },
  { label: "Completed", value: "20", icon: done, tone: "green" },
  { label: "Overdue", value: "3", icon: notification, tone: "rose" },
];

const dueTodayTasks = [
  { title: "Design landing page", project: "Website Redesign", priority: "High", date: "Today, May 10", progress: 75, status: "In Progress", dot: "bg-orange-500" },
  { title: "Prepare client presentation", project: "Marketing Campaign", priority: "Medium", date: "Today, May 10", progress: 50, status: "In Progress", dot: "bg-orange-500" },
  { title: "Fix bugs on dashboard", project: "Web Application", priority: "High", date: "Today, May 10", progress: 30, status: "In Review", dot: "bg-orange-500" },
];

const upcomingTasks = [
  { title: "Create UI components", project: "Design System", priority: "Low", date: "May 14, 2026", progress: 10, status: "Pending", dot: "bg-emerald-500" },
  { title: "Update user guide", project: "Documentation", priority: "Low", date: "May 15, 2026", progress: 0, status: "Pending", dot: "bg-emerald-500" },
  { title: "Test mobile responsiveness", project: "Website Redesign", priority: "Medium", date: "May 16, 2026", progress: 60, status: "In Progress", dot: "bg-blue-500" },
  { title: "Optimize database queries", project: "Web Application", priority: "Medium", date: "May 18, 2026", progress: 40, status: "In Progress", dot: "bg-blue-500" },
];

const toneStyles = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
};

const priorityStyles = {
  High: "bg-pink-50 text-pink-600",
  Medium: "bg-orange-50 text-orange-600",
  Low: "bg-emerald-50 text-emerald-600",
};

const statusStyles = {
  "In Progress": "bg-pink-100 text-pink-700",
  "In Review": "bg-blue-100 text-blue-700",
  Pending: "bg-orange-50 text-orange-600",
};

const progressColors = {
  "In Progress": "bg-pink-500",
  "In Review": "bg-blue-500",
  Pending: "bg-orange-400",
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white shadow-[0_3px_4px_rgba(190,65,158,0.35)] ${className}`}>
    {children}
  </section>
);

const ImageIcon = ({ src, className = "h-8 w-8" }) => (
  <img src={src} alt="" className={`${className} object-contain`} aria-hidden="true" />
);

const SmallIcon = ({ name, className = "h-4 w-4" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "plus") return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "search") return <svg {...props}><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "list") return <svg {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "board") return <svg {...props}><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M9 5v14M15 5v14" stroke="currentColor" strokeWidth="1.8" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const SelectControl = ({ label, value }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-black text-slate-500">{label}</span>
    <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100">
      <option>{value}</option>
    </select>
  </label>
);

const TaskRow = ({ item }) => (
  <div className="grid gap-4 border-b border-pink-50 px-4 py-4 last:border-b-0 lg:grid-cols-[28px_1.35fr_100px_120px_150px_110px_28px] lg:items-center">
    <div className="flex items-center gap-4">
      <span className="h-5 w-5 rounded-full border-2 border-slate-200 bg-white" />
      <span className={`h-3 w-3 rounded-full ${item.dot}`} />
    </div>
    <div>
      <p className="text-sm font-black text-[#10142d]">{item.title}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{item.project}</p>
    </div>
    <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority]}`}>
      {item.priority}
    </span>
    <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
      <SmallIcon name="calendar" className="h-4 w-4 text-slate-500" />
      {item.date}
    </span>
    <span>
      <span className="mb-1 block text-xs font-black text-[#10142d]">{item.progress}%</span>
      <span className="block h-2 rounded-full bg-slate-100">
        <span className={`block h-2 rounded-full ${progressColors[item.status]}`} style={{ width: `${item.progress}%` }} />
      </span>
    </span>
    <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${statusStyles[item.status]}`}>
      {item.status}
    </span>
    <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-pink-50" aria-label={`More actions for ${item.title}`}>
      <SmallIcon name="more" />
    </button>
  </div>
);

const TaskGroup = ({ title, count, tone, children, footer }) => (
  <Card className="overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4">
      <span className={`text-lg font-black ${tone}`}>›</span>
      <h2 className={`text-sm font-black ${tone}`}>{title}</h2>
      <span className="text-sm font-black text-slate-400">({count})</span>
    </div>
    <div className="mx-5 overflow-hidden rounded-2xl border border-pink-50 bg-white">
      {children}
    </div>
    {footer && <div className="py-4 text-center">{footer}</div>}
  </Card>
);

const EmpTask = () => {
  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-4xl uppercase leading-none text-neutral-950 dark:text-white"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            My Tasks
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Manage your tasks and stay on top of your work.
          </p>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {taskStats.map((item) => (
          <Card key={item.label} className="p-5">
            <div className="flex items-center gap-4">
              <span className={`grid h-16 w-16 place-items-center rounded-2xl ring-1 ${toneStyles[item.tone]}`}>
                <ImageIcon src={item.icon} className="h-9 w-9" />
              </span>
              <div>
                <p className="text-4xl font-black text-[#10142d]">{item.value}</p>
                <p className="mt-1 text-sm font-black text-slate-600">{item.label}</p>
                <p className={`mt-3 text-xs font-black ${item.tone === "green" ? "text-emerald-600" : item.tone === "orange" ? "text-orange-500" : item.tone === "blue" ? "text-blue-600" : "text-pink-600"}`}>
                  {item.note}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1.25fr_150px_150px_150px_auto] xl:items-end">
          <label className="relative block">
            <span className="sr-only">Search tasks</span>
            <SmallIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search tasks..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-slate-400 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
            />
          </label>
          <SelectControl label="Status" value="All" />
          <SelectControl label="Priority" value="All" />
          <SelectControl label="Sort by" value="Due Date" />
          <div className="flex rounded-2xl bg-pink-50 p-1">
            <button type="button" className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-pink-700 shadow-sm">
              <SmallIcon name="list" />
              List
            </button>
            <button type="button" className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black text-slate-500">
              <SmallIcon name="board" />
              Board
            </button>
          </div>
        </div>
      </Card>

      <TaskGroup
        title="Due Today"
        count="3"
        tone="text-orange-500"
        footer={<button type="button" className="text-sm font-black text-orange-500">View all due today (3)</button>}
      >
        {dueTodayTasks.map((item) => <TaskRow key={item.title} item={item} />)}
      </TaskGroup>

      <TaskGroup
        title="Upcoming"
        count="4"
        tone="text-slate-700"
        footer={<button type="button" className="text-sm font-black text-pink-600">View all upcoming (4)</button>}
      >
        {upcomingTasks.map((item) => <TaskRow key={item.title} item={item} />)}
      </TaskGroup>

      <Card className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-emerald-600">›</span>
          <h2 className="text-sm font-black text-emerald-600">Completed</h2>
          <span className="text-sm font-black text-slate-400">(20)</span>
        </div>
      </Card>
    </div>
  );
};

export default EmpTask;
