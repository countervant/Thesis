import { useEffect, useMemo, useState } from "react";
import done from "../../../assets/done.png";
import notification from "../../../assets/notification.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import taskIcon from "../../../assets/task.png";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { TaskListSkeleton } from "../../../components/Skeleton.jsx";
import { getApiErrorMessage, taskAPI } from "../../../services/api.js";

const taskStatuses = ["All", "In progress", "Pending", "In review", "Done"];
const groupPreviewLimit = 5;
const statusFromApi = {
  pending: "Pending",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};
const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [];

  return subtasks
    .map((subtask) => ({
      id: subtask?._id || subtask?.id || "",
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
  "In progress": "bg-pink-100 text-pink-700",
  "In review": "bg-blue-100 text-blue-700",
  Pending: "bg-orange-50 text-orange-600",
  Done: "bg-emerald-50 text-emerald-600",
};

const progressColors = {
  "In progress": "bg-pink-500",
  "In review": "bg-blue-500",
  Pending: "bg-orange-400",
  Done: "bg-emerald-500",
};

const statusDots = {
  "In progress": "bg-blue-500",
  "In review": "bg-violet-500",
  Pending: "bg-orange-500",
  Done: "bg-emerald-500",
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
  if (name === "search") return <svg {...props}><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "chevron") return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "list") return <svg {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "board") return <svg {...props}><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M9 5v14M15 5v14" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "check") return <svg {...props}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const SelectControl = ({ label, onChange, options, value }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-black text-slate-500">{label}</span>
    <select
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  </label>
);

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

const getDateStatus = (dueDate) => {
  const due = parseDate(dueDate);
  if (!due) return "Upcoming";

  const today = parseDate(new Date());
  const dayDifference = Math.round((due - today) / 86400000);
  if (dayDifference < 0) return "Overdue";
  if (dayDifference === 0) return "Today";
  return "Upcoming";
};

const normalizeTask = (task) => {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const status = statusFromApi[task?.status] || "Pending";

  return {
    raw: task,
    id: getEntityId(task),
    title: task?.title || "Untitled task",
    description: task?.description || "",
    startDate: task?.startDate || task?.createdAt || task?.dueDate,
    dueDate: task?.dueDate,
    status,
    priority: task?.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : "Medium",
    assignedTo: task?.assignedTo,
    createdBy: task?.createdBy,
    subtasks,
    progress: getTaskProgress(subtasks),
  };
};

const TaskRow = ({ isExpanded, item, onToggleExpand, onToggleSubtask, onViewCalendar }) => {
  const progressValue = item.progress ?? getTaskProgress(item.subtasks);
  const completedSubtasks = item.subtasks.filter((subtask) => subtask.completed).length;
  const isDone = item.status === "Done";
  const progressSummary =
    item.subtasks.length > 0
      ? `${completedSubtasks} of ${item.subtasks.length} subtasks completed`
      : "No subtasks yet";

  return (
    <article className="border-b border-pink-50 px-4 py-4 last:border-b-0">
      {isExpanded ? (
        <div className="grid gap-5 lg:grid-cols-[1.45fr_1.35fr_100px_130px_150px_112px_44px] lg:items-start">
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-expanded={isExpanded}
            aria-label={`Hide subtasks for ${item.title}`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600">
              <span className="rotate-90 transition-transform">
                <SmallIcon name="chevron" />
              </span>
            </span>
            <span className="h-10 w-1 shrink-0 rounded-full bg-pink-500" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-[#10142d]">{item.title}</span>
              <span className="mt-1 block truncate text-xs font-bold text-slate-500">{item.description || "No description"}</span>
            </span>
          </button>

          <div className="min-w-0 lg:border-r lg:border-pink-50 lg:pr-5">
            <p className="mb-2 text-[10px] font-black text-slate-500">Subtasks</p>
            {item.subtasks.length > 0 ? (
              <div className="space-y-1.5">
                {item.subtasks.map((subtask, index) => (
                  <label key={subtask.id || `${item.id}-${index}`} className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      disabled={isDone}
                      onChange={() => onToggleSubtask(item, index)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#e347a8] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className={subtask.completed ? "truncate text-slate-400 line-through" : "truncate"}>
                      {subtask.title}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400">Ask your admin to add subtasks for this task.</p>
            )}
          </div>

          <div className="lg:border-r lg:border-pink-50 lg:pr-5">
            <p className="mb-5 text-[10px] font-black text-slate-500">Priority</p>
            <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority] || priorityStyles.Medium}`}>
              {item.priority}
            </span>
          </div>

          <div className="lg:border-r lg:border-pink-50 lg:pr-5">
            <p className="mb-5 text-[10px] font-black text-slate-500">Due Date</p>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <SmallIcon name="calendar" className="h-4 w-4 text-slate-500" />
              {getDateStatus(item.dueDate) === "Today" ? "Today" : formatDate(item.dueDate)}
            </span>
          </div>

          <div>
            <p className="mb-5 text-[10px] font-black text-slate-500">Progress</p>
            <span className="mb-1 block text-xs font-black text-[#10142d]">{progressValue}%</span>
            <span className="block h-2 rounded-full bg-slate-100">
              <span className={`block h-2 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} style={{ width: `${progressValue}%` }} />
            </span>
            <p className="mt-2 text-[11px] font-black text-slate-500">{progressSummary}</p>
          </div>

          <div>
            <p className="mb-5 text-[10px] font-black text-slate-500">Status</p>
            <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${statusStyles[item.status] || statusStyles.Pending}`}>
              {item.status}
            </span>
          </div>

          <button type="button" onClick={() => onViewCalendar(item)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-pink-50 lg:mt-7" aria-label={`View ${item.title} date`}>
            <SmallIcon name="calendar" />
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[28px_1.35fr_100px_120px_150px_110px_44px] lg:items-center">
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
            aria-expanded={isExpanded}
            aria-label={`Show subtasks for ${item.title}`}
          >
            <span className="transition-transform">
              <SmallIcon name="chevron" />
            </span>
          </button>
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-1.5 h-3 w-1 rounded-full ${statusDots[item.status] || "bg-orange-500"}`} />
            <span className="min-w-0">
              <p className="truncate text-sm font-black text-[#10142d]">{item.title}</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">{item.description || "No description"}</p>
            </span>
          </div>
          <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority] || priorityStyles.Medium}`}>
            {item.priority}
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <SmallIcon name="calendar" className="h-4 w-4 text-slate-500" />
            {getDateStatus(item.dueDate) === "Today" ? "Today" : formatDate(item.dueDate)}
          </span>
          <span>
            <span className="mb-1 block text-xs font-black text-[#10142d]">{progressValue}%</span>
            <span className="block h-2 rounded-full bg-slate-100">
              <span className={`block h-2 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} style={{ width: `${progressValue}%` }} />
            </span>
          </span>
          <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${statusStyles[item.status] || statusStyles.Pending}`}>
            {item.status}
          </span>
          <button type="button" onClick={() => onViewCalendar(item)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-pink-50" aria-label={`View ${item.title} date`}>
            <SmallIcon name="calendar" />
          </button>
        </div>
      )}
    </article>
  );
};

const TaskGroup = ({ title, count, tone, children, footer, isOpen = true, onToggle }) => (
  <Card className="overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-pink-50/60"
      aria-expanded={isOpen}
    >
      <span className={`text-lg font-black transition-transform ${tone} ${isOpen ? "rotate-90" : ""}`}>
        {">"}
      </span>
      <h2 className={`text-sm font-black ${tone}`}>{title}</h2>
      <span className="text-sm font-black text-slate-400">({count})</span>
    </button>
    {isOpen && (
      <>
        <div className="mx-5 overflow-hidden rounded-2xl border border-pink-50 bg-white">
          {children}
        </div>
        {footer && <div className="py-4 text-center">{footer}</div>}
      </>
    )}
  </Card>
);

const EmpTask = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Due Date");
  const [visibleGroup, setVisibleGroup] = useState("All");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await taskAPI.getAll({ limit: 100 });
        if (isMounted) setTasks(data.map(normalizeTask));
      } catch (error) {
        if (isMounted) setErrorMessage(getApiErrorMessage(error, "Unable to load tasks."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTasks();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const dateStatus = getDateStatus(task.dueDate);
        const matchesGroup =
          visibleGroup === "All" ||
          (visibleGroup === "Due Today" && dateStatus === "Today" && task.status !== "Done") ||
          (visibleGroup === "Upcoming" && dateStatus === "Upcoming" && task.status !== "Done") ||
          (visibleGroup === "Overdue" && dateStatus === "Overdue" && task.status !== "Done") ||
          (visibleGroup === "Completed" && task.status === "Done");
        const matchesStatus = selectedTaskStatus === "All" || task.status === selectedTaskStatus;
        const matchesPriority = selectedPriority === "All" || task.priority === selectedPriority;
        const matchesSearch =
          !normalizedSearch ||
          task.title.toLowerCase().includes(normalizedSearch) ||
          task.description.toLowerCase().includes(normalizedSearch);

        return matchesGroup && matchesStatus && matchesPriority && matchesSearch;
      })
      .sort((firstTask, secondTask) => {
        if (sortBy === "Priority") {
          const ranks = { High: 0, Medium: 1, Low: 2 };
          return (ranks[firstTask.priority] ?? 3) - (ranks[secondTask.priority] ?? 3);
        }
        if (sortBy === "Status") return firstTask.status.localeCompare(secondTask.status);
        return (parseDate(firstTask.dueDate) || new Date(8640000000000000)) - (parseDate(secondTask.dueDate) || new Date(8640000000000000));
      });
  }, [searchQuery, selectedPriority, selectedTaskStatus, sortBy, tasks, visibleGroup]);

  useEffect(() => {
    setExpandedGroups({});
    setCollapsedGroups({});
  }, [searchQuery, selectedPriority, selectedTaskStatus, sortBy, visibleGroup]);

  const dueTodayTasks = visibleTasks.filter((task) => getDateStatus(task.dueDate) === "Today" && task.status !== "Done");
  const overdueTasks = visibleTasks.filter((task) => getDateStatus(task.dueDate) === "Overdue" && task.status !== "Done");
  const upcomingTasks = visibleTasks.filter((task) => getDateStatus(task.dueDate) === "Upcoming" && task.status !== "Done");
  const completedTasks = visibleTasks.filter((task) => task.status === "Done");

  const taskStats = [
    { label: "Total Tasks", value: tasks.length, icon: taskIcon, tone: "pink" },
    { label: "Due Today", value: tasks.filter((task) => getDateStatus(task.dueDate) === "Today").length, icon: pendingrequest, tone: "orange" },
    { label: "In Progress", value: tasks.filter((task) => task.status === "In progress").length, icon: progress, tone: "blue" },
    { label: "Completed", value: tasks.filter((task) => task.status === "Done").length, icon: done, tone: "green" },
    { label: "Overdue", value: tasks.filter((task) => getDateStatus(task.dueDate) === "Overdue" && task.status !== "Done").length, icon: notification, tone: "rose" },
  ];

  const renderTaskRows = (items) => {
    if (items.length === 0) {
      return <p className="px-4 py-5 text-center text-sm font-bold text-slate-500">No tasks found.</p>;
    }

    return items.map((item) => (
      <TaskRow
        isExpanded={expandedTaskIds.has(item.id)}
        key={item.id}
        item={item}
        onToggleExpand={handleToggleExpand}
        onToggleSubtask={handleToggleSubtask}
        onViewCalendar={handleViewCalendar}
      />
    ));
  };

  const getGroupItems = (groupKey, items) =>
    expandedGroups[groupKey] ? items : items.slice(0, groupPreviewLimit);

  const isGroupOpen = (groupKey) => !collapsedGroups[groupKey];

  const toggleGroupOpen = (groupKey) => {
    setCollapsedGroups((currentGroups) => ({
      ...currentGroups,
      [groupKey]: !currentGroups[groupKey],
    }));
  };

  const getGroupFooter = (groupKey, items, label, toneClass) => {
    if (items.length <= groupPreviewLimit) {
      return null;
    }

    const isExpanded = Boolean(expandedGroups[groupKey]);

    return (
      <button
        type="button"
        onClick={() =>
          setExpandedGroups((currentGroups) => ({
            ...currentGroups,
            [groupKey]: !isExpanded,
          }))
        }
        className={`text-sm font-black ${toneClass}`}
      >
        {isExpanded ? "Show less" : `View all ${label} (${items.length})`}
      </button>
    );
  };

  function handleToggleExpand(taskId) {
    setExpandedTaskIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(taskId)) {
        nextIds.delete(taskId);
      } else {
        nextIds.add(taskId);
      }
      return nextIds;
    });
  }

  const updateTaskSubtasks = async (task, nextSubtasks) => {
    try {
      setErrorMessage("");
      setNoticeMessage("");
      const updatedTask = await taskAPI.update(task.id, {
        title: task.title,
        subtasks: nextSubtasks,
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item.id === task.id ? normalizeTask(updatedTask) : item))
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to update subtask."));
    }
  };

  const handleToggleSubtask = async (task, subtaskIndex) => {
    if (task.status === "Done") {
      return;
    }

    const toggledSubtask = task.subtasks[subtaskIndex];
    const nextSubtasks = task.subtasks.map((subtask, index) =>
      index === subtaskIndex
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    const isCompletingSubtask = toggledSubtask && !toggledSubtask.completed;
    const willCompleteTask =
      isCompletingSubtask &&
      nextSubtasks.length > 0 &&
      nextSubtasks.every((subtask) => subtask.completed);

    if (willCompleteTask) {
      setConfirmAction({
        icon: "done",
        title: "Are you sure you are done?",
        message: `This will mark "${task.title}" as done.`,
        confirmLabel: "Yes, done",
        onConfirm: () => updateTaskSubtasks(task, nextSubtasks),
      });
      return;
    }

    await updateTaskSubtasks(task, nextSubtasks);
  };

  const closeConfirm = () => setConfirmAction(null);

  const confirmCurrentAction = async () => {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    await action.onConfirm();
  };

  const handleViewCalendar = (task) => {
    setNoticeMessage(`${task.title} is due on ${formatDate(task.dueDate)}.`);
    document.getElementById("employee-task-notice")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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

      {(errorMessage || noticeMessage) && (
        <p id="employee-task-notice" className={`rounded-xl border px-4 py-3 text-sm font-bold ${errorMessage ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
          {errorMessage || noticeMessage}
        </p>
      )}

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
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1.25fr_150px_150px_150px] xl:items-end">
          <label className="relative block">
            <span className="sr-only">Search tasks</span>
            <SmallIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tasks..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-slate-400 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
            />
          </label>
          <SelectControl label="Status" onChange={setSelectedTaskStatus} options={taskStatuses} value={selectedTaskStatus} />
          <SelectControl label="Priority" onChange={setSelectedPriority} options={["All", "High", "Medium", "Low"]} value={selectedPriority} />
          <SelectControl label="Sort by" onChange={setSortBy} options={["Due Date", "Priority", "Status"]} value={sortBy} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "Due Today", "Upcoming", "Overdue", "Completed"].map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setVisibleGroup(group)}
              className={`rounded-full px-4 py-2 text-xs font-black ${visibleGroup === group ? "bg-pink-100 text-pink-700" : "border border-pink-100 bg-white text-slate-600"}`}
            >
              {group}
            </button>
          ))}
        </div>
      </Card>

      {isLoading && <TaskListSkeleton rows={5} />}

      {!isLoading && (
        <>
          <TaskGroup
            title="Overdue"
            count={overdueTasks.length}
            tone="text-rose-500"
            footer={getGroupFooter("overdue", overdueTasks, "overdue", "text-rose-500")}
            isOpen={isGroupOpen("overdue")}
            onToggle={() => toggleGroupOpen("overdue")}
          >
            {renderTaskRows(getGroupItems("overdue", overdueTasks))}
          </TaskGroup>

          <TaskGroup
            title="Due Today"
            count={dueTodayTasks.length}
            tone="text-orange-500"
            footer={getGroupFooter("dueToday", dueTodayTasks, "due today", "text-orange-500")}
            isOpen={isGroupOpen("dueToday")}
            onToggle={() => toggleGroupOpen("dueToday")}
          >
            {renderTaskRows(getGroupItems("dueToday", dueTodayTasks))}
          </TaskGroup>

          <TaskGroup
            title="Upcoming"
            count={upcomingTasks.length}
            tone="text-slate-700"
            footer={getGroupFooter("upcoming", upcomingTasks, "upcoming", "text-pink-600")}
            isOpen={isGroupOpen("upcoming")}
            onToggle={() => toggleGroupOpen("upcoming")}
          >
            {renderTaskRows(getGroupItems("upcoming", upcomingTasks))}
          </TaskGroup>

          <TaskGroup
            title="Completed"
            count={completedTasks.length}
            tone="text-emerald-600"
            footer={getGroupFooter("completed", completedTasks, "completed", "text-emerald-600")}
            isOpen={isGroupOpen("completed")}
            onToggle={() => toggleGroupOpen("completed")}
          >
            {renderTaskRows(getGroupItems("completed", completedTasks))}
          </TaskGroup>
        </>
      )}
      <ConfirmDialog
        confirmLabel={confirmAction?.confirmLabel}
        icon={confirmAction?.icon}
        isOpen={Boolean(confirmAction)}
        message={confirmAction?.message}
        onCancel={closeConfirm}
        onConfirm={confirmCurrentAction}
        title={confirmAction?.title}
      />
    </div>
  );
};

export default EmpTask;
