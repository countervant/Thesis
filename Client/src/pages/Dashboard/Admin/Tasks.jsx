import { useEffect, useMemo, useState } from "react";
import done from "../../../assets/done.png";
import notification from "../../../assets/notification.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import taskIcon from "../../../assets/task.png";
import InitialsAvatar from "../../../components/InitialsAvatar.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { getApiErrorMessage, taskAPI } from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { TaskListSkeleton } from "../../../components/Skeleton.jsx";

const taskStatuses = ["All", "In progress", "Pending", "In review","Done"];
const notificationTargetKey = "clientraNotificationTarget";
const groupPreviewLimit = 5;
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

const getPersonName = (person) => {
  if (!person) return "Unassigned";
  if (typeof person === "string") return "Assigned user";
  return (
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    person.email ||
    person.name ||
    "Assigned user"
  );
};

const getClientName = (task) => {
  if (task?.requestedByName) return task.requestedByName;
  if (task?.requestedBy) return getPersonName(task.requestedBy);
  return getPersonName(task?.createdBy);
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
  blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:!bg-[#1a1a1a] dark:text-blue-400 dark:ring-blue-500",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:!bg-[#1a1a1a] dark:text-emerald-400 dark:ring-emerald-500",
  orange: "bg-orange-50 text-orange-600 ring-orange-100 dark:!bg-[#1a1a1a] dark:text-orange-400 dark:ring-orange-500",
  pink: "bg-pink-50 text-pink-600 ring-pink-100 dark:!bg-[#1a1a1a] dark:text-pink-400 dark:ring-[#c72fb2]",
  rose: "bg-red-50 text-red-600 ring-red-100 dark:!bg-[#1a1a1a] dark:text-red-400 dark:ring-red-500",
};

const statCardStyles = {
  blue: "!border-[#754de8]/45 border-b-2 !border-b-[#754de8] ring-1 !ring-[#754de8]/20 dark:!border-[#754de8] dark:!border-b-[#754de8] dark:!ring-[#754de8]/45",
  green: "!border-[#28b84c]/45 border-b-2 !border-b-[#28b84c] ring-1 !ring-[#28b84c]/20 dark:!border-[#28b84c] dark:!border-b-[#28b84c] dark:!ring-[#28b84c]/45",
  orange: "!border-[#ff8317]/45 border-b-2 !border-b-[#ff8317] ring-1 !ring-[#ff8317]/20 dark:!border-[#ff8317] dark:!border-b-[#ff8317] dark:!ring-[#ff8317]/45",
  pink: "!border-[#e347a8]/45 border-b-2 !border-b-[#e347a8] ring-1 !ring-[#e347a8]/20 dark:!border-[#e347a8] dark:!border-b-[#e347a8] dark:!ring-[#e347a8]/45",
  rose: "!border-[#dc2626]/45 border-b-2 !border-b-[#dc2626] ring-1 !ring-[#dc2626]/20 dark:!border-[#dc2626] dark:!border-b-[#dc2626] dark:!ring-[#dc2626]/45",
};

const priorityStyles = {
  high: "border border-pink-600 bg-transparent text-pink-600",
  medium: "border border-orange-600 bg-transparent text-orange-600",
  low: "border border-emerald-600 bg-transparent text-emerald-600",
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

const normalizeTasks = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const isMobileViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

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
    createdBy: task?.createdBy,
    requestedBy: task?.requestedBy,
    requestedByName: task?.requestedByName || "",
    subtasks,
    progress: getTaskProgress(subtasks),
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
  if (name === "filter") return <svg {...props}><path d="M4 5h16l-6.2 7.2v5.3L10.2 19v-6.8L4 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "chevron") return <svg {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "list") return <svg {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "board") return <svg {...props}><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M9 5v14M15 5v14" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "edit") return <svg {...props}><path d="M5 19h4l9.4-9.4a2.1 2.1 0 0 0-3-3L6 16v3zM13.8 8.2l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "delete") return <svg {...props}><path d="M5 7h14M10 11v5M14 11v5M8 7l1-3h6l1 3M7 7l.8 13h8.4L17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...props}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "send") return <svg {...props}><path d="m20 4-8 16-2-7-6-3 16-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "upload") return <svg {...props}><path d="M12 16V5M8 9l4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const SelectControl = ({ label, onChange, options, value }) => (
  <label className="block">
    <span className="mb-1 block text-[9px] font-black text-slate-500 md:text-[10px]">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-black text-[#10142d] outline-none focus:border-pink-200 focus:ring-2 focus:ring-pink-100 md:px-3 md:text-sm"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
);

const TaskRow = ({ accentClass = "bg-pink-500", canAccessSubtasks, isExpanded, isFocused, item, onDelete, onEdit, onToggleExpand, onToggleSubtask }) => {
  const effectiveExpanded = canAccessSubtasks && isExpanded;
  const progressValue = item.progress ?? getTaskProgress(item.subtasks);
  const completedSubtasks = item.subtasks.filter((subtask) => subtask.completed).length;
  const isDone = item.status === "Done";
  const progressSummary =
    item.subtasks.length > 0
      ? `${completedSubtasks} of ${item.subtasks.length} subtasks completed`
      : "No subtasks yet";

  return (
    <article
      id={`task-card-${item.id}`}
      className={`rounded-xl border border-pink-50 bg-white px-3 py-3 shadow-sm md:rounded-none md:border-x-0 md:border-t-0 md:px-4 md:py-4 md:shadow-none md:last:border-b-0 ${
        isFocused ? "bg-pink-50/60 ring-2 ring-inset ring-pink-200" : ""
      }`}
    >
      {effectiveExpanded ? (
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
              <p className="text-xs font-bold text-slate-400">Add subtasks by editing this task.</p>
            )}
          </div>

          <div className="lg:border-r lg:border-pink-50 lg:pr-5">
            <p className="mb-5 text-[10px] font-black text-slate-500">Priority</p>
            <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority] || priorityStyles.medium}`}>
              {item.priority}
            </span>
          </div>

          <div className="lg:border-r lg:border-pink-50 lg:pr-5">
            <p className="mb-5 text-[10px] font-black text-slate-500">Due Date</p>
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <SmallIcon name="calendar" className="h-4 w-4 text-slate-500" />
              {formatReadableDate(item.dueDate)}
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
            <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${statusStyles[item.status] || getStatusTone(item.status)}`}>
              {item.status}
            </span>
          </div>

          <span className="flex items-center gap-1 lg:justify-end lg:pt-8">
            <button type="button" onClick={() => onEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
              <SmallIcon name="edit" />
            </button>
            <button type="button" onClick={() => onDelete(item)} className="grid h-8 w-8 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
              <SmallIcon name="delete" />
            </button>
          </span>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-[1fr_43%] gap-3 md:hidden">
          <div className="flex min-w-0 gap-3">
            <span className={`min-h-28 w-1 shrink-0 rounded-full ${accentClass}`} />
            <div className="min-w-0 py-0.5">
              <p className="truncate text-[13px] font-black leading-tight text-[#10142d]">{item.title}</p>
              <p className="mt-1 truncate text-[11px] font-bold text-slate-500">{item.description || "No description"}</p>
              <p className="mt-4 text-[10px] font-black text-slate-500">Assigned to</p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <InitialsAvatar
                  className="h-7 w-7"
                  textClassName="text-[9px]"
                  user={item.assignedTo}
                />
                <span className="min-w-0 truncate text-[11px] font-black text-[#10142d]">
                  {getPersonName(item.assignedTo)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-2">
              <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black capitalize ${priorityStyles[item.priority] || priorityStyles.medium}`}>
                {item.priority}
              </span>
              <button
                type="button"
                onClick={canAccessSubtasks ? () => onToggleExpand(item.id) : undefined}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
                aria-label={canAccessSubtasks ? `Show subtasks for ${item.title}` : `More options for ${item.title}`}
              >
                <SmallIcon className="h-4 w-4" />
              </button>
            </div>

            <span className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <SmallIcon name="calendar" className="h-3.5 w-3.5 text-slate-500" />
              {formatReadableDate(item.dueDate)}
            </span>

            <span className="mt-3">
              <span className="mb-1 block text-[11px] font-black text-[#10142d]">{progressValue}%</span>
              <span className="block h-1.5 rounded-full bg-slate-100">
                <span className={`block h-1.5 rounded-full ${progressColors[item.status] || "bg-pink-500"}`} style={{ width: `${progressValue}%` }} />
              </span>
            </span>

            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${statusStyles[item.status] || getStatusTone(item.status)}`}>
                {item.status}
              </span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => onEdit(item)} className="grid h-7 w-7 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
                  <SmallIcon name="edit" className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onDelete(item)} className="grid h-7 w-7 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
                  <SmallIcon name="delete" className="h-4 w-4" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className={`hidden gap-3 md:grid md:gap-4 ${
          canAccessSubtasks
            ? "lg:grid-cols-[28px_1.35fr_100px_130px_150px_112px_72px]"
            : "lg:grid-cols-[1.2fr_1.25fr_100px_130px_150px_112px_72px]"
        } lg:items-center`}>
          {canAccessSubtasks && (
            <button
              type="button"
              onClick={() => onToggleExpand(item.id)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
              aria-expanded={effectiveExpanded}
              aria-label={`Show subtasks for ${item.title}`}
            >
              <span className="transition-transform">
                <SmallIcon name="chevron" />
              </span>
            </button>
          )}
          <div className={`flex min-w-0 items-start gap-3 ${!canAccessSubtasks ? "lg:border-r lg:border-pink-50 lg:pr-5" : ""}`}>
            <span className={`mt-1 h-16 w-1 shrink-0 rounded-full md:mt-1.5 md:h-8 ${accentClass}`} />
            <span className="min-w-0">
              <p className="truncate text-sm font-black text-[#10142d]">{item.title}</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">{item.description || "No description"}</p>
            </span>
          </div>
          {!canAccessSubtasks && (
            <div className="min-w-0 lg:border-r lg:border-pink-50 lg:pr-5">
              <p className="mb-2 text-[10px] font-black text-slate-500">Assigned to</p>
              <div className="flex min-w-0 items-center gap-3">
                <InitialsAvatar
                  className="h-11 w-11"
                  textClassName="text-xs"
                  user={item.assignedTo}
                />
                <span className="min-w-0 truncate text-sm font-black text-[#10142d]">
                  {getPersonName(item.assignedTo)}
                </span>
              </div>
            </div>
          )}
          <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black capitalize md:px-4 md:text-xs ${priorityStyles[item.priority] || priorityStyles.medium}`}>
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
          <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black md:px-4 md:text-xs ${statusStyles[item.status] || getStatusTone(item.status)}`}>
            {item.status}
          </span>
          <span className="flex items-center gap-1 justify-end lg:justify-start">
            <button type="button" onClick={() => onEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
              <SmallIcon name="edit" />
            </button>
            <button type="button" onClick={() => onDelete(item)} className="grid h-8 w-8 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
              <SmallIcon name="delete" />
            </button>
          </span>
        </div>
        </>
      )}
    </article>
  );
};

const TaskGroup = ({ children, count, footer, isOpen = true, onToggle, title, tone }) => (
  <Card className="overflow-hidden rounded-xl md:rounded-2xl">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3 py-3 text-left transition hover:bg-pink-50/60 md:gap-3 md:px-5 md:py-4"
      aria-expanded={isOpen}
    >
      <span className={`text-base font-black transition-transform md:text-lg ${tone} ${isOpen ? "rotate-90" : ""}`}>
        {">"}
      </span>
      <h2 className={`text-sm font-black ${tone}`}>{title}</h2>
      <span className="text-xs font-black text-slate-400 md:text-sm">({count})</span>
    </button>
    {isOpen && (
      <>
        <div className="mx-3 mb-3 space-y-3 overflow-hidden rounded-xl border-0 bg-transparent md:mx-5 md:mb-0 md:space-y-0 md:rounded-2xl md:border md:border-pink-50 md:bg-white">
          {children}
        </div>
        {footer && <div className="pb-4 pt-1 text-center md:py-4">{footer}</div>}
      </>
    )}
  </Card>
);

const CompletedTaskModal = ({ completion, onClose, onSubmit }) => {
  const [message, setMessage] = useState(`Hi, we've completed ${completion.task.title}. Please check the attached file and let us know your feedback.`);
  const [outputMethod, setOutputMethod] = useState("file");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const task = completion.task;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      file: outputMethod === "file" ? file : null,
      link,
      message,
      outputMethod,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 px-4 py-8 backdrop-blur-[2px]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl border border-pink-100 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-black text-[#10142d] dark:text-white">Submit Completed Task</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2]" aria-label="Close submit completed task">
            x
          </button>
        </div>

        <p className="mt-4 flex items-center gap-2 rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-[#c72fb2]">
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#c72fb2]">
            <SmallIcon name="check" className="h-3.5 w-3.5" />
          </span>
          You are about to submit this task for client review.
        </p>

        <div className="mt-4 rounded-xl border border-pink-100 bg-white p-4 text-xs font-bold text-slate-600 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="grid grid-cols-[90px_1fr] gap-3 py-1">
            <span className="text-slate-400">Task</span>
            <span className="font-black text-[#10142d] dark:text-white">{task.title}</span>
          </p>
          <p className="grid grid-cols-[90px_1fr] gap-3 py-1">
            <span className="text-slate-400">Project</span>
            <span className="font-black text-[#10142d] dark:text-white">{task.description || task.title}</span>
          </p>
          <p className="grid grid-cols-[90px_1fr] gap-3 py-1">
            <span className="text-slate-400">Client</span>
            <span className="font-black text-[#10142d] dark:text-white">{getClientName(task)}</span>
          </p>
          <p className="grid grid-cols-[90px_1fr] gap-3 py-1">
            <span className="text-slate-400">Due Date</span>
            <span className="font-black text-[#10142d] dark:text-white">{formatReadableDate(task.dueDate)}</span>
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <h3 className="text-sm font-black text-[#10142d] dark:text-white">1. Upload Final Output <span className="font-bold text-slate-500">(Choose one)</span></h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-pink-100 dark:border-neutral-800">
              <div className="grid grid-cols-2 border-b border-pink-100 text-xs font-black dark:border-neutral-800">
                <button type="button" onClick={() => setOutputMethod("file")} className={`h-10 ${outputMethod === "file" ? "border-b-2 border-[#c72fb2] text-[#c72fb2]" : "text-slate-500"}`}>
                  Upload File
                </button>
                <button type="button" onClick={() => setOutputMethod("link")} className={`h-10 ${outputMethod === "link" ? "border-b-2 border-[#c72fb2] text-[#c72fb2]" : "text-slate-500"}`}>
                  Paste Link
                </button>
              </div>
              {outputMethod === "file" ? (
                <div className="p-4">
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#c72fb2]/70 bg-pink-50/30 text-center transition hover:bg-pink-50">
                    <SmallIcon name="upload" className="h-7 w-7 text-[#c72fb2]" />
                    <span className="mt-2 text-sm font-black text-[#10142d] dark:text-white">Drag & drop your file here</span>
                    <span className="mt-1 text-xs font-bold text-slate-500">or click to browse</span>
                    <span className="mt-2 text-[11px] font-bold text-slate-400">Maximum file size: 10MB</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0] || null;
                        if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
                          setFile(null);
                          setFileError("File size must be 10MB or less.");
                          return;
                        }
                        setFile(selectedFile);
                        setFileError("");
                      }}
                    />
                  </label>
                  {fileError && <p className="mt-2 text-xs font-bold text-rose-600">{fileError}</p>}
                  {file && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-pink-100 bg-white px-4 py-3 text-xs font-bold text-[#10142d] dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                      <span className="inline-flex min-w-0 items-center gap-3">
                        <SmallIcon name="upload" className="h-5 w-5 text-[#c72fb2]" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button type="button" onClick={() => { setFile(null); setFileError(""); }} className="text-slate-400 hover:text-[#c72fb2]" aria-label="Remove file">x</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <input
                    type="url"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                  />
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black text-[#10142d] dark:text-white">2. Message to Client <span className="font-bold text-slate-500">(Optional)</span></h3>
            <label className="mt-3 block">
              <textarea
                maxLength={500}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10142d] outline-none transition focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
              <span className="mt-1 block text-right text-xs font-bold text-slate-400">{message.length}/500</span>
            </label>
          </section>

          <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-xs font-bold text-[#c72fb2]">
            What happens next? The client will be notified and can review, request revisions, or approve this task.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-8 text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.28)] transition hover:brightness-105">
            <SmallIcon name="send" />
            Submit to Client
          </button>
        </div>
      </form>
    </div>
  );
};

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
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Due Date");
  const [confirmAction, setConfirmAction] = useState(null);
  const [completionDraft, setCompletionDraft] = useState(null);
  const [focusedTaskId, setFocusedTaskId] = useState("");
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState(() =>
    isMobileViewport() ? { dueToday: true, upcoming: true, completed: true } : {}
  );
  const currentUserId = getEntityId(user);

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

  useEffect(() => {
    setExpandedGroups({});
    setCollapsedGroups({});
  }, [searchQuery, selectedPriority, selectedTaskStatus, sortBy]);

  const isOwnedByCurrentUser = (task) => {
    if (!currentUserId) return false;
    if (user?.role === "client") {
      return getEntityId(task.createdBy) === currentUserId;
    }
    return getEntityId(task.assignedTo) === currentUserId;
  };
  const myTasks = visibleTasks.filter(isOwnedByCurrentUser);
  const teamTasks = visibleTasks.filter((task) => !isOwnedByCurrentUser(task));
  const dueTodayTasks = teamTasks.filter((task) => getDateStatus(task.dueDate) === "Today" && task.status !== "Done");
  const overdueTasks = teamTasks.filter((task) => getDateStatus(task.dueDate) === "Overdue" && task.status !== "Done");
  const upcomingTasks = teamTasks.filter((task) => {
    const dateStatus = getDateStatus(task.dueDate);
    return (dateStatus === "Week" || dateStatus === "Upcoming") && task.status !== "Done";
  });
  const completedTasks = teamTasks.filter((task) => task.status === "Done");

  const taskStats = [
    { label: "Total Tasks", value: tasks.length, icon: taskIcon, tone: "pink" },
    { label: "Due Today", value: tasks.filter((task) => getDateStatus(task.dueDate) === "Today").length, icon: pendingrequest, tone: "orange" },
    { label: "In Progress", value: tasks.filter((task) => task.status === "In progress").length, icon: progress, tone: "blue" },
    { label: "Completed", value: tasks.filter((task) => task.status === "Done").length, icon: done, tone: "green" },
    { label: "Overdue", value: tasks.filter((task) => getDateStatus(task.dueDate) === "Overdue" && task.status !== "Done").length, icon: notification, tone: "rose" },
  ];

  const renderTaskRows = (items, accentClass = "bg-pink-500") => {
    if (items.length === 0) {
      return (
        <div className="grid min-h-24 place-items-center rounded-xl bg-white px-4 py-5 text-center md:rounded-none">
          <div>
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-pink-400">
              <SmallIcon name="list" className="h-5 w-5" />
            </span>
            <p className="mt-2 text-xs font-bold text-slate-500 md:text-sm">No tasks found.</p>
          </div>
        </div>
      );
    }

    return items.map((task) => (
      <TaskRow
        key={task.id}
        accentClass={accentClass}
        canAccessSubtasks={isOwnedByCurrentUser(task)}
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
        className={`inline-flex items-center gap-1 text-xs font-black md:text-sm ${toneClass}`}
      >
        {isExpanded ? "Show less" : `View all ${label} (${items.length})`}
        {!isExpanded && <SmallIcon name="chevron" className="h-3.5 w-3.5" />}
      </button>
    );
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

  const updateTaskSubtasks = async (task, nextSubtasks) => {
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

  const handleToggleSubtask = async (task, subtaskIndex) => {
    if (!isOwnedByCurrentUser(task) || task.status === "Done") {
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
      setCompletionDraft({ task, nextSubtasks });
      return;
    }

    await updateTaskSubtasks(task, nextSubtasks);
  };

  const submitCompletedTask = async (output) => {
    const draft = completionDraft;
    if (!draft) return;

    if (output.outputMethod === "file" && !output.file) {
      setErrorMessage("Please upload a file before submitting.");
      return;
    }

    if (output.outputMethod === "link" && !output.link.trim()) {
      setErrorMessage("Please paste a link before submitting.");
      return;
    }

    try {
      setErrorMessage("");
      const updatedTask = await taskAPI.submitOutput(draft.task.id, {
        ...output,
        subtasks: draft.nextSubtasks,
      });
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === draft.task.id ? normalizeTask(updatedTask) : currentTask
        )
      );
      setCompletionDraft(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit completed task."));
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
        <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-4 bg-[#f8f9fd] px-3 py-4 text-[#111936] md:-mx-6 md:space-y-5 md:px-6 md:py-5 lg:-mx-8 lg:px-8">
          <header className="flex items-center justify-between gap-3 md:flex-wrap md:gap-4">
            <div>
              <h1
                className="text-2xl uppercase leading-none text-neutral-950 dark:text-white md:text-4xl"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Tasks
              </h1>
              <p className="mt-2 hidden text-sm font-medium text-neutral-600 dark:text-neutral-400 md:block">
                Assign and manage your tasks efficiently.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-linear-to-r from-[#db4ab5] to-[#f06ac8] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105 md:h-11 md:gap-2 md:px-5 md:text-sm"
              >
                <SmallIcon name="plus" className="h-4 w-4 md:h-5 md:w-5" />
                <span>Create Task</span>
              </button>
            </div>
          </header>

          <div className="grid grid-cols-5 gap-2 md:gap-5 xl:grid-cols-5">
            {taskStats.map((item) => (
              <Card key={item.label} className={`min-w-0 p-2 !shadow-sm dark:!shadow-none md:p-5 ${statCardStyles[item.tone]}`}>
                <div className="flex min-w-0 flex-col items-center gap-1.5 text-center md:flex-row md:gap-4 md:text-left">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg md:h-16 md:w-16 md:rounded-2xl ${toneStyles[item.tone]}`}>
                    <ImageIcon src={item.icon} className="h-5 w-5 md:h-9 md:w-9" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black leading-none text-[#10142d] md:text-4xl">{item.value}</p>
                    <p className="mt-1 truncate text-[9px] font-black text-slate-600 md:text-sm">{item.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-3 md:p-5">
            <div className="grid gap-3 xl:grid-cols-[1.25fr_150px_150px_150px] xl:items-end">
              <div className="grid grid-cols-[1fr_44px] gap-2 xl:contents">
                <label className="relative block">
                  <span className="sr-only">Search tasks</span>
                  <SmallIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 md:left-4 md:h-5 md:w-5" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search tasks..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs font-bold outline-none placeholder:text-slate-400 focus:border-pink-200 focus:ring-2 focus:ring-pink-100 md:h-12 md:pl-12 md:pr-4 md:text-sm"
                  />
                </label>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 xl:hidden">
                  <SmallIcon name="filter" className="h-5 w-5" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 xl:contents">
                <SelectControl label="Status" onChange={setSelectedTaskStatus} options={taskStatuses} value={selectedTaskStatus} />
                <SelectControl label="Priority" onChange={setSelectedPriority} options={["All", "High", "Medium", "Low"]} value={selectedPriority} />
                <SelectControl label="Sort By" onChange={setSortBy} options={["Due Date", "Priority", "Status"]} value={sortBy} />
              </div>
            </div>
          </Card>

          <section className="space-y-3 md:space-y-5">
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
                  count={myTasks.length}
                  footer={getGroupFooter("myTasks", myTasks, "my tasks", "text-pink-600")}
                  isOpen={isGroupOpen("myTasks")}
                  onToggle={() => toggleGroupOpen("myTasks")}
                  title="My Tasks"
                  tone="text-pink-600"
                >
                  {renderTaskRows(getGroupItems("myTasks", myTasks), "bg-pink-500")}
                </TaskGroup>

                <TaskGroup
                  count={overdueTasks.length}
                  footer={getGroupFooter("overdue", overdueTasks, "overdue", "text-rose-500")}
                  isOpen={isGroupOpen("overdue")}
                  onToggle={() => toggleGroupOpen("overdue")}
                  title="Overdue"
                  tone="text-rose-500"
                >
                  {renderTaskRows(getGroupItems("overdue", overdueTasks), "bg-rose-500")}
                </TaskGroup>

                <TaskGroup
                  count={dueTodayTasks.length}
                  footer={getGroupFooter("dueToday", dueTodayTasks, "due today", "text-orange-500")}
                  isOpen={isGroupOpen("dueToday")}
                  onToggle={() => toggleGroupOpen("dueToday")}
                  title="Due Today"
                  tone="text-orange-500"
                >
                  {renderTaskRows(getGroupItems("dueToday", dueTodayTasks), "bg-orange-500")}
                </TaskGroup>

                <TaskGroup
                  count={upcomingTasks.length}
                  footer={getGroupFooter("upcoming", upcomingTasks, "upcoming", "text-pink-600")}
                  isOpen={isGroupOpen("upcoming")}
                  onToggle={() => toggleGroupOpen("upcoming")}
                  title="Upcoming"
                  tone="text-blue-600"
                >
                  {renderTaskRows(getGroupItems("upcoming", upcomingTasks), "bg-blue-500")}
                </TaskGroup>

                <TaskGroup
                  count={completedTasks.length}
                  footer={getGroupFooter("completed", completedTasks, "completed", "text-emerald-600")}
                  isOpen={isGroupOpen("completed")}
                  onToggle={() => toggleGroupOpen("completed")}
                  title="Completed"
                  tone="text-emerald-600"
                >
                  {renderTaskRows(getGroupItems("completed", completedTasks), "bg-emerald-500")}
                </TaskGroup>
              </>
            )}

          </section>

          <ConfirmDialog
            confirmLabel={confirmAction?.confirmLabel}
            icon={confirmAction?.icon}
            isOpen={Boolean(confirmAction)}
            message={confirmAction?.message}
            onCancel={closeConfirm}
            onConfirm={confirmCurrentAction}
            title={confirmAction?.title}
          />
          {completionDraft && (
            <CompletedTaskModal
              completion={completionDraft}
              onClose={() => setCompletionDraft(null)}
              onSubmit={submitCompletedTask}
            />
          )}
        </div>
  );
};

export default Tasks;
