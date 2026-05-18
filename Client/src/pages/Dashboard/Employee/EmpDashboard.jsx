import { useEffect, useMemo, useState } from "react";
import done from "../../../assets/done.png";
import pending from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import task from "../../../assets/task.png";
import { DashboardSkeleton } from "../../../components/Skeleton.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { getApiErrorMessage, taskAPI } from "../../../services/api.js";

const statusFromApi = {
  done: "Done",
  in_progress: "In progress",
  pending: "Pending",
  review: "In review",
};

const toneStyles = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
};

const priorityStyles = {
  High: "bg-pink-50 text-pink-600",
  Low: "bg-emerald-50 text-emerald-600",
  Medium: "bg-orange-50 text-orange-600",
};

const progressColors = {
  Done: "bg-emerald-500",
  "In progress": "bg-pink-500",
  "In review": "bg-blue-500",
  Pending: "bg-orange-400",
};

const eventTones = {
  Done: "bg-emerald-50 text-emerald-600",
  "In progress": "bg-pink-50 text-pink-600",
  "In review": "bg-blue-50 text-blue-600",
  Pending: "bg-orange-50 text-orange-600",
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
  if (name === "check") return <svg {...props}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "clock") return <svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const getDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return fullName || user?.email?.split("@")[0] || "Employee";
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return "No date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getDateStatus = (value) => {
  const due = parseDate(value);
  if (!due) return "Upcoming";

  const today = parseDate(new Date());
  const dayDifference = Math.round((due - today) / 86400000);
  if (dayDifference < 0) return "Overdue";
  if (dayDifference === 0) return "Today";
  return "Upcoming";
};

const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [];

  return subtasks
    .map((subtask) => ({
      completed: Boolean(subtask?.completed),
      title: subtask?.title || "",
    }))
    .filter((subtask) => subtask.title);
};

const getTaskProgress = (subtasks) => {
  if (!subtasks.length) return 0;
  const completed = subtasks.filter((subtask) => subtask.completed).length;
  return Math.round((completed / subtasks.length) * 100);
};

const normalizeTask = (item) => {
  const subtasks = normalizeSubtasks(item?.subtasks);
  const status = statusFromApi[item?.status] || "Pending";

  return {
    id: getEntityId(item),
    title: item?.title || "Untitled task",
    description: item?.description || "No description",
    dueDate: item?.dueDate,
    priority: item?.priority ? item.priority[0].toUpperCase() + item.priority.slice(1) : "Medium",
    status,
    subtasks,
    progress: getTaskProgress(subtasks),
  };
};

const EmpDashboard = () => {
  const { user } = useAuth();
  const firstName = getDisplayName(user).split(" ")[0];
  const [tasks, setTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await taskAPI.getAll({ limit: 100 });
        if (isMounted) setTasks(data.map(normalizeTask));
      } catch (error) {
        if (isMounted) setErrorMessage(getApiErrorMessage(error, "Unable to load dashboard."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTasks();
    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const sortedTasks = [...tasks].sort(
      (first, second) =>
        (parseDate(first.dueDate) || new Date(8640000000000000)) -
        (parseDate(second.dueDate) || new Date(8640000000000000))
    );
    const activeTasks = sortedTasks.filter((item) => item.status !== "Done");
    const dueTodayTasks = tasks.filter((item) => getDateStatus(item.dueDate) === "Today" && item.status !== "Done");
    const pendingTasks = tasks.filter((item) => item.status === "Pending");
    const completedTasks = tasks.filter((item) => item.status === "Done");
    const progressAverage = tasks.length
      ? Math.round(tasks.reduce((total, item) => total + item.progress, 0) / tasks.length)
      : 0;

    return {
      activeTasks,
      completedTasks,
      dueTodayTasks,
      pendingTasks,
      progressAverage,
      recentTasks: activeTasks.slice(0, 5),
      upcomingTasks: activeTasks.filter((item) => getDateStatus(item.dueDate) !== "Overdue").slice(0, 5),
    };
  }, [tasks]);

  const stats = [
    { label: "My Tasks", value: tasks.length, sub: "Total Tasks", icon: task, tone: "pink" },
    { label: "Due Today", value: dashboardData.dueTodayTasks.length, sub: "Tasks", icon: pending, tone: "orange" },
    { label: "Pending", value: dashboardData.pendingTasks.length, sub: "Tasks", icon: progress, tone: "blue" },
    { label: "Completed", value: dashboardData.completedTasks.length, sub: "Tasks", icon: done, tone: "green" },
  ];

  const progressBreakdown = [
    ["Completed", dashboardData.completedTasks.length, "bg-emerald-500"],
    ["In Progress", tasks.filter((item) => item.status === "In progress").length, "bg-blue-500"],
    ["Pending", dashboardData.pendingTasks.length, "bg-orange-500"],
    ["In Review", tasks.filter((item) => item.status === "In review").length, "bg-pink-500"],
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-6 bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#10142d]">
            Good morning, {firstName}!
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Your dashboard is based on your assigned tasks.
          </p>
        </div>
      </header>

      {errorMessage && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {errorMessage}
        </p>
      )}

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
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-xl font-black">My Tasks</h2>
            <span className="text-sm font-black text-slate-400">{dashboardData.recentTasks.length} active</span>
          </div>
          <div className="px-5 py-4">
            {dashboardData.recentTasks.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No active tasks.</p>
            )}
            {dashboardData.recentTasks.map((item) => (
              <div key={item.id} className="grid gap-3 border-b border-pink-50 py-4 last:border-b-0 md:grid-cols-[1.2fr_110px_130px_120px] md:items-center">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-3 w-3 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} />
                  <span>
                    <span className="block text-sm font-black">{item.title}</span>
                    <span className="text-xs font-bold text-slate-500">{item.description}</span>
                  </span>
                </div>
                <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority] || priorityStyles.Medium}`}>
                  {item.priority}
                </span>
                <span className="text-xs font-bold text-slate-600">{formatDate(item.dueDate)}</span>
                <span>
                  <span className="mb-1 block text-xs font-black">{item.progress}%</span>
                  <span className="block h-2 rounded-full bg-slate-100">
                    <span className={`block h-2 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} style={{ width: `${item.progress}%` }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5">
            <h2 className="text-xl font-black">Due Today</h2>
            <span className="text-sm font-black text-slate-400">{dashboardData.dueTodayTasks.length} tasks</span>
          </div>
          <div className="px-5 pb-5">
            {dashboardData.dueTodayTasks.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No tasks due today.</p>
            )}
            {dashboardData.dueTodayTasks.slice(0, 5).map((item) => (
              <div key={item.id} className="grid grid-cols-[84px_1fr_44px] items-center gap-4 border-b border-pink-50 py-4 last:border-b-0">
                <span className="flex items-center gap-3 text-xs font-black text-slate-500">
                  <span className={`h-3 w-3 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} />
                  Today
                </span>
                <span>
                  <span className="block text-sm font-black">{item.title}</span>
                  <span className="text-xs font-bold text-slate-500">{item.status}</span>
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-pink-600">
                  <TinyIcon name="clock" />
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.25fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">My Progress <span className="text-sm text-slate-500">(All Tasks)</span></h2>
            <span className="text-sm font-black text-pink-600">{dashboardData.progressAverage}%</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
            <div
              className="grid h-44 w-44 place-items-center rounded-full"
              style={{ background: `conic-gradient(#7427ff 0 ${dashboardData.progressAverage}%, #eef2f7 ${dashboardData.progressAverage}% 100%)` }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-sm">
                <span className="text-4xl font-black leading-none">
                  {dashboardData.progressAverage}%<span className="mt-1 block text-xs text-slate-500">Overall Progress</span>
                </span>
              </div>
            </div>
            <div className="space-y-4 text-sm font-bold">
              {progressBreakdown.map(([label, value, color]) => (
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
            <h2 className="text-xl font-black">Upcoming Deadlines</h2>
            <span className="text-sm font-black text-slate-400">{dashboardData.upcomingTasks.length} shown</span>
          </div>
          <div className="px-5 pb-5">
            {dashboardData.upcomingTasks.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No upcoming deadlines.</p>
            )}
            {dashboardData.upcomingTasks.map((event) => {
              const dueDate = parseDate(event.dueDate);
              return (
                <div key={event.id} className="grid grid-cols-[58px_1fr_auto] items-center gap-4 border-b border-pink-50 py-4 last:border-b-0">
                  <span className="grid h-14 w-14 place-items-center rounded-xl bg-slate-50 text-center text-xs font-black text-slate-600">
                    <span>
                      {dueDate ? dueDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "N/A"}
                      <span className="block text-lg text-[#10142d]">{dueDate ? String(dueDate.getDate()).padStart(2, "0") : "--"}</span>
                    </span>
                  </span>
                  <span>
                    <span className="block text-sm font-black">{event.title}</span>
                    <span className="text-xs font-bold text-slate-500">{formatDate(event.dueDate)}</span>
                  </span>
                  <span className={`rounded-full px-4 py-1 text-xs font-black ${eventTones[event.status] || eventTones.Pending}`}>{event.status}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmpDashboard;
