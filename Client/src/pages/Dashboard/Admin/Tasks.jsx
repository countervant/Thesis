import { useEffect, useMemo, useState } from "react";
import done from "../../../assets/done.png";
import notification from "../../../assets/notification.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import taskIcon from "../../../assets/task.png";
import { getApiErrorMessage, taskAPI } from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { TaskListSkeleton } from "../../../components/Skeleton.jsx";

const taskStatuses = ["All", "In progress", "Pending", "In review","Done"];
const pageSizeOptions = [10, 20, 50];
const notificationTargetKey = "clientraNotificationTarget";
const statusFromApi = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  review: "In review",
};

const formatInputDate = (date) => date.toISOString().slice(0, 10);

const toInputDate = (date) => {
  if (!date) return formatInputDate(new Date());
  const dateValue = String(date);
  if (dateValue.includes("-")) return dateValue.slice(0, 10);
  const [month, day, year] = dateValue.split("/");
  if (!month || !day || !year) return formatInputDate(new Date());
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const toDisplayDate = (date) => {
  if (!date) return "";
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return "";
  return `${month}/${day}/${year}`;
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const formatReadableDate = (date) => {
  const inputDate = toInputDate(date);
  const parsedDate = new Date(`${inputDate}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date || "";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getStatusTone = (status) => {
  if (status === "Done") return "bg-[#eafbed] text-[#28b84c]";
  if (status === "Pending") return "bg-[#ffeaf5] text-[#e347a8]";
  if (status === "In review") return "bg-[#fff0e5] text-[#ff8317]";
  return "bg-[#f0e9ff] text-[#754de8]";
};

const toneStyles = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  orange: "bg-orange-50 text-orange-600 ring-orange-100",
  pink: "bg-pink-50 text-pink-600 ring-pink-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
};

const priorityStyles = {
  high: "bg-pink-50 text-pink-600",
  medium: "bg-orange-50 text-orange-600",
  low: "bg-emerald-50 text-emerald-600",
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

const statusProgress = {
  Pending: 0,
  "In progress": 50,
  "In review": 75,
  Done: 100,
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

const getTaskProgress = (subtasks, status) => {
  if (!subtasks.length) return statusProgress[status] ?? 0;

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
};

const statusDots = {
  Pending: "bg-orange-500",
  "In progress": "bg-blue-500",
  "In review": "bg-violet-500",
  Done: "bg-emerald-500",
};

const normalizeTasks = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeTask = (task) => {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const status = statusFromApi[task?.status] || task?.status || "Pending";

  return {
    id: task?._id || task?.id || "",
    title: task?.title || "Untitled task",
    description: task?.description || "",
    startDate: toDisplayDate(String(task?.startDate || task?.createdAt || task?.dueDate || "").slice(0, 10)),
    dueDate: toDisplayDate(String(task?.dueDate || "").slice(0, 10)),
    status,
    priority: task?.priority || "medium",
    assignedTo: task?.assignedTo,
    subtasks,
    progress: getTaskProgress(subtasks, status),
  };
};

const getDateStatus = (dueDate) => {
  const today = new Date();
  const due = new Date(toInputDate(dueDate));
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDifference = (dueStart - todayStart) / 86400000;

  if (dayDifference < 0) return "Overdue";
  if (dayDifference === 0) return "Today";
  if (dayDifference <= 7) return "Week";
  return "Upcoming";
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "dashboard") {
    return (
      <svg {...commonProps}>
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg {...commonProps}>
        <path
          d="M8 4h8l1 3H7l1-3zM6 7h12v13H6zM9 12l1.5 1.5L14 10M9 17h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "budget") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 3v9l7 4M5.8 18.5 12 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "client" || name === "employee") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M12.5 18.5c.6-2.4 2.1-3.7 4.4-3.7 2.4 0 3.9 1.3 4.4 3.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg {...commonProps}>
        <path
          d="M4 5h16l-6.2 7.2v5.3L10.2 19v-6.8L4 5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...commonProps}>
        <path
          d="M7 3v4M17 3v4M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...commonProps}>
        <path
          d="m14.7 5.3 4 4M4 20l4.4-1 10.2-10.2a2.8 2.8 0 0 0-4-4L4.4 15 4 20z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "delete") {
    return (
      <svg {...commonProps}>
        <path
          d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...commonProps}>
        <path
          d="M9 5H5v14h4M15 8l4 4-4 4M19 12H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
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
  if (name === "chevron") return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "list") return <svg {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "board") return <svg {...props}><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M9 5v14M15 5v14" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "edit") return <svg {...props}><path d="M5 19h4l9.4-9.4a2.1 2.1 0 0 0-3-3L6 16v3zM13.8 8.2l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "delete") return <svg {...props}><path d="M5 7h14M10 11v5M14 11v5M8 7l1-3h6l1 3M7 7l.8 13h8.4L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const SelectControl = ({ label, onChange, options, value }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-black text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
);

const TaskRow = ({ isExpanded, isFocused, item, onDelete, onEdit, onToggleExpand, onToggleSubtask }) => {
  const progressValue = item.progress ?? getTaskProgress(item.subtasks, item.status);
  const completedSubtasks = item.subtasks.filter((subtask) => subtask.completed).length;

  return (
    <article
      id={`task-card-${item.id}`}
      className={`border-b border-pink-50 px-4 py-4 last:border-b-0 ${
        isFocused ? "bg-pink-50/60 ring-2 ring-inset ring-pink-200" : ""
      }`}
    >
      <div className="grid gap-4 lg:grid-cols-[28px_1.35fr_100px_130px_150px_112px_72px] lg:items-center">
        <button
          type="button"
          onClick={() => onToggleExpand(item.id)}
          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Hide" : "Show"} subtasks for ${item.title}`}
        >
          <span className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
            <SmallIcon name="chevron" />
          </span>
        </button>
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-1.5 h-3 w-1 rounded-full ${statusDots[item.status] || "bg-pink-500"}`} />
          <span className="min-w-0">
            <p className="truncate text-sm font-black text-[#10142d]">{item.title}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-500">{item.description || "No description"}</p>
          </span>
        </div>
        <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority] || priorityStyles.medium}`}>
          {item.priority}
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <SmallIcon name="calendar" className="h-4 w-4 text-slate-500" />
          {formatReadableDate(item.dueDate)}
        </span>
        <span>
          <span className="mb-1 block text-xs font-black text-[#10142d]">{progressValue}%</span>
          <span className="block h-2 rounded-full bg-slate-100">
            <span className={`block h-2 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} style={{ width: `${progressValue}%` }} />
          </span>
        </span>
        <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${statusStyles[item.status] || getStatusTone(item.status)}`}>
          {item.status}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
            <SmallIcon name="edit" />
          </button>
          <button type="button" onClick={() => onDelete(item)} className="grid h-8 w-8 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
            <SmallIcon name="delete" />
          </button>
        </span>
      </div>

      {isExpanded && (
        <div className="mt-4 rounded-xl border border-pink-50 bg-pink-50/30 px-4 py-3 lg:ml-11">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Subtasks</p>
            <p className="text-[11px] font-black text-slate-500">
              {item.subtasks.length > 0
                ? `${completedSubtasks} of ${item.subtasks.length} completed`
                : "No subtasks yet"}
            </p>
          </div>
          {item.subtasks.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {item.subtasks.map((subtask, index) => (
                <label key={subtask.id || `${item.id}-${index}`} className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => onToggleSubtask(item, index)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#e347a8]"
                  />
                  <span className={subtask.completed ? "truncate text-slate-400 line-through" : "truncate"}>
                    {subtask.title}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-400">Add subtasks by editing this task.</p>
          )}
        </div>
      )}
    </article>
  );
};

const TaskGroup = ({ children, count, footer, title, tone }) => (
  <Card className="overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4">
      <span className={`text-lg font-black ${tone}`}>{">"}</span>
      <h2 className={`text-sm font-black ${tone}`}>{title}</h2>
      <span className="text-sm font-black text-slate-400">({count})</span>
    </div>
    <div className="mx-5 overflow-hidden rounded-2xl border border-pink-50 bg-white">
      {children}
    </div>
    {footer && <div className="py-4 text-center">{footer}</div>}
  </Card>
);

const Tasks = ({
  onEditTask,
  onNavigate,
  refreshKey = 0,
}) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Due Date");
  const [viewMode, setViewMode] = useState("List");
  const [confirmAction, setConfirmAction] = useState(null);
  const [focusedTaskId, setFocusedTaskId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await taskAPI.getAll();
        if (isMounted) {
          setTasks(normalizeTasks(data).map(normalizeTask));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, "Unable to load tasks."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const focusTarget = () => {
      const rawTarget = sessionStorage.getItem(notificationTargetKey);
      if (!rawTarget) return;

      try {
        const target = JSON.parse(rawTarget);
        if (target?.page !== "tasks" || !target?.taskId) return;

        setSelectedTaskStatus("All");
        setFocusedTaskId(target.taskId);

        window.setTimeout(() => {
          document.getElementById(`task-card-${target.taskId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          sessionStorage.removeItem(notificationTargetKey);
        }, 160);
      } catch {
        sessionStorage.removeItem(notificationTargetKey);
      }
    };

    if (!isLoading) {
      focusTarget();
    }

    window.addEventListener("clientra:notification-target", focusTarget);
    return () => window.removeEventListener("clientra:notification-target", focusTarget);
  }, [isLoading, tasks]);

  const visibleTasks = useMemo(() => {
    const filteredTasks = tasks.filter((task) => {
      const matchesTaskStatus =
        selectedTaskStatus === "All" || task.status === selectedTaskStatus;
      const matchesPriority =
        selectedPriority === "All" || task.priority === selectedPriority.toLowerCase();
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.description.toLowerCase().includes(normalizedSearch);

      return matchesTaskStatus && matchesPriority && matchesSearch;
    });

    return [...filteredTasks].sort((firstTask, secondTask) => {
      if (sortBy === "Priority") {
        const priorityRank = { high: 0, medium: 1, low: 2 };
        return (priorityRank[firstTask.priority] ?? 3) - (priorityRank[secondTask.priority] ?? 3);
      }

      if (sortBy === "Status") {
        return firstTask.status.localeCompare(secondTask.status);
      }

      return new Date(toInputDate(firstTask.dueDate)) - new Date(toInputDate(secondTask.dueDate));
    });
  }, [searchQuery, selectedPriority, selectedTaskStatus, sortBy, tasks]);

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPriority, selectedTaskStatus, pageSize, sortBy]);

  const dueTodayTasks = visibleTasks.filter((task) => getDateStatus(task.dueDate) === "Today" && task.status !== "Done");
  const overdueTasks = visibleTasks.filter((task) => getDateStatus(task.dueDate) === "Overdue" && task.status !== "Done");
  const upcomingTasks = visibleTasks.filter((task) => {
    const dateStatus = getDateStatus(task.dueDate);
    return (dateStatus === "Week" || dateStatus === "Upcoming") && task.status !== "Done";
  });
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
      return (
        <p className="px-4 py-5 text-center text-sm font-bold text-slate-500">
          No tasks found.
        </p>
      );
    }

    return items.map((task) => (
      <TaskRow
        key={task.id}
        isExpanded={expandedTaskIds.has(task.id)}
        isFocused={focusedTaskId === task.id}
        item={task}
        onDelete={requestDeleteTask}
        onEdit={handleEditTask}
        onToggleExpand={handleToggleExpand}
        onToggleSubtask={handleToggleSubtask}
      />
    ));
  };

  const handleAddTask = () => {
    onNavigate?.("add-task");
  };

  const handleEditTask = (task) => {
    onEditTask?.(task);
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

  const handleToggleSubtask = async (task, subtaskIndex) => {
    const nextSubtasks = task.subtasks.map((subtask, index) =>
      index === subtaskIndex
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );

    try {
      setErrorMessage("");
      const updatedTask = await taskAPI.update(task.id, {
        title: task.title,
        description: task.description,
        startDate: toInputDate(task.startDate),
        dueDate: toInputDate(task.dueDate),
        priority: task.priority,
        assignedTo: getEntityId(task.assignedTo),
        subtasks: nextSubtasks,
      });

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? normalizeTask(updatedTask) : currentTask
        )
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update subtask.");
    }
  };

  const handleDeleteTask = async (task) => {
    try {
      setErrorMessage("");
      await taskAPI.delete(task.id);
      setTasks((currentTasks) =>
        currentTasks.filter((currentTask) => currentTask.id !== task.id)
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete task.");
    }
  };

  const requestDeleteTask = (task) => {
    setConfirmAction({
      icon: "delete",
      title: "Delete",
      message: `Delete task "${task.title}"?`,
      confirmLabel: "Yes , delete",
      onConfirm: () => handleDeleteTask(task),
    });
  };

  const closeConfirm = () => setConfirmAction(null);

  const confirmCurrentAction = async () => {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    await action.onConfirm();
  };

  return (
        <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#111936] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1
                className="text-4xl uppercase leading-none text-neutral-950 dark:text-white"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Tasks
              </h1>
              <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Assign and manage your tasks efficiently.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-[#db4ab5] to-[#f06ac8] px-5 text-sm font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105"
              >
                <SmallIcon name="plus" className="h-5 w-5" />
                <span>Add Task</span>
              </button>
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
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold outline-none placeholder:text-slate-400 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                />
              </label>
              <SelectControl label="Status" onChange={setSelectedTaskStatus} options={taskStatuses} value={selectedTaskStatus} />
              <SelectControl label="Priority" onChange={setSelectedPriority} options={["All", "High", "Medium", "Low"]} value={selectedPriority} />
              <SelectControl label="Sort by" onChange={setSortBy} options={["Due Date", "Priority", "Status"]} value={sortBy} />
              <div className="flex rounded-2xl bg-pink-50 p-1">
                {["List", "Board"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setViewMode(item)}
                    className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black ${
                      viewMode === item ? "bg-white text-pink-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    <SmallIcon name={item === "List" ? "list" : "board"} />
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <section className="space-y-5">
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {errorMessage}
              </p>
            )}

            {isLoading && (
              <TaskListSkeleton rows={5} />
            )}

            {!isLoading && (
              <>
                <TaskGroup
                  count={overdueTasks.length}
                  footer={overdueTasks.length > 0 && <button type="button" className="text-sm font-black text-rose-500">View all overdue ({overdueTasks.length})</button>}
                  title="Overdue"
                  tone="text-rose-500"
                >
                  {renderTaskRows(overdueTasks)}
                </TaskGroup>

                <TaskGroup
                  count={dueTodayTasks.length}
                  footer={dueTodayTasks.length > 0 && <button type="button" className="text-sm font-black text-orange-500">View all due today ({dueTodayTasks.length})</button>}
                  title="Due Today"
                  tone="text-orange-500"
                >
                  {renderTaskRows(dueTodayTasks)}
                </TaskGroup>

                <TaskGroup
                  count={upcomingTasks.length}
                  footer={upcomingTasks.length > 0 && <button type="button" className="text-sm font-black text-pink-600">View all upcoming ({upcomingTasks.length})</button>}
                  title="Upcoming"
                  tone="text-slate-700"
                >
                  {renderTaskRows(upcomingTasks.slice(0, pageSize))}
                </TaskGroup>

                <TaskGroup
                  count={completedTasks.length}
                  title="Completed"
                  tone="text-emerald-600"
                >
                  {renderTaskRows(completedTasks.slice(0, pageSize))}
                </TaskGroup>
              </>
            )}
          </section>

          {!isLoading && visibleTasks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="grid h-9 w-9 place-items-center rounded-lg border border-pink-100 bg-white text-[#c72fb2] shadow-[0_3px_4px_rgba(190,65,158,0.18)] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Previous page"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.25)]">
                {safePage}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                className="grid h-9 w-9 place-items-center rounded-lg border border-pink-100 bg-white text-[#c72fb2] shadow-[0_3px_4px_rgba(190,65,158,0.18)] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Next page"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <path d="m8 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <label className="flex items-center gap-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-9 rounded-lg border border-pink-100 bg-white px-3 text-xs font-semibold text-neutral-900 shadow-[0_3px_4px_rgba(190,65,158,0.12)] outline-none focus:border-[#db4ab5] dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span>per page</span>
              </label>
            </div>
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

export default Tasks;
