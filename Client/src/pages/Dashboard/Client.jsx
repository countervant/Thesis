import { useEffect, useMemo, useState } from "react";
import Skeleton from "../../components/Skeleton.jsx";
import { getApiErrorMessage, calendarAPI, messageAPI, taskAPI } from "../../services/api.js";

const statusFromApi = {
  pending: "Pending",
  in_progress: "In progress",
  review: "In review",
  done: "Completed",
};

const statusStyles = {
  "In progress": "bg-emerald-50 text-emerald-600",
  "In review": "bg-blue-50 text-blue-600",
  Pending: "bg-orange-50 text-orange-600",
  Completed: "bg-slate-100 text-slate-600",
};

const progressColors = {
  "In progress": "bg-pink-500",
  "In review": "bg-blue-500",
  Pending: "bg-orange-400",
  Completed: "bg-emerald-500",
};

const statStyles = {
  projects: "bg-[#f0e9ff] text-[#754de8] ring-[#754de8]/20",
  revisions: "bg-pink-50 text-[#e347a8] ring-[#e347a8]/20",
  messages: "bg-[#f0e9ff] text-[#754de8] ring-[#754de8]/20",
  meetings: "bg-orange-50 text-orange-500 ring-orange-500/20",
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800 ${className}`}>
    {children}
  </section>
);

const Icon = ({ name, className = "h-6 w-6" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "folder") return <svg {...props}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "edit") return <svg {...props}><path d="M11 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="m14 4 6 6-7 7-4 1 1-4 7-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "message") return <svg {...props}><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-5 4v-4.5A2.5 2.5 0 0 1 3 12V6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "dots") return <svg {...props}><path d="M12 6h.01M12 12h.01M12 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
  return <svg {...props}><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getInitials = (value) =>
  String(value || "Client Project")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CP";

const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((subtask) => ({
      title: subtask?.title || "",
      completed: Boolean(subtask?.completed),
    }))
    .filter((subtask) => subtask.title);
};

const getTaskProgress = (subtasks) => {
  if (!subtasks.length) return 0;
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatRelativeTime = (value) => {
  const date = parseDate(value);
  if (!date) return "Recently";
  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / 3600000));
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

const normalizeTask = (task) => {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const status = statusFromApi[task?.status] || task?.status || "Pending";
  const amount = Number(task?.amount ?? task?.budget ?? 0);
  const paid = Number(task?.paid ?? 0);

  return {
    id: getEntityId(task),
    title: task?.title || "Untitled project",
    description: task?.description || "Project request",
    dueDate: task?.dueDate,
    priority: task?.priority || "medium",
    revisionRequests: Array.isArray(task?.revisionRequests) ? task.revisionRequests : [],
    status,
    progress: getTaskProgress(subtasks),
    updatedAt: task?.updatedAt || task?.createdAt,
    amount,
    paid,
    pendingAmount: Math.max(0, amount - paid),
  };
};

const normalizeMeeting = (event) => ({
  id: getEntityId(event),
  title: event?.title || "Client meeting",
  date: event?.date,
});

const getDisplayName = (profile) => {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  return name || profile?.companyName || profile?.email || "Unknown User";
};

const normalizeMessagePreview = (thread) => ({
  id: getEntityId(thread?.lastMessage) || getEntityId(thread?.participant),
  name: getDisplayName(thread?.participant),
  text: thread?.lastMessage?.text || "No messages yet.",
  time: thread?.lastMessage?.createdAt,
});

const SectionHeader = ({ action, title }) => (
  <div className="flex items-center justify-between gap-4 border-b border-pink-50 px-5 py-4 dark:border-neutral-800">
    <h2 className="text-sm font-black text-[#10142d] dark:text-white">{title}</h2>
    {action && <span className="text-xs font-black text-[#e347a8]">{action}</span>}
  </div>
);

const ClientDashboardSkeleton = () => (
  <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
    <header>
      <Skeleton className="h-9 w-60" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
    </header>

    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
            <span className="min-w-0 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-9 w-10" />
              <Skeleton className="mt-2 h-3 w-32" />
            </span>
          </div>
        </Card>
      ))}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <Card className="overflow-hidden">
        <SectionHeader title="Project Overview" />
        <div className="divide-y divide-pink-50 px-5 dark:divide-neutral-800">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid gap-4 py-4 md:grid-cols-[minmax(0,1.35fr)_120px_110px_32px] md:items-center">
              <span className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <span className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-44 max-w-full" />
                  <span className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-8" />
                  </span>
                </span>
              </span>
              <span>
                <Skeleton className="h-3 w-14" />
                <Skeleton className="mt-2 h-3 w-24" />
              </span>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionHeader title="Recent Revision Requests" />
        <div className="divide-y divide-pink-50 px-5 dark:divide-neutral-800">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <span className="min-w-0">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="mt-2 h-3 w-32 max-w-full" />
              </span>
              <span>
                <Skeleton className="ml-auto h-3 w-14" />
                <Skeleton className="mt-2 h-6 w-20 rounded-md" />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <Card className="overflow-hidden">
        <SectionHeader title="Latest Messages" />
        <div className="divide-y divide-pink-50 px-5 dark:divide-neutral-800">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <span className="min-w-0">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="mt-2 h-3 w-64 max-w-full" />
              </span>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionHeader title="Invoice Summary" />
        <div className="px-5 py-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] items-center border-b border-pink-50 py-4 last:border-b-0 dark:border-neutral-800">
              <span className="flex items-center gap-3">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </span>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

const ClientDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [messagePreviews, setMessagePreviews] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const [taskResult, unreadResult, meetingResult, threadResult] = await Promise.allSettled([
          taskAPI.getAll({ limit: 100 }),
          messageAPI.getUnreadCount(),
          calendarAPI.getAll({ limit: 20 }),
          messageAPI.getThreads({ limit: 3 }),
        ]);

        if (!isMounted) return;

        if (taskResult.status === "fulfilled") {
          setTasks(taskResult.value.map(normalizeTask));
        } else {
          setErrorMessage(getApiErrorMessage(taskResult.reason, "Unable to load client dashboard."));
        }

        if (unreadResult.status === "fulfilled") {
          setUnreadCount(unreadResult.value);
        }

        if (meetingResult.status === "fulfilled") {
          setMeetings(meetingResult.value.map(normalizeMeeting));
        }

        if (threadResult.status === "fulfilled") {
          setMessagePreviews(threadResult.value.map(normalizeMessagePreview));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const activeProjects = tasks.filter((task) => task.status !== "Completed");
    const pendingRevisions = tasks.filter(
      (task) => task.status === "Pending" || task.revisionRequests.length > 0
    );
    const highPriority = tasks.filter((task) => task.priority === "high" && task.status !== "Completed");
    const upcomingMeetings = meetings
      .filter((meeting) => {
        const date = parseDate(meeting.date);
        return date && date >= new Date(new Date().toDateString());
      })
      .sort((first, second) => parseDate(first.date) - parseDate(second.date));

    return {
      activeProjects,
      completedProjects: tasks.filter((task) => task.status === "Completed"),
      highPriority,
      pendingRevisions,
      projectOverview: tasks.slice(0, 3),
      recentRevisions: pendingRevisions.slice(0, 3),
      upcomingMeetings,
    };
  }, [meetings, tasks]);

  const stats = [
    {
      label: "Active Projects",
      value: dashboardData.activeProjects.length,
      detail: `${dashboardData.activeProjects.filter((task) => task.status === "In progress").length} on track`,
      icon: "folder",
      tone: "projects",
    },
    {
      label: "Pending Revisions",
      value: dashboardData.pendingRevisions.length,
      detail: `${dashboardData.highPriority.length} high priority`,
      icon: "edit",
      tone: "revisions",
    },
    {
      label: "Unread Messages",
      value: unreadCount,
      detail: "From conversations",
      icon: "message",
      tone: "messages",
    },
    {
      label: "Upcoming Meetings",
      value: dashboardData.upcomingMeetings.length,
      detail: "This week",
      icon: "calendar",
      tone: "meetings",
    },
  ];

  const invoiceSummary = tasks.reduce(
    (summary, task) => ({
      amount: summary.amount + task.amount,
      paid: summary.paid + task.paid,
      pending: summary.pending + task.pendingAmount,
    }),
    { amount: 0, paid: 0, pending: 0 }
  );

  if (isLoading) {
    return <ClientDashboardSkeleton />;
  }

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header>
        <h1 className="page-title text-3xl">Client Dashboard</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Track your projects, revisions, messages, and updates in one place.
        </p>
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
              <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ring-1 ${statStyles[item.tone]}`}>
                <Icon name={item.icon} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-600 dark:text-slate-300">{item.label}</p>
                <p className="mt-1 text-4xl font-black text-[#10142d] dark:text-white">{item.value}</p>
                <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${item.tone === "meetings" ? "bg-orange-500" : item.tone === "revisions" ? "bg-pink-500" : "bg-emerald-500"}`} />
                  {item.detail}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden">
          <SectionHeader action="View all projects" title="Project Overview" />
          <div className="divide-y divide-pink-50 px-5 dark:divide-neutral-800">
            {dashboardData.projectOverview.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No projects yet.</p>
            )}
            {dashboardData.projectOverview.map((project, index) => (
              <div key={project.id || project.title} className="grid gap-4 py-4 md:grid-cols-[minmax(0,1.35fr)_120px_110px_32px] md:items-center">
                <div className="flex items-center gap-4">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-black text-white ${avatarColors[index % avatarColors.length]}`}>
                    {getInitials(project.title)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{project.title}</span>
                    <span className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
                      <span className="h-1.5 rounded-full bg-slate-100 dark:bg-neutral-800">
                        <span className={`block h-1.5 rounded-full ${progressColors[project.status] || "bg-pink-500"}`} style={{ width: `${Math.max(project.progress, project.status === "Completed" ? 100 : 12)}%` }} />
                      </span>
                      <span className="text-xs font-bold text-slate-500">{project.progress || (project.status === "Completed" ? 100 : 0)}%</span>
                    </span>
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  <span className="mb-1 block text-[10px] font-black text-slate-400">Due Date</span>
                  {formatDate(project.dueDate)}
                </span>
                <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-black ${statusStyles[project.status] || statusStyles.Pending}`}>
                  {project.status}
                </span>
                <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-pink-50 hover:text-[#e347a8]" aria-label={`More options for ${project.title}`}>
                  <Icon name="dots" className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <SectionHeader action="View all" title="Recent Revision Requests" />
          <div className="divide-y divide-pink-50 px-5 dark:divide-neutral-800">
            {dashboardData.recentRevisions.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No revision requests yet.</p>
            )}
            {dashboardData.recentRevisions.map((revision, index) => (
              <div key={revision.id || revision.title} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-4">
                <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white ${avatarColors[index % avatarColors.length]}`}>
                  {getInitials(revision.title)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{revision.title}</span>
                  <span className="block truncate text-xs font-bold text-slate-500">{revision.description}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[11px] font-bold text-slate-400">{formatRelativeTime(revision.updatedAt)}</span>
                  <span className={`mt-2 inline-flex rounded-md px-3 py-1 text-[10px] font-black ${statusStyles[revision.status] || statusStyles.Pending}`}>
                    {revision.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden">
          <SectionHeader action="View all" title="Latest Messages" />
          <div className="divide-y divide-pink-50 px-5 dark:divide-neutral-800">
            {messagePreviews.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No messages yet.</p>
            )}
            {messagePreviews.map((message, index) => (
              <div key={message.id || message.name} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-4">
                <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white ${avatarColors[index % avatarColors.length]}`}>
                  {getInitials(message.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{message.name}</span>
                  <span className="block truncate text-xs font-bold text-slate-500">{message.text}</span>
                </span>
                <span className="text-right text-xs font-bold text-slate-500">
                  {formatRelativeTime(message.time)}
                  {index === 0 && unreadCount > 0 && <span className="ml-auto mt-2 block h-2 w-2 rounded-full bg-pink-500" />}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <SectionHeader title="Invoice Summary" />
          <div className="divide-y divide-pink-50 px-5 py-3 dark:divide-neutral-800">
            {[
              { label: "Total Amount", value: invoiceSummary.amount, color: "bg-blue-500" },
              { label: "Paid", value: invoiceSummary.paid, color: "bg-emerald-500" },
              { label: "Pending", value: invoiceSummary.pending, color: "bg-orange-500" },
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
                <span className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-neutral-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
                <span className="text-sm font-black text-[#10142d] dark:text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const avatarColors = ["bg-[#111936]", "bg-orange-500", "bg-emerald-500", "bg-[#754de8]"];

export default ClientDashboard;
