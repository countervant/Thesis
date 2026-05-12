import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { taskAPI } from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { TaskListSkeleton } from "../../../components/Skeleton.jsx";

const taskStatuses = ["All", "In progress", "Pending", "In review","Done"];
const dateStatuses = ["All", "Today", "Week", "Overdue"];
const pageSizeOptions = [10, 20, 50];
const notificationTargetKey = "clientraNotificationTarget";
const statusToApi = {
  Pending: "pending",
  "In progress": "in_progress",
  Done: "done",
  "In review": "review",
};
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
  if (status === "Done") return "bg-pink-100 text-[#c72fb2]";
  if (status === "Pending") return "bg-pink-100 text-[#c72fb2]";
  if (status === "In review") return "bg-pink-50 text-[#c72fb2]";
  return "bg-pink-100 text-[#c72fb2]";
};

const normalizeTasks = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeTask = (task) => ({
  id: task?._id || task?.id || "",
  title: task?.title || "Untitled task",
  description: task?.description || "",
  startDate: toDisplayDate(String(task?.startDate || task?.createdAt || task?.dueDate || "").slice(0, 10)),
  dueDate: toDisplayDate(String(task?.dueDate || "").slice(0, 10)),
  status: statusFromApi[task?.status] || task?.status || "Pending",
  priority: task?.priority || "medium",
  assignedTo: task?.assignedTo,
});

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

const FilterChip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-10 rounded-lg px-5 text-sm font-semibold shadow-[0_3px_8px_rgba(219,74,181,0.13)] transition ${
      active
        ? "bg-[#db4ab5] text-white"
        : "bg-white text-neutral-700 hover:bg-pink-50 hover:text-[#c72fb2] dark:bg-[#1a1a1a] dark:text-neutral-300 dark:hover:bg-[#242424] dark:hover:text-[#e347b3]"
    }`}
  >
    {children}
  </button>
);

const FilterGroup = ({ icon, label, options, selected, onSelect }) => (
  <div className="min-w-0 flex-1">
    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
      <Icon name={icon} className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
      <span>{label}</span>
    </div>
    <div className="flex flex-wrap gap-3">
      {options.map((status) => (
        <FilterChip
          key={status}
          active={selected === status}
          onClick={() => onSelect(status)}
        >
          {status}
        </FilterChip>
      ))}
    </div>
  </div>
);

const TaskCard = ({
  canToggleDone,
  isFocused,
  onDelete,
  onEdit,
  onToggleDone,
  showStatus,
  task,
}) => (
  <article
    id={`task-card-${task.id}`}
    className={`group flex min-h-[132px] items-center gap-4 rounded-xl border border-pink-100 border-l-[#f2a8dc] border-l-2 bg-white px-6 py-5 shadow-[0_3px_4px_rgba(190,65,158,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_7px_16px_rgba(190,65,158,0.22)] dark:bg-[#141414] dark:shadow-none sm:px-7 ${
      isFocused ? "ring-2 ring-pink-300 dark:ring-[#dc4fb2]" : "ring-pink-50 dark:ring-neutral-800"
    }`}
  >
    {canToggleDone && (
      <button
        type="button"
        onClick={() => onToggleDone(task.id)}
        disabled={task.status === "Done"}
        className={`h-5 w-5 shrink-0 rounded-full border transition ${
          task.status === "Done"
            ? "cursor-not-allowed border-[#c72fb2] bg-[#c72fb2]"
            : "border-neutral-400 bg-white hover:border-[#c72fb2] dark:border-neutral-500 dark:bg-transparent"
        }`}
        aria-label={
          task.status === "Done"
            ? `${task.title} is already complete`
            : `Mark ${task.title} complete`
        }
      />
    )}

    <div className="min-w-0 flex-1">
      <h2 className="truncate text-xl font-bold text-neutral-950 dark:text-neutral-100">
        {task.title}
      </h2>
      <p className="mt-3 text-base font-medium text-neutral-700 dark:text-neutral-400">{task.description}</p>
      <p className="mt-4 flex items-center gap-2 text-base font-medium text-neutral-600 dark:text-neutral-400">
        <Icon name="calendar" className="h-5 w-5 text-[#c72fb2]" />
        {formatReadableDate(task.startDate)} - {formatReadableDate(task.dueDate)}
      </p>
    </div>

    {showStatus && (
      <span className={`hidden min-w-[135px] items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-bold md:inline-flex ${getStatusTone(task.status)}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
        {task.status}
      </span>
    )}

    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="grid h-9 w-9 place-items-center rounded-md text-neutral-900 transition hover:bg-pink-50 hover:text-[#c72fb2] dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label={`Edit ${task.title}`}
      >
        <Icon name="edit" className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(task)}
        className="grid h-9 w-9 place-items-center rounded-md text-neutral-900 transition hover:bg-red-50 hover:text-red-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label={`Delete ${task.title}`}
      >
        <Icon name="delete" className="h-5 w-5" />
      </button>
    </div>
  </article>
);

const Tasks = ({
  onEditTask,
  onNavigate,
  refreshKey = 0,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("All");
  const [selectedDateStatus, setSelectedDateStatus] = useState("All");
  const [confirmAction, setConfirmAction] = useState(null);
  const [focusedTaskId, setFocusedTaskId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
          setErrorMessage(error.response?.data?.message || "Unable to load tasks.");
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
        setSelectedDateStatus("All");
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
    return tasks.filter((task) => {
      const matchesTaskStatus =
        selectedTaskStatus === "All" || task.status === selectedTaskStatus;
      const matchesDateStatus =
        selectedDateStatus === "All" || getDateStatus(task.dueDate) === selectedDateStatus;

      return matchesTaskStatus && matchesDateStatus;
    });
  }, [selectedDateStatus, selectedTaskStatus, tasks]);

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTasks = visibleTasks.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDateStatus, selectedTaskStatus, pageSize]);

  const handleAddTask = () => {
    onNavigate?.("add-task");
  };

  const handleEditTask = (task) => {
    onEditTask?.(task);
  };

  const completeTask = async (task) => {
    if (!task) return;
    if (getEntityId(task.assignedTo) !== getEntityId(user)) return;
    if (task.status === "Done") return;

    try {
      setErrorMessage("");
      const updatedTask = await taskAPI.update(task.id, {
        title: task.title,
        description: task.description,
        startDate: toInputDate(task.startDate),
        dueDate: toInputDate(task.dueDate),
        status: statusToApi.Done,
      });

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? normalizeTask(updatedTask) : currentTask
        )
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update task.");
    }
  };

  const handleToggleDone = (taskId) => {
    const task = tasks.find((currentTask) => currentTask.id === taskId);
    if (!task) return;
    setConfirmAction({
      icon: "done",
      title: "Done",
      message: `Mark "${task.title}" as done?`,
      confirmLabel: "Yes , mark done",
      onConfirm: () => completeTask(task),
    });
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
        <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="text-4xl uppercase leading-none text-neutral-950 dark:text-white"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Tasks
              </h1>
              <p className="mt-4 text-base font-medium text-neutral-600 dark:text-neutral-400">
                Assign and manage your tasks efficiently.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-14 items-center gap-3 rounded-lg bg-linear-to-r from-[#db4ab5] to-[#f06ac8] px-7 text-base font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105"
              >
                <Icon className="h-5 w-5" />
                <span>Add Task</span>
              </button>
            </div>
          </header>

          <section className="mt-9 grid gap-8 rounded-xl border border-pink-100 bg-white px-8 py-7 shadow-[0_3px_4px_rgba(190,65,158,0.18)] dark:border-neutral-800 dark:bg-[#141414] md:grid-cols-[1fr_1px_1fr]">
            <FilterGroup
              icon="filter"
              label="Filter by status"
              onSelect={setSelectedTaskStatus}
              options={taskStatuses}
              selected={selectedTaskStatus}
            />

            <span className="hidden h-full bg-pink-100 dark:bg-neutral-800 md:block" />

            <FilterGroup
              icon="calendar"
              label="Filter by due date"
              onSelect={setSelectedDateStatus}
              options={dateStatuses}
              selected={selectedDateStatus}
            />
          </section>

          <section className="mt-5 space-y-4">
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {errorMessage}
              </p>
            )}

            {isLoading && (
              <TaskListSkeleton rows={5} />
            )}

            {!isLoading && visibleTasks.length === 0 && (
              <p className="rounded-md bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-[0_3px_4px_rgba(190,65,158,0.2)] dark:bg-[#141414] dark:text-neutral-300 dark:shadow-none dark:ring-1 dark:ring-neutral-800">
                No tasks found.
              </p>
            )}

            {!isLoading && paginatedTasks.map((task) => (
              <TaskCard
                key={task.id}
                canToggleDone={getEntityId(task.assignedTo) === getEntityId(user)}
                isFocused={focusedTaskId === task.id}
                onDelete={requestDeleteTask}
                onEdit={handleEditTask}
                onToggleDone={handleToggleDone}
                showStatus={selectedTaskStatus === "All"}
                task={task}
              />
            ))}
          </section>

          {!isLoading && visibleTasks.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="grid h-11 w-11 place-items-center rounded-lg border border-pink-100 bg-white text-[#c72fb2] shadow-[0_3px_4px_rgba(190,65,158,0.18)] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Previous page"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <span className="grid h-11 min-w-11 place-items-center rounded-lg bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-4 text-base font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.25)]">
                {safePage}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                className="grid h-11 w-11 place-items-center rounded-lg border border-pink-100 bg-white text-[#c72fb2] shadow-[0_3px_4px_rgba(190,65,158,0.18)] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-45"
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
                  className="h-11 rounded-lg border border-pink-100 bg-white px-4 text-sm font-semibold text-neutral-900 shadow-[0_3px_4px_rgba(190,65,158,0.12)] outline-none focus:border-[#db4ab5] dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
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
