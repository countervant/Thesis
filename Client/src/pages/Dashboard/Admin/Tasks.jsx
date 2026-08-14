import { useEffect, useMemo, useRef, useState } from "react";
import done from "../../../assets/done.png";
import notification from "../../../assets/notification.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import taskIcon from "../../../assets/task.png";
import InitialsAvatar from "../../../components/InitialsAvatar.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  getApiErrorMessage,
  getProjectOutputFileError,
  isAutoWatermarkImage,
  PROJECT_OUTPUT_FILE_ACCEPT,
  taskAPI,
} from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { TaskListSkeleton } from "../../../components/Skeleton.jsx";
import ProjectGanttChart from "../../../components/ProjectGanttChart.jsx";

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

const getAssignedEmployees = (task) => {
  const employees = [...(task?.assignees || []), task?.assignedTo].filter(Boolean);
  const uniqueEmployees = new Map();

  employees.forEach((employee) => {
    const employeeId = getEntityId(employee);
    if (employeeId && !uniqueEmployees.has(employeeId)) uniqueEmployees.set(employeeId, employee);
  });

  return [...uniqueEmployees.values()].filter(
    (employee) => typeof employee === "string" || !employee?.role || employee.role === "employee"
  );
};

const isClientReviewSubtask = (subtask) =>
  /client\s+(?:review.*revision|revision)|review.*revision/i.test(
    String(subtask?.title || "")
  );

const isSubmitOutputSubtask = (subtask) =>
  String(subtask?.title || "").trim().toLowerCase() === "submit output";

const getSubmissionSubtaskIndex = (subtasks = []) => {
  const submitOutputIndex = subtasks.findIndex(isSubmitOutputSubtask);
  if (submitOutputIndex >= 0) return submitOutputIndex;
  const reviewIndex = subtasks.findIndex(isClientReviewSubtask);
  return reviewIndex >= 0 ? reviewIndex : subtasks.length - 1;
};

const getClientName = (task) => {
  if (String(task?.requestedByName || "").trim()) return task.requestedByName;
  if (task?.requestedBy && typeof task.requestedBy !== "string") {
    return getPersonName(task.requestedBy);
  }
  if (task?.createdBy?.role === "client") return getPersonName(task.createdBy);
  return "Unassigned client";
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

const formatSubmittedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getSafeOutputLink = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
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

const formatProjectAmount = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [];

  return subtasks
    .map((subtask) => ({
      id: subtask?._id || subtask?.id || "",
      title: subtask?.title || "",
      completed: Boolean(subtask?.completed),
      assignedTo: subtask?.assignedTo || null,
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

const normalizeTask = (task) => {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const status = statusFromApi[task?.status] || task?.status || "Pending";

  return {
    id: task?._id || task?.id || "",
    apiStatus: task?.status || "pending",
    title: task?.title || "Untitled task",
    description: task?.description || "",
    startDate: toDisplayDate(String(task?.startDate || task?.createdAt || task?.dueDate || "").slice(0, 10)),
    dueDate: toDisplayDate(String(task?.dueDate || "").slice(0, 10)),
    status,
    priority: task?.priority || "medium",
    amount: Number(task?.amount ?? task?.budget ?? 0),
    paid: Number(task?.paid ?? 0),
    downPayment: task?.downPayment || null,
    assignedTo: task?.assignedTo,
    assignees: task?.assignees?.length ? task.assignees : [task?.assignedTo].filter(Boolean),
    createdBy: task?.createdBy,
    requestedBy: task?.requestedBy,
    requestedByName: task?.requestedByName || "",
    subtasks,
    progress: getTaskProgress(subtasks),
    finalOutput: task?.finalOutput || null,
    revisionRequests: Array.isArray(task?.revisionRequests) ? task.revisionRequests : [],
    clientApproved: task?.activities?.some((activity) => activity?.type === "client_approved") || false,
    newsfeedPermissionAllowed: Boolean(task?.newsfeedPermission?.allowed),
    newsfeedPermissionGrantedAt: task?.newsfeedPermission?.grantedAt,
    feedback: task?.feedback || null,
    employeePayments: Array.isArray(task?.employeePayments) ? task.employeePayments : [],
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
  if (name === "download") return <svg {...props}><path d="M12 4v11M8 11l4 4 4-4M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "external") return <svg {...props}><path d="M13 5h6v6M19 5l-8 8M17 13v6H5V7h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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

const ProjectPaymentButton = ({ isMarkingPaid, item, onMarkPaid }) => {
  if (!onMarkPaid) return null;

  const amount = Number(item.amount || 0);
  const isPaid = amount > 0 && Number(item.paid || 0) >= amount;
  const remainingBalance = Math.max(0, amount - Number(item.paid || 0));
  const isDisabled = isPaid || amount <= 0 || isMarkingPaid;
  const label = isPaid
    ? "Paid"
    : amount <= 0
      ? "Set amount first"
      : isMarkingPaid
        ? "Recording payment..."
        : Number(item.paid || 0) > 0
          ? `Pay ${formatProjectAmount(remainingBalance)} balance`
          : "Mark as Paid";
  const compactLabel = isPaid
    ? "Paid"
    : amount <= 0
      ? "Set amount"
      : isMarkingPaid
        ? "Saving..."
        : Number(item.paid || 0) > 0
          ? "Pay balance"
          : "Mark paid";

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onMarkPaid(item)}
      title={label}
      className={`mt-2 inline-flex h-9 w-full max-w-[120px] items-center justify-center whitespace-nowrap rounded-lg px-2 text-[10px] font-black transition ${
        isPaid
          ? "bg-emerald-100 text-emerald-700"
          : "bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
      }`}
    >
      {compactLabel}
    </button>
  );
};

const EmployeePaymentButton = ({ isPayingEmployee, item, onPayEmployee }) => {
  if (!onPayEmployee) return null;

  const assignedEmployees = getAssignedEmployees(item);
  const paidEmployeeIds = new Set(
    (item.employeePayments || []).map((payment) => getEntityId(payment.employee))
  );
  const unpaidCount = assignedEmployees.filter(
    (employee) => !paidEmployeeIds.has(getEntityId(employee))
  ).length;
  const hasAssignees = assignedEmployees.length > 0;
  const allPaid = hasAssignees && unpaidCount === 0;
  const label = !hasAssignees
    ? "No employee assigned"
    : allPaid
      ? assignedEmployees.length > 1 ? "Team paid" : "Employee paid"
      : isPayingEmployee
        ? "Recording..."
        : assignedEmployees.length > 1
          ? `Pay employee (${unpaidCount})`
          : "Pay employee";
  const compactLabel = !hasAssignees
    ? "Unassigned"
    : allPaid
      ? assignedEmployees.length > 1 ? "Team paid" : "Employee paid"
      : isPayingEmployee
        ? "Saving..."
        : assignedEmployees.length > 1
          ? `Pay team (${unpaidCount})`
          : "Pay employee";

  return (
    <button
      type="button"
      disabled={!hasAssignees || allPaid || isPayingEmployee}
      onClick={() => onPayEmployee(item)}
      title={label}
      className={`mt-1.5 inline-flex h-9 w-full max-w-[120px] items-center justify-center whitespace-nowrap rounded-lg px-2 text-[10px] font-black transition ${
        allPaid
          ? "bg-emerald-100 text-emerald-700"
          : "bg-pink-100 text-[#b524a2] hover:bg-pink-200 disabled:cursor-not-allowed disabled:opacity-60"
      }`}
    >
      {compactLabel}
    </button>
  );
};

const TaskRow = ({ accentClass = "bg-pink-500", canAccessSubtasks, isExpanded, isFocused, isMarkingPaid = false, isOverlay = false, isPayingEmployee = false, item, onDelete, onEdit, onMarkPaid, onPayEmployee, onSubmitOutput, onToggleExpand, onToggleSubtask }) => {
  const effectiveExpanded = isOverlay || (canAccessSubtasks && isExpanded);
  const progressValue = item.progress ?? getTaskProgress(item.subtasks);
  const completedSubtasks = item.subtasks.filter((subtask) => subtask.completed).length;
  const isDone = item.status === "Done";
  const primaryAssignee = item.assignees[0] || item.assignedTo;
  const assigneeSummary = item.assignees.length > 1
    ? `${getPersonName(primaryAssignee)} +${item.assignees.length - 1}`
    : getPersonName(primaryAssignee);
  const progressSummary =
    item.subtasks.length > 0
      ? `${completedSubtasks} of ${item.subtasks.length} tasks completed`
      : "No tasks yet";

  return (
    <article
      id={`task-card-${item.id}`}
      className={`rounded-xl border border-pink-50 bg-white px-3 py-3 shadow-sm md:rounded-none md:border-x-0 md:border-t-0 md:px-4 md:py-4 md:shadow-none md:last:border-b-0 ${
        isFocused ? "bg-pink-50/60 ring-2 ring-inset ring-pink-200" : ""
      } ${!effectiveExpanded ? "cursor-pointer transition hover:bg-pink-50/60 focus-visible:bg-pink-50/60 focus-visible:outline-none" : ""}`}
      onClick={!effectiveExpanded ? (event) => {
        if (event.target.closest("button, input, a, select, label")) return;
        onToggleExpand(item.id);
      } : undefined}
      onKeyDown={!effectiveExpanded ? (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleExpand(item.id);
        }
      } : undefined}
      role={!effectiveExpanded ? "button" : undefined}
      tabIndex={!effectiveExpanded ? 0 : undefined}
    >
      {effectiveExpanded ? (
        <div className="grid gap-5 min-[1280px]:grid-cols-[1.45fr_1.35fr_100px_130px_150px_112px_112px] min-[1280px]:items-start">
          <div className="flex min-w-0 items-center gap-3 text-left">
            {!isOverlay && (
              <button
                type="button"
                onClick={() => onToggleExpand(item.id)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
                aria-label={`Close details for ${item.title}`}
              >
                <span className="rotate-90 transition-transform">
                  <SmallIcon name="chevron" />
                </span>
              </button>
            )}
            <span className="h-10 w-1 shrink-0 rounded-full bg-pink-500" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-black text-[#10142d] dark:text-white">{item.title}</span>
              <span className="mt-1 block text-xs font-bold leading-5 text-slate-500 dark:text-neutral-400">{item.description || "No description"}</span>
              {isOverlay ? (
                <span className="mt-3 block rounded-lg border border-pink-100 bg-pink-50/70 px-3 py-2 dark:border-pink-900/40 dark:bg-pink-950/20">
                  <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Client</span>
                  <span className="mt-0.5 block truncate text-xs font-black text-[#c72fb2]">{getClientName(item)}</span>
                </span>
              ) : (
                <span className="mt-1.5 block truncate text-[10px] font-black text-[#c72fb2]">
                  Client: {getClientName(item)}
                </span>
              )}
              {item.newsfeedPermissionAllowed && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                  <SmallIcon name="check" className="h-3 w-3" /> Client allowed newsfeed posting
                </span>
              )}
              {item.finalOutput?.submittedAt && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[9px] font-black text-blue-700">
                  <SmallIcon name="download" className="h-3 w-3" /> Employee output available
                </span>
              )}
              {Number(item.paid || 0) > 0 && (
                <span className="mt-2 block text-[10px] font-black text-emerald-600">
                  Down payment: {formatProjectAmount(item.paid)} • Balance: {formatProjectAmount(Math.max(0, item.amount - item.paid))}
                </span>
              )}
            </span>
          </div>

          <div className="min-w-0 min-[1280px]:border-r min-[1280px]:border-pink-50 min-[1280px]:pr-5">
            <p className="mb-1 text-[10px] font-black text-slate-500">Tasks</p>
            <p className="mb-2 text-[10px] font-bold text-slate-400">Complete each step in order.</p>
            {item.subtasks.length > 0 ? (
              <div className="space-y-1.5">
                {item.subtasks.map((subtask, index) => {
                  const clientReviewIndex = item.subtasks.findIndex(isClientReviewSubtask);
                  const submissionSubtaskIndex = getSubmissionSubtaskIndex(item.subtasks);
                  const submitOutputIndex = item.subtasks.findIndex(isSubmitOutputSubtask);
                  const isWaitingForClientApproval =
                    submitOutputIndex < 0 &&
                    clientReviewIndex >= 0 &&
                    index > clientReviewIndex &&
                    !item.clientApproved;
                  const isLocked = !canAccessSubtasks || isDone || isWaitingForClientApproval || (subtask.completed
                    ? item.subtasks.slice(index + 1).some((nextSubtask) => nextSubtask.completed)
                    : item.subtasks.slice(0, index).some((previousSubtask) => !previousSubtask.completed));
                  const isReviewSubtask = isClientReviewSubtask(subtask);
                  const isFinalOutputSubtask = isSubmitOutputSubtask(subtask);
                  const isLegacyCustomSubmission =
                    clientReviewIndex < 0 &&
                    submitOutputIndex < 0 &&
                    index === submissionSubtaskIndex;
                  const isSubmissionSubtask = submitOutputIndex >= 0
                    ? isFinalOutputSubtask
                    : isReviewSubtask || isLegacyCustomSubmission;
                  const isClientReviewStatusSubtask = isSubmissionSubtask;
                  const canSubmitOutput =
                    canAccessSubtasks &&
                    !isDone &&
                    isSubmissionSubtask &&
                    item.subtasks.slice(0, index).every((previousSubtask) => previousSubtask.completed);
                  const hasSubmittedOutput = Boolean(item.finalOutput?.submittedAt);
                  const isUnderReview = hasSubmittedOutput && item.apiStatus === "review";
                  const isApproved = hasSubmittedOutput && item.clientApproved;
                  const isSubmissionBlockedByReview =
                    isClientReviewStatusSubtask && (isUnderReview || isApproved);
                  const needsRevision =
                    hasSubmittedOutput &&
                    item.apiStatus === "pending" &&
                    item.revisionRequests.length > 0;
                  return (
                    <div key={subtask.id || `${item.id}-${index}`} className="flex min-w-0 items-center gap-2">
                      <label className={`flex min-w-0 flex-1 items-center gap-2 text-xs font-bold ${isLocked ? "cursor-not-allowed text-slate-400" : "text-slate-600"}`} title={isWaitingForClientApproval ? "Wait for the client to approve the review first" : isLocked && !isDone ? "Complete the previous task first" : undefined}>
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          disabled={isLocked}
                          onChange={() => onToggleSubtask(item, index)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#e347a8] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span className={subtask.completed ? "truncate text-slate-400 line-through" : "truncate"}>
                          {subtask.title}
                        </span>
                        {subtask.assignedTo && (
                          <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
                            {getPersonName(subtask.assignedTo)}
                          </span>
                        )}
                      </label>
                      {isClientReviewStatusSubtask && isApproved && (
                        <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[9px] font-black text-emerald-700">
                          Approved
                        </span>
                      )}
                      {isClientReviewStatusSubtask && isUnderReview && (
                        <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[9px] font-black text-amber-700">
                          Under Review
                        </span>
                      )}
                      {canSubmitOutput && !isSubmissionBlockedByReview && (
                        <button type="button" onClick={() => onSubmitOutput(item, index)} className="shrink-0 rounded-lg bg-[#c72fb2] px-2.5 py-1.5 text-[9px] font-black text-white transition hover:brightness-105">
                          {needsRevision ? "Needs Revision" : "Submit Output"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400">Add tasks by editing this project.</p>
            )}
          </div>

          <div className="min-[1280px]:border-r min-[1280px]:border-pink-50 min-[1280px]:pr-5">
            <p className="mb-5 text-[10px] font-black text-slate-500">Priority</p>
            <span className={`w-fit rounded-full px-4 py-1 text-xs font-black ${priorityStyles[item.priority] || priorityStyles.medium}`}>
              {item.priority}
            </span>
          </div>

          <div className="min-[1280px]:border-r min-[1280px]:border-pink-50 min-[1280px]:pr-5">
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

          <span className="flex flex-col items-end min-[1280px]:pt-8">
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => onEdit(item)} className="grid h-11 w-11 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
                <SmallIcon name="edit" />
              </button>
              <button type="button" onClick={() => onDelete(item)} className="grid h-11 w-11 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
                <SmallIcon name="delete" />
              </button>
            </span>
            <ProjectPaymentButton
              isMarkingPaid={isMarkingPaid}
              item={item}
              onMarkPaid={onMarkPaid}
            />
            <EmployeePaymentButton
              isPayingEmployee={isPayingEmployee}
              item={item}
              onPayEmployee={onPayEmployee}
            />
          </span>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 md:hidden">
          <div className="flex min-w-0 gap-3">
            <span className={`min-h-28 w-1 shrink-0 rounded-full ${accentClass}`} />
            <div className="min-w-0 py-0.5">
              <p className="truncate text-[13px] font-black leading-tight text-[#10142d]">{item.title}</p>
              <p className="mt-1 truncate text-[11px] font-bold text-slate-500">{item.description || "No description"}</p>
              <p className="mt-1 truncate text-[10px] font-black text-[#c72fb2]">Client: {getClientName(item)}</p>
              {item.newsfeedPermissionAllowed && (
                <p className="mt-1 text-[10px] font-black text-emerald-600">Newsfeed posting allowed</p>
              )}
              {item.finalOutput?.submittedAt && (
                <p className="mt-1 text-[10px] font-black text-blue-600">Employee output available</p>
              )}
              <p className="mt-4 text-[10px] font-black text-slate-500">Assigned to</p>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <InitialsAvatar
                  className="h-7 w-7"
                  textClassName="text-[9px]"
                  user={primaryAssignee}
                />
                <span className="min-w-0 truncate text-[11px] font-black text-[#10142d]">
                  {assigneeSummary}
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
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
                aria-label={canAccessSubtasks ? `Show tasks for ${item.title}` : `More options for ${item.title}`}
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

            <div className="mt-auto flex flex-col items-stretch gap-2 pt-3">
              <span className={`inline-flex h-8 w-full items-center justify-center rounded-lg px-2 text-center text-[10px] font-black ${statusStyles[item.status] || getStatusTone(item.status)}`}>
                {item.status}
              </span>
              <span className="flex w-full flex-col items-stretch">
                <span className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => onEdit(item)} className="grid h-11 w-11 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
                    <SmallIcon name="edit" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(item)} className="grid h-11 w-11 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
                    <SmallIcon name="delete" className="h-4 w-4" />
                  </button>
                </span>
                <ProjectPaymentButton
                  isMarkingPaid={isMarkingPaid}
                  item={item}
                  onMarkPaid={onMarkPaid}
                />
                <EmployeePaymentButton
                  isPayingEmployee={isPayingEmployee}
                  item={item}
                  onPayEmployee={onPayEmployee}
                />
              </span>
            </div>
          </div>
        </div>

        <div className={`hidden gap-3 md:grid md:gap-4 ${
          canAccessSubtasks
            ? "min-[1280px]:grid-cols-[44px_1.35fr_100px_130px_150px_112px_112px]"
            : "min-[1280px]:grid-cols-[1.2fr_1.25fr_100px_130px_150px_112px_112px]"
        } min-[1280px]:items-center`}>
          {canAccessSubtasks && (
            <button
              type="button"
              onClick={() => onToggleExpand(item.id)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
              aria-expanded={effectiveExpanded}
              aria-label={`Show subtasks for ${item.title}`}
            >
              <span className="transition-transform">
                <SmallIcon name="chevron" />
              </span>
            </button>
          )}
          <div className={`flex min-w-0 items-start gap-3 ${!canAccessSubtasks ? "min-[1280px]:border-r min-[1280px]:border-pink-50 min-[1280px]:pr-5" : ""}`}>
            <span className={`mt-1 h-16 w-1 shrink-0 rounded-full md:mt-1.5 md:h-8 ${accentClass}`} />
            <span className="min-w-0">
              <p className="truncate text-sm font-black text-[#10142d]">{item.title}</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">{item.description || "No description"}</p>
              <p className="mt-1 truncate text-[10px] font-black text-[#c72fb2]">Client: {getClientName(item)}</p>
              {item.newsfeedPermissionAllowed && (
                <p className="mt-1 text-[9px] font-black text-emerald-600">Newsfeed posting allowed</p>
              )}
              {item.finalOutput?.submittedAt && (
                <p className="mt-1 text-[9px] font-black text-blue-600">Employee output available</p>
              )}
            </span>
          </div>
          {!canAccessSubtasks && (
            <div className="min-w-0 min-[1280px]:border-r min-[1280px]:border-pink-50 min-[1280px]:pr-5">
              <p className="mb-2 text-[10px] font-black text-slate-500">Assigned to</p>
              <div className="flex min-w-0 items-center gap-3">
                <InitialsAvatar
                  className="h-11 w-11"
                  textClassName="text-xs"
                  user={primaryAssignee}
                />
                <span className="min-w-0 truncate text-sm font-black text-[#10142d]">
                  {assigneeSummary}
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
          <span className="flex flex-col items-end min-[1280px]:items-start">
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => onEdit(item)} className="grid h-11 w-11 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label={`Edit ${item.title}`}>
                <SmallIcon name="edit" />
              </button>
              <button type="button" onClick={() => onDelete(item)} className="grid h-11 w-11 place-items-center rounded-lg text-pink-600 hover:bg-pink-50" aria-label={`Delete ${item.title}`}>
                <SmallIcon name="delete" />
              </button>
            </span>
            <ProjectPaymentButton
              isMarkingPaid={isMarkingPaid}
              item={item}
              onMarkPaid={onMarkPaid}
            />
            <EmployeePaymentButton
              isPayingEmployee={isPayingEmployee}
              item={item}
              onPayEmployee={onPayEmployee}
            />
          </span>
        </div>
        </>
      )}
    </article>
  );
};

const EmployeePaymentModal = ({ isSubmitting, onClose, onSubmit, task }) => {
  const assignedEmployees = getAssignedEmployees(task);
  const paidEmployeeIds = new Set(
    (task.employeePayments || []).map((payment) => getEntityId(payment.employee))
  );
  const unpaidEmployees = assignedEmployees.filter(
    (employee) => !paidEmployeeIds.has(getEntityId(employee))
  );
  const [employeeId, setEmployeeId] = useState(getEntityId(unpaidEmployees[0]));
  const [amount, setAmount] = useState("");
  const numericAmount = Number(amount);
  const selectedEmployee = unpaidEmployees.find(
    (employee) => getEntityId(employee) === employeeId
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!employeeId || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    onSubmit({ employeeId, amount: numericAmount });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
      role="presentation"
    >
      <form
        onSubmit={handleSubmit}
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-pink-100 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] dark:border-neutral-800 dark:bg-neutral-950"
      >
        <header className="flex items-start justify-between gap-4 border-b border-pink-100 px-6 py-5 dark:border-neutral-800">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c72fb2]">Project Payroll</p>
            <h2 className="mt-1 text-xl font-black text-[#10142d] dark:text-white">Pay Assigned Employee</h2>
            <p className="mt-1 truncate text-xs font-bold text-slate-500">{task.title}</p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50"
            aria-label="Close employee payment"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4 dark:border-pink-900/30 dark:bg-pink-950/20">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Employee to pay</p>
            {unpaidEmployees.length > 1 ? (
              <select
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-pink-100 bg-white px-3 text-sm font-black text-[#10142d] outline-none focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              >
                {unpaidEmployees.map((employee) => (
                  <option key={getEntityId(employee)} value={getEntityId(employee)}>
                    {getPersonName(employee)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <InitialsAvatar className="h-10 w-10" textClassName="text-xs" user={selectedEmployee} />
                <span>
                  <span className="block text-sm font-black text-[#10142d] dark:text-white">{getPersonName(selectedEmployee)}</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-slate-400">Assigned to this project</span>
                </span>
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-black text-slate-600 dark:text-neutral-300">Payment amount</span>
            <span className="relative mt-2 block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₱</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                autoFocus
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-base font-black text-[#10142d] outline-none transition focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </span>
          </label>

          <div className="flex items-start gap-3 rounded-xl bg-violet-50 px-4 py-3 text-[11px] font-bold leading-5 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            This payment will be recorded automatically as an Employee Payment expense in Admin Budget Management.
          </div>
        </div>

        <footer className="grid gap-3 border-t border-slate-100 px-5 py-4 min-[400px]:flex min-[400px]:justify-end sm:px-6 dark:border-neutral-800">
          <button type="button" disabled={isSubmitting} onClick={onClose} className="h-10 w-full rounded-xl border border-slate-200 px-5 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 min-[400px]:w-auto">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!employeeId || !Number.isFinite(numericAmount) || numericAmount <= 0 || isSubmitting}
            className="h-10 w-full rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_8px_18px_rgba(199,47,178,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 min-[400px]:w-auto"
          >
            {isSubmitting ? "Recording payment..." : `Pay ${getPersonName(selectedEmployee)}`}
          </button>
        </footer>
      </form>
    </div>
  );
};

const ProjectDetailsModal = ({
  canAccessTasks,
  isApprovingCustomClient,
  isDownloadingOutput,
  isMarkingPaid,
  isPayingEmployee,
  item,
  onClose,
  onDelete,
  onDownloadOutput,
  onEdit,
  onMarkPaid,
  onPayEmployee,
  onApproveCustomClient,
  onSubmitOutput,
  onToggleTask,
}) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="admin-project-details-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-6xl overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        role="dialog"
      >
        <header className="flex items-center justify-between gap-4 border-b border-pink-100 px-5 py-4 dark:border-neutral-800 sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c72fb2]">
              Project Management
            </p>
            <h2 id="admin-project-details-title" className="mt-1 text-xl font-black text-[#10142d] dark:text-white">
              Project Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-neutral-700 dark:hover:bg-neutral-900"
            aria-label="Close project details"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="max-h-[calc(92dvh-82px)] overflow-y-auto px-2 py-2 sm:px-4 sm:py-4">
          <TaskRow
            canAccessSubtasks={canAccessTasks}
            isExpanded
            isFocused={false}
            isMarkingPaid={isMarkingPaid}
            isPayingEmployee={isPayingEmployee}
            isOverlay
            item={item}
            onDelete={(task) => {
              onClose();
              onDelete(task);
            }}
            onEdit={(task) => {
              onClose();
              onEdit(task);
            }}
            onMarkPaid={onMarkPaid}
            onPayEmployee={onPayEmployee}
            onSubmitOutput={onSubmitOutput}
            onToggleExpand={onClose}
            onToggleSubtask={onToggleTask}
          />
          {item.finalOutput?.submittedAt && (
            <section className="mt-4 rounded-2xl border border-pink-100 bg-pink-50/40 p-4 dark:border-pink-900/30 dark:bg-pink-950/10 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c72fb2]">
                    Submitted Output
                  </p>
                  <h3 className="mt-1 text-base font-black text-[#10142d] dark:text-white">
                    {item.finalOutput.fileName || (item.finalOutput.link ? "Project output link" : "Employee submission")}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Submitted by {getPersonName(item.finalOutput.submittedBy || item.assignedTo)}
                    {formatSubmittedDate(item.finalOutput.submittedAt)
                      ? ` • ${formatSubmittedDate(item.finalOutput.submittedAt)}`
                      : ""}
                  </p>
                  {item.finalOutput.message && (
                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600 dark:text-neutral-300">
                      {item.finalOutput.message}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.finalOutput.fileName && (
                    <button
                      type="button"
                      disabled={isDownloadingOutput}
                      onClick={() => onDownloadOutput(item)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#c72fb2] px-4 text-xs font-black text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      <SmallIcon name="download" />
                      {isDownloadingOutput ? "Downloading..." : "Download File"}
                    </button>
                  )}
                  {getSafeOutputLink(item.finalOutput.link) && (
                    <a
                      href={getSafeOutputLink(item.finalOutput.link)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c72fb2]/40 bg-white px-4 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50 dark:bg-neutral-950"
                    >
                      Open Link
                      <SmallIcon name="external" />
                    </a>
                  )}
                  {item.apiStatus === "review" && !getEntityId(item.requestedBy) && (
                    <button
                      type="button"
                      disabled={isApprovingCustomClient}
                      onClick={() => onApproveCustomClient(item)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      <SmallIcon name="check" />
                      {isApprovingCustomClient ? "Recording..." : "Record Offline Approval"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
          <div className="mt-4">
            <ProjectGanttChart item={item} />
          </div>
        </div>
      </section>
    </div>
  );
};

const CompletedTaskModal = ({ completion, errorMessage, isSubmitting, onClose, onSubmit }) => {
  const [message, setMessage] = useState(
    completion.finalize
      ? `Hi, we've completed ${completion.task.title}. Please find the final output attached.`
      : `Hi, we've completed ${completion.task.title}. Please check the attached file and let us know your feedback.`
  );
  const [outputMethod, setOutputMethod] = useState("file");
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [watermarkedFile, setWatermarkedFile] = useState(null);
  const [watermarkedFileError, setWatermarkedFileError] = useState("");

  const task = completion.task;
  const pendingAmount = Math.max(0, Number(task.amount || 0) - Number(task.paid || 0));
  const needsPaymentProtection = Number(task.amount || 0) <= 0 || Number(task.paid || 0) < Number(task.amount || 0);
  const requiresManualReviewCopy = Boolean(
    needsPaymentProtection &&
    outputMethod === "file" &&
    file &&
    !isAutoWatermarkImage(file)
  );
  const isBusy = isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    if (outputMethod === "file") {
      const originalFileError = getProjectOutputFileError(file, "Final output");
      setFileError(originalFileError);
      if (originalFileError) return;

      if (requiresManualReviewCopy) {
        const reviewCopyError = getProjectOutputFileError(watermarkedFile, "Protected review copy") ||
          (!isAutoWatermarkImage(watermarkedFile)
            ? "Protected review copy must be a JPEG, PNG, WebP, or GIF image."
            : "");
        setWatermarkedFileError(reviewCopyError);
        if (reviewCopyError) return;
      }
    }

    onSubmit({
      file: outputMethod === "file" ? file : null,
      link,
      message,
      outputMethod,
      watermark: needsPaymentProtection,
      watermarkedFile: requiresManualReviewCopy ? watermarkedFile : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 p-3 backdrop-blur-[2px] sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-pink-50 sm:max-h-[calc(100dvh-3rem)] sm:p-6 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-black text-[#10142d] dark:text-white">Submit Task Output</h2>
          <button type="button" disabled={isBusy} onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2] disabled:cursor-not-allowed disabled:opacity-60" aria-label="Close submit completed task">
            x
          </button>
        </div>

        <p className="mt-4 flex items-center gap-2 rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-[#c72fb2]">
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#c72fb2]">
            <SmallIcon name="check" className="h-3.5 w-3.5" />
          </span>
          {completion.finalize
            ? "You are about to submit the final project output."
            : "You are about to submit this task for client review."}
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

        <div className={`mt-4 rounded-xl border px-4 py-3 ${needsPaymentProtection ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className={`text-xs font-black ${needsPaymentProtection ? "text-amber-700" : "text-emerald-700"}`}>
            {needsPaymentProtection ? "Watermark protection is ON" : "Watermark protection is OFF"}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-600">
            {needsPaymentProtection
              ? `${Number(task.amount || 0) > 0 ? `Pending balance: ₱${pendingAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. ` : "Payment has not been confirmed. "}Image outputs receive a server-generated watermark. For other file types, upload a rasterized, watermarked or redacted image preview.`
              : "This project is fully paid, so the client will receive the original output without a watermark."}
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <h3 className="text-sm font-black text-[#10142d] dark:text-white">1. Upload Final Output <span className="font-bold text-slate-500">(Choose one)</span></h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-pink-100 dark:border-neutral-800">
              <div className="grid grid-cols-2 border-b border-pink-100 text-xs font-black dark:border-neutral-800">
                <button type="button" disabled={isBusy} onClick={() => setOutputMethod("file")} className={`h-10 disabled:cursor-not-allowed disabled:opacity-60 ${outputMethod === "file" ? "border-b-2 border-[#c72fb2] text-[#c72fb2]" : "text-slate-500"}`}>
                  Upload File
                </button>
                <button type="button" disabled={isBusy} onClick={() => setOutputMethod("link")} className={`h-10 disabled:cursor-not-allowed disabled:opacity-60 ${outputMethod === "link" ? "border-b-2 border-[#c72fb2] text-[#c72fb2]" : "text-slate-500"}`}>
                  Paste Link
                </button>
              </div>
              {outputMethod === "file" ? (
                <div className="p-4">
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#c72fb2]/70 bg-pink-50/30 text-center transition hover:bg-pink-50">
                    <SmallIcon name="upload" className="h-7 w-7 text-[#c72fb2]" />
                    <span className="mt-2 text-sm font-black text-[#10142d] dark:text-white">Choose your output file</span>
                    <span className="mt-1 text-xs font-bold text-slate-500">Click to browse</span>
                    <span className="mt-2 text-[11px] font-bold text-slate-400">Maximum file size: 10MB</span>
                    <input
                      type="file"
                      accept={PROJECT_OUTPUT_FILE_ACCEPT}
                      disabled={isBusy}
                      className="sr-only"
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0] || null;
                        const validationError = selectedFile
                          ? getProjectOutputFileError(selectedFile, "Final output")
                          : "";
                        setFile(validationError ? null : selectedFile);
                        setFileError(validationError);
                        setWatermarkedFile(null);
                        setWatermarkedFileError("");
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
                      <button type="button" disabled={isBusy} onClick={() => { setFile(null); setFileError(""); setWatermarkedFile(null); setWatermarkedFileError(""); }} className="text-slate-400 hover:text-[#c72fb2] disabled:cursor-not-allowed disabled:opacity-60" aria-label="Remove file">x</button>
                    </div>
                  )}
                  {requiresManualReviewCopy && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-xs font-black text-amber-800">Protected review copy <span className="text-rose-600">*</span></p>
                      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-600">
                        Upload a rasterized, watermarked or redacted image preview for the client. It must be JPEG, PNG, WebP, or GIF and 10MB or less.
                      </p>
                      <label className="mt-3 flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-amber-400 bg-white text-center transition hover:bg-amber-50">
                        <SmallIcon name="upload" className="h-6 w-6 text-amber-700" />
                        <span className="mt-2 text-xs font-black text-[#10142d]">Choose protected review copy</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={isBusy}
                          className="sr-only"
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0] || null;
                            const validationError = selectedFile
                              ? getProjectOutputFileError(selectedFile, "Protected review copy") ||
                                (!isAutoWatermarkImage(selectedFile)
                                  ? "Protected review copy must be a JPEG, PNG, WebP, or GIF image."
                                  : "")
                              : "";
                            setWatermarkedFile(validationError ? null : selectedFile);
                            setWatermarkedFileError(validationError);
                          }}
                        />
                      </label>
                      {watermarkedFileError && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{watermarkedFileError}</p>}
                      {watermarkedFile && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs font-bold text-[#10142d]">
                          <span className="inline-flex min-w-0 items-center gap-3">
                            <SmallIcon name="upload" className="h-5 w-5 text-amber-700" />
                            <span className="truncate">{watermarkedFile.name}</span>
                          </span>
                          <button type="button" disabled={isBusy} onClick={() => { setWatermarkedFile(null); setWatermarkedFileError(""); }} className="text-slate-400 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Remove protected review copy">x</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <input
                    type="url"
                    disabled={isBusy}
                    required
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
                disabled={isBusy}
                maxLength={500}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10142d] outline-none transition focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
              <span className="mt-1 block text-right text-xs font-bold text-slate-400">{message.length}/500</span>
            </label>
          </section>

          <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-xs font-bold text-[#c72fb2]">
            {completion.finalize
              ? "What happens next? The final output will be saved and the project will be marked as done."
              : "What happens next? The client will be notified and can review, request revisions, or approve this task."}
          </p>
          {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{errorMessage}</p>}
        </div>

        <div className="mt-6 grid gap-3 min-[400px]:flex min-[400px]:justify-end">
          <button type="button" disabled={isBusy} onClick={onClose} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 min-[400px]:w-auto min-[400px]:px-8">
            Cancel
          </button>
          <button type="submit" disabled={isBusy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-6 text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.28)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60 min-[400px]:w-auto min-[400px]:px-8">
            <SmallIcon name="send" />
            {isSubmitting ? "Processing & submitting..." : completion.finalize ? "Submit Final Output" : "Submit to Client"}
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
  const [isApprovingCustomClientId, setIsApprovingCustomClientId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingOutputId, setIsDownloadingOutputId] = useState("");
  const [isMarkingPaidId, setIsMarkingPaidId] = useState("");
  const [isPayingEmployeeId, setIsPayingEmployeeId] = useState("");
  const [employeePaymentTask, setEmployeePaymentTask] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleGroup, setVisibleGroup] = useState("All");
  const [confirmAction, setConfirmAction] = useState(null);
  const [completionDraft, setCompletionDraft] = useState(null);
  const [isSubmittingOutput, setIsSubmittingOutput] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
  const pendingTaskUpdateIdsRef = useRef(new Set());
  const currentUserId = getEntityId(user);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await taskAPI.getAll({ limit: 100, refresh: true, view: "projects" });
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

        setVisibleGroup("All");
        setSelectedTaskId(String(target.taskId));
        sessionStorage.removeItem(notificationTargetKey);
      } catch {
        sessionStorage.removeItem(notificationTargetKey);
      }
    };

    if (!isLoading) {
      focusTarget();
    }

    window.addEventListener("clientra:notification-target", focusTarget);
    return () => window.removeEventListener("clientra:notification-target", focusTarget);
  }, [isLoading]);

  useEffect(() => {
    if (!selectedTaskId) return undefined;

    let isCurrent = true;
    const loadTaskDetails = async () => {
      setSelectedTaskDetails(null);
      setIsLoadingTaskDetails(true);
      setErrorMessage("");

      try {
        const task = await taskAPI.getById(selectedTaskId, { refresh: true });
        if (isCurrent) setSelectedTaskDetails(normalizeTask(task));
      } catch (error) {
        if (!isCurrent) return;
        setErrorMessage(getApiErrorMessage(error, "Unable to load project details."));
        setSelectedTaskId("");
      } finally {
        if (isCurrent) setIsLoadingTaskDetails(false);
      }
    };

    loadTaskDetails();

    return () => {
      isCurrent = false;
    };
  }, [selectedTaskId]);

  const visibleTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredTasks = tasks.filter((task) => {
      const dateStatus = getDateStatus(task.dueDate);
      const matchesGroup =
        visibleGroup === "All" ||
        (visibleGroup === "Due Today" && dateStatus === "Today" && task.status !== "Done") ||
        (visibleGroup === "Upcoming" && (dateStatus === "Week" || dateStatus === "Upcoming") && task.status !== "Done") ||
        (visibleGroup === "Overdue" && dateStatus === "Overdue" && task.status !== "Done") ||
        (visibleGroup === "Completed" && task.status === "Done");

      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.description.toLowerCase().includes(normalizedSearch);

      return matchesGroup && matchesSearch;
    });

    return filteredTasks.sort((firstTask, secondTask) => {
      const firstDate = toInputDate(firstTask.dueDate);
      const secondDate = toInputDate(secondTask.dueDate);
      return firstDate.localeCompare(secondDate);
    });
  }, [searchQuery, tasks, visibleGroup]);

  const isOwnedByCurrentUser = (task) => {
    if (!currentUserId) return false;
    if (user?.role === "client") {
      return getEntityId(task.createdBy) === currentUserId;
    }
    return task.assignees.some((assignee) => getEntityId(assignee) === currentUserId);
  };
  const taskStats = useMemo(() => {
    let dueToday = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const isDone = task.status === "Done";
      if (isDone) {
        completed++;
      } else {
        if (task.status === "In progress") inProgress++;
        const dateStatus = getDateStatus(task.dueDate);
        if (dateStatus === "Today") dueToday++;
        else if (dateStatus === "Overdue") overdue++;
      }
    }

    return [
      { label: "Total Projects", value: tasks.length, icon: taskIcon, tone: "pink" },
      { label: "Due Today", value: dueToday, icon: pendingrequest, tone: "orange" },
      { label: "In Progress", value: inProgress, icon: progress, tone: "blue" },
      { label: "Completed", value: completed, icon: done, tone: "green" },
      { label: "Overdue", value: overdue, icon: notification, tone: "rose" },
    ];
  }, [tasks]);
  const selectedTask = selectedTaskDetails;

  const renderTaskRows = (items, accentClass = "bg-pink-500") => {
    if (items.length === 0) {
      return (
        <div className="grid min-h-24 place-items-center rounded-xl bg-white px-4 py-5 text-center md:rounded-none">
          <div>
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-pink-400">
              <SmallIcon name="list" className="h-5 w-5" />
            </span>
            <p className="mt-2 text-xs font-bold text-slate-500 md:text-sm">No projects found.</p>
          </div>
        </div>
      );
    }

    return items.map((task) => (
      <TaskRow
        key={task.id}
        accentClass={accentClass}
        canAccessSubtasks={isOwnedByCurrentUser(task)}
        isExpanded={false}
        isFocused={false}
        isMarkingPaid={isMarkingPaidId === task.id}
        isPayingEmployee={isPayingEmployeeId === task.id}
        item={task}
        onDelete={requestDeleteTask}
        onEdit={handleEditTask}
        onMarkPaid={user?.role === "admin" ? requestMarkPaid : undefined}
        onPayEmployee={user?.role === "admin" ? setEmployeePaymentTask : undefined}
        onSubmitOutput={handleSubmitOutput}
        onToggleExpand={(taskId) => setSelectedTaskId(String(taskId))}
        onToggleSubtask={handleToggleSubtask}
      />
    ));
  };

  const handleAddTask = () => {
    onNavigate?.("add-task");
  };

  const handleEditTask = async (task) => {
    try {
      setErrorMessage("");
      const completeTask = selectedTaskDetails?.id === task.id
        ? selectedTaskDetails
        : normalizeTask(await taskAPI.getById(task.id, { refresh: true }));
      onEditTask?.(completeTask);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to load project for editing."));
    }
  };

  const updateTaskSubtasks = async (task, nextSubtasks) => {
    if (pendingTaskUpdateIdsRef.current.has(task.id)) return;
    pendingTaskUpdateIdsRef.current.add(task.id);

    try {
      setErrorMessage("");
      const updatedTask = await taskAPI.update(task.id, {
        title: task.title,
        description: task.description,
        startDate: toInputDate(task.startDate),
        dueDate: toInputDate(task.dueDate),
        priority: task.priority,
        assignedTo: getEntityId(task.assignedTo),
        assignees: task.assignees.map(getEntityId),
        subtasks: nextSubtasks,
      });

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? normalizeTask(updatedTask) : currentTask
        )
      );
      setSelectedTaskDetails((currentTask) =>
        currentTask?.id === task.id ? normalizeTask(updatedTask) : currentTask
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update task.");
    } finally {
      pendingTaskUpdateIdsRef.current.delete(task.id);
    }
  };

  const handleToggleSubtask = async (task, subtaskIndex) => {
    if (!isOwnedByCurrentUser(task) || task.status === "Done") {
      return;
    }

    const toggledSubtask = task.subtasks[subtaskIndex];
    const submitOutputIndex = task.subtasks.findIndex(isSubmitOutputSubtask);
    const clientReviewIndex = submitOutputIndex >= 0
      ? -1
      : task.subtasks.findIndex(isClientReviewSubtask);
    if (clientReviewIndex >= 0 && subtaskIndex > clientReviewIndex && !task.clientApproved) {
      setErrorMessage("Wait for the client to approve the review before continuing to the final task.");
      return;
    }
    const isLocked = toggledSubtask?.completed
      ? task.subtasks.slice(subtaskIndex + 1).some((subtask) => subtask.completed)
      : task.subtasks.slice(0, subtaskIndex).some((subtask) => !subtask.completed);
    if (isLocked) {
      setErrorMessage("Complete the tasks in order before moving to the next one.");
      return;
    }
    const nextSubtasks = task.subtasks.map((subtask, index) =>
      index === subtaskIndex
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    const isCompletingSubtask = toggledSubtask && !toggledSubtask.completed;
    const isFinalOutputSubtask = isSubmitOutputSubtask(toggledSubtask);
    const isSubmissionSubtask = submitOutputIndex >= 0
      ? isFinalOutputSubtask
      : isClientReviewSubtask(toggledSubtask) ||
        subtaskIndex === getSubmissionSubtaskIndex(task.subtasks);

    if (isCompletingSubtask && isSubmissionSubtask) {
      setSelectedTaskId("");
      setErrorMessage("");
      setCompletionDraft({ task, nextSubtasks, finalize: false });
      return;
    }

    await updateTaskSubtasks(task, nextSubtasks);
  };

  const handleSubmitOutput = (task, subtaskIndex) => {
    const previousStepsCompleted = task.subtasks
      .slice(0, subtaskIndex)
      .every((subtask) => subtask.completed);

    if (!isOwnedByCurrentUser(task) || !previousStepsCompleted || task.status === "Done") return;

    const nextSubtasks = task.subtasks.map((subtask, index) =>
      index === subtaskIndex ? { ...subtask, completed: true } : subtask
    );
    setSelectedTaskId("");
    setErrorMessage("");
    setCompletionDraft({ task, nextSubtasks, finalize: false });
  };

  const submitCompletedTask = async (output) => {
    const draft = completionDraft;
    if (!draft || isSubmittingOutput) return;

    if (output.outputMethod === "file" && !output.file) {
      setErrorMessage("Please upload a file before submitting.");
      return;
    }

    if (
      output.outputMethod === "file" &&
      output.watermark &&
      !isAutoWatermarkImage(output.file) &&
      !output.watermarkedFile
    ) {
      setErrorMessage("Please upload a separate protected review copy before submitting.");
      return;
    }

    if (output.outputMethod === "link" && !output.link.trim()) {
      setErrorMessage("Please paste a link before submitting.");
      return;
    }

    try {
      setIsSubmittingOutput(true);
      setErrorMessage("");
      const updatedTask = await taskAPI.submitOutput(draft.task.id, {
        ...output,
        subtasks: draft.nextSubtasks,
        finalize: draft.finalize,
      });
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === draft.task.id ? normalizeTask(updatedTask) : currentTask
        )
      );
      setSelectedTaskDetails((currentTask) =>
        currentTask?.id === draft.task.id ? normalizeTask(updatedTask) : currentTask
      );
      setCompletionDraft(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit completed task."));
    } finally {
      setIsSubmittingOutput(false);
    }
  };

  const handleDownloadOutput = async (task) => {
    if (!task?.finalOutput?.fileName) return;

    try {
      setIsDownloadingOutputId(task.id);
      setErrorMessage("");
      await taskAPI.downloadOutput(task.id, task.finalOutput.fileName);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to download the submitted output."));
    } finally {
      setIsDownloadingOutputId("");
    }
  };

  const handleApproveCustomClient = async (task) => {
    try {
      setIsApprovingCustomClientId(task.id);
      setErrorMessage("");
      setNoticeMessage("");
      const updatedTask = normalizeTask(await taskAPI.approve(task.id));
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? updatedTask : currentTask
        )
      );
      setSelectedTaskDetails((currentTask) =>
        currentTask?.id === task.id ? updatedTask : currentTask
      );
      setNoticeMessage(`Offline approval was recorded for ${getClientName(task)}.`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to record the custom client's approval."));
    } finally {
      setIsApprovingCustomClientId("");
    }
  };

  const requestCustomClientApproval = (task) => {
    setConfirmAction({
      icon: "done",
      title: "Record Offline Approval",
      message: `Confirm that ${getClientName(task)} approved the submitted output outside Clientra?`,
      confirmLabel: "Yes, record approval",
      onConfirm: () => handleApproveCustomClient(task),
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

  const handleMarkPaid = async (task) => {
    if (isMarkingPaidId) return;

    try {
      setIsMarkingPaidId(task.id);
      setErrorMessage("");
      setNoticeMessage("");
      const updatedTask = normalizeTask(await taskAPI.markPaid(task.id));
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item.id === task.id ? updatedTask : item))
      );
      setSelectedTaskDetails((currentTask) =>
        currentTask?.id === task.id ? updatedTask : currentTask
      );
      setNoticeMessage(
        `${task.title} was marked as paid and added to Budget Management income.`
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to record this project payment."));
    } finally {
      setIsMarkingPaidId("");
    }
  };

  const requestMarkPaid = (task) => {
    const amount = Number(task.amount || 0);
    const remainingBalance = Math.max(0, amount - Number(task.paid || 0));
    if (amount <= 0 || Number(task.paid || 0) >= amount) return;

    setConfirmAction({
      icon: "done",
      title: "Mark as Paid",
      message: `Record the remaining ${formatProjectAmount(remainingBalance)} from “${task.title}”? Budget Management project income will update to the full ${formatProjectAmount(amount)}, and the original output will be unlocked.`,
      confirmLabel: "Yes, mark paid",
      onConfirm: () => handleMarkPaid(task),
    });
  };

  const handlePayEmployee = async ({ amount, employeeId }) => {
    const task = employeePaymentTask;
    if (!task || isPayingEmployeeId) return;

    try {
      setIsPayingEmployeeId(task.id);
      setErrorMessage("");
      setNoticeMessage("");
      const updatedTask = normalizeTask(await taskAPI.payEmployee(task.id, { amount, employeeId }));
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item.id === task.id ? updatedTask : item))
      );
      setSelectedTaskDetails((currentTask) =>
        currentTask?.id === task.id ? updatedTask : currentTask
      );
      setEmployeePaymentTask(null);
      setNoticeMessage(
        `${getPersonName(updatedTask.employeePayments.find((payment) => getEntityId(payment.employee) === employeeId)?.employee)} was paid ${formatProjectAmount(amount)}. The payment was added to Budget Management expenses.`
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to record the employee payment."));
    } finally {
      setIsPayingEmployeeId("");
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
        <div className="-mb-10 mt-0 min-h-[calc(100dvh-4rem)] space-y-4 bg-[#f8f9fd] px-3 py-4 text-[#111936] md:-mt-8 md:space-y-5 md:px-6 md:py-5 lg:px-8">
          <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1
                className="page-title whitespace-nowrap text-2xl leading-none text-neutral-950 dark:text-white md:text-4xl"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Projects
              </h1>
              <p className="mt-2 hidden text-sm font-medium text-neutral-600 dark:text-neutral-400 md:block">
                Assign and manage your projects efficiently.
              </p>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-linear-to-r from-[#db4ab5] to-[#f06ac8] px-4 text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105 md:px-5 md:text-sm"
              >
                <SmallIcon name="plus" className="h-4 w-4 md:h-5 md:w-5" />
                <span>Create Project</span>
              </button>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-5 xl:grid-cols-5">
            {taskStats.map((item, index) => (
              <Card key={item.label} className={`min-w-0 p-2 !shadow-sm dark:!shadow-none md:p-5 ${index === taskStats.length - 1 ? "col-span-2 sm:col-span-1" : ""} ${statCardStyles[item.tone]}`}>
                <div className="flex min-w-0 flex-col items-center gap-1.5 text-center md:flex-row md:gap-4 md:text-left">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg md:h-16 md:w-16 md:rounded-2xl ${toneStyles[item.tone]}`}>
                    <ImageIcon src={item.icon} className="h-5 w-5 md:h-9 md:w-9" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black leading-none text-[#10142d] md:text-4xl">{item.value}</p>
                    <p className="mt-1 truncate text-[11px] font-black text-slate-600 md:text-sm">{item.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-3 md:p-5">
            <label className="relative block">
              <span className="sr-only">Search projects</span>
              <SmallIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 md:left-4 md:h-5 md:w-5" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs font-bold outline-none placeholder:text-slate-400 focus:border-pink-200 focus:ring-2 focus:ring-pink-100 md:h-12 md:pl-12 md:pr-4 md:text-sm"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {["All", "Due Today", "Upcoming", "Overdue", "Completed"].map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setVisibleGroup(group)}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${visibleGroup === group ? "bg-pink-100 text-pink-700" : "border border-pink-100 bg-white text-slate-600 hover:bg-pink-50"}`}
                >
                  {group}
                </button>
              ))}
            </div>
          </Card>

          <section className="space-y-3 md:space-y-5">
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {errorMessage}
              </p>
            )}
            {noticeMessage && (
              <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
                {noticeMessage}
              </p>
            )}

            {isLoading && (
              <TaskListSkeleton rows={5} />
            )}

            {!isLoading && (
              <Card className="overflow-hidden p-0">
                <div className="space-y-3 p-3 md:space-y-0 md:p-0">
                  {renderTaskRows(visibleTasks)}
                </div>
              </Card>
            )}

          </section>

          {selectedTaskId && isLoadingTaskDetails && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4 backdrop-blur-[2px]">
              <div className="rounded-2xl border border-pink-100 bg-white px-6 py-5 text-sm font-black text-[#10142d] shadow-2xl">
                Loading project details...
              </div>
            </div>
          )}
          {selectedTaskId && selectedTask && !isLoadingTaskDetails && (
            <ProjectDetailsModal
              canAccessTasks={isOwnedByCurrentUser(selectedTask)}
              isApprovingCustomClient={isApprovingCustomClientId === selectedTask.id}
              isDownloadingOutput={isDownloadingOutputId === selectedTask.id}
              isMarkingPaid={isMarkingPaidId === selectedTask.id}
              isPayingEmployee={isPayingEmployeeId === selectedTask.id}
              item={selectedTask}
              onClose={() => setSelectedTaskId("")}
              onDelete={requestDeleteTask}
              onDownloadOutput={handleDownloadOutput}
              onEdit={handleEditTask}
              onMarkPaid={user?.role === "admin" ? requestMarkPaid : undefined}
              onPayEmployee={user?.role === "admin" ? setEmployeePaymentTask : undefined}
              onApproveCustomClient={requestCustomClientApproval}
              onSubmitOutput={handleSubmitOutput}
              onToggleTask={handleToggleSubtask}
            />
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
          {completionDraft && (
            <CompletedTaskModal
              completion={completionDraft}
              errorMessage={errorMessage}
              isSubmitting={isSubmittingOutput}
              onClose={() => {
                if (!isSubmittingOutput) {
                  setErrorMessage("");
                  setCompletionDraft(null);
                }
              }}
              onSubmit={submitCompletedTask}
            />
          )}
          {employeePaymentTask && (
            <EmployeePaymentModal
              isSubmitting={isPayingEmployeeId === employeePaymentTask.id}
              onClose={() => {
                if (!isPayingEmployeeId) setEmployeePaymentTask(null);
              }}
              onSubmit={handlePayEmployee}
              task={employeePaymentTask}
            />
          )}
        </div>
  );
};

export default Tasks;
