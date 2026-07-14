import { useEffect, useMemo, useState } from "react";
import done from "../../../assets/done.png";
import notification from "../../../assets/notification.png";
import pendingrequest from "../../../assets/pendingrequest.png";
import progress from "../../../assets/progress.png";
import taskIcon from "../../../assets/task.png";
import { TaskListSkeleton } from "../../../components/Skeleton.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
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
      assignedTo: subtask?.assignedTo || null,
    }))
    .filter((subtask) => subtask.title);
};

const getTaskProgress = (subtasks) => {
  if (!subtasks.length) return 0;

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
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
  High: "border border-pink-600 bg-transparent text-pink-600",
  Medium: "border border-orange-600 bg-transparent text-orange-600",
  Low: "border border-emerald-600 bg-transparent text-emerald-600",
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
  if (name === "send") return <svg {...props}><path d="m20 4-8 16-2-7-6-3 16-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "upload") return <svg {...props}><path d="M12 16V5M8 9l4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="5" r="1.8" fill="currentColor" /><circle cx="12" cy="19" r="1.8" fill="currentColor" /></svg>;
};

const getPersonName = (person) => {
  if (!person || typeof person === "string") return "Client";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.companyName || person.email || "Client";
};

const getClientName = (task) => {
  if (task?.requestedByName) return task.requestedByName;
  if (task?.requestedBy) return getPersonName(task.requestedBy);
  return getPersonName(task?.createdBy);
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
    assignees: task?.assignees?.length ? task.assignees : [task?.assignedTo].filter(Boolean),
    createdBy: task?.createdBy,
    requestedBy: task?.requestedBy,
    requestedByName: task?.requestedByName || "",
    subtasks,
    progress: getTaskProgress(subtasks),
    feedback: task?.feedback || null,
  };
};

const FeedbackSummary = ({ feedback }) => {
  if (!feedback?.rating) return null;

  return (
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black text-[#10142d]">Client feedback</span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-600">{"★".repeat(feedback.rating)} <span className="text-slate-500">({feedback.rating}/5)</span></span>
      </div>
      {feedback.comment && <p className="mt-2 text-sm font-semibold text-slate-600">“{feedback.comment}”</p>}
      {feedback.submittedAt && <p className="mt-2 text-[11px] font-bold text-slate-400">Submitted {formatDate(feedback.submittedAt)}</p>}
    </div>
  );
};

const TaskRow = ({ currentUserId, isExpanded, item, onToggleExpand, onToggleSubtask, onViewCalendar }) => {
  const progressValue = item.progress ?? getTaskProgress(item.subtasks);
  const completedSubtasks = item.subtasks.filter((subtask) => subtask.completed).length;
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
            <p className="mb-1 text-[10px] font-black text-slate-500">Subtasks</p>
            <p className="mb-2 text-[10px] font-bold text-slate-400">Complete each step in order.</p>
            {item.subtasks.length > 0 ? (
              <div className="space-y-1.5">
                {item.subtasks.map((subtask, index) => {
                  const isAssignedToCurrentUser = subtask.assignedTo
                    ? getEntityId(subtask.assignedTo) === currentUserId
                    : item.assignees.some((assignee) => getEntityId(assignee) === currentUserId);
                  const isSequenceLocked = subtask.completed
                    ? item.subtasks.slice(index + 1).some((nextSubtask) => nextSubtask.completed)
                    : item.subtasks.slice(0, index).some((previousSubtask) => !previousSubtask.completed);
                  const isLocked = isSequenceLocked || !isAssignedToCurrentUser;
                  return (
                  <label key={subtask.id || `${item.id}-${index}`} className={`flex min-w-0 items-center gap-2 text-xs font-bold ${isLocked ? "cursor-not-allowed text-slate-400" : "text-slate-600"}`} title={!isAssignedToCurrentUser ? "This subtask is assigned to another employee" : isSequenceLocked ? "Complete the previous subtask first" : undefined}>
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      disabled={isLocked}
                      onChange={() => onToggleSubtask(item, index)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#e347a8] disabled:cursor-not-allowed disabled:opacity-50"
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
                  );
                })}
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
      <FeedbackSummary feedback={item.feedback} />
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
          <h2 className="text-xl font-black text-[#10142d] dark:text-white">Submit Task Output</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2] dark:hover:bg-neutral-900"
            aria-label="Close submit completed task"
          >
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
            <span className="font-black text-[#10142d] dark:text-white">{formatDate(task.dueDate)}</span>
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <h3 className="text-sm font-black text-[#10142d] dark:text-white">1. Upload Final Output <span className="font-bold text-slate-500">(Choose one)</span></h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-pink-100 dark:border-neutral-800">
              <div className="grid grid-cols-2 border-b border-pink-100 text-xs font-black dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setOutputMethod("file")}
                  className={`h-10 ${outputMethod === "file" ? "border-b-2 border-[#c72fb2] text-[#c72fb2]" : "text-slate-500"}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMethod("link")}
                  className={`h-10 ${outputMethod === "link" ? "border-b-2 border-[#c72fb2] text-[#c72fb2]" : "text-slate-500"}`}
                >
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
                  {fileError && (
                    <p className="mt-2 text-xs font-bold text-rose-600">{fileError}</p>
                  )}
                  {file && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-pink-100 bg-white px-4 py-3 text-xs font-bold text-[#10142d] dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                      <span className="inline-flex min-w-0 items-center gap-3">
                        <SmallIcon name="upload" className="h-5 w-5 text-[#c72fb2]" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFileError("");
                        }}
                        className="text-slate-400 hover:text-[#c72fb2]"
                        aria-label="Remove file"
                      >
                        x
                      </button>
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
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white px-8 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
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

const EmpTask = () => {
  const { user } = useAuth();
  const currentUserId = getEntityId(user);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Due Date");
  const [visibleGroup, setVisibleGroup] = useState("All");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [completionDraft, setCompletionDraft] = useState(null);
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
    { label: "Due Today", value: tasks.filter((task) => getDateStatus(task.dueDate) === "Today" && task.status !== "Done").length, icon: pendingrequest, tone: "orange" },
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
        currentUserId={currentUserId}
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
    const toggledSubtask = task.subtasks[subtaskIndex];
    const isAssignedToCurrentUser = toggledSubtask?.assignedTo
      ? getEntityId(toggledSubtask.assignedTo) === currentUserId
      : task.assignees.some((assignee) => getEntityId(assignee) === currentUserId);
    if (!isAssignedToCurrentUser) {
      setErrorMessage("This subtask is assigned to another employee.");
      return;
    }
    const isLocked = toggledSubtask?.completed
      ? task.subtasks.slice(subtaskIndex + 1).some((subtask) => subtask.completed)
      : task.subtasks.slice(0, subtaskIndex).some((subtask) => !subtask.completed);
    if (isLocked) {
      setErrorMessage("Complete the subtasks in order before moving to the next one.");
      return;
    }
    const nextSubtasks = task.subtasks.map((subtask, index) =>
      index === subtaskIndex
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    const isCompletingSubtask = toggledSubtask && !toggledSubtask.completed;
    const isClientReviewSubtask = /client\s+review.*revision|review.*revision/i.test(toggledSubtask?.title || "");

    if (isCompletingSubtask && isClientReviewSubtask) {
      setCompletionDraft({ task, nextSubtasks, finalize: false });
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
      setNoticeMessage("");
      const updatedTask = await taskAPI.submitOutput(draft.task.id, {
        ...output,
        subtasks: draft.nextSubtasks,
        finalize: draft.finalize,
      });
      setTasks((currentTasks) =>
        currentTasks.map((item) => (item.id === draft.task.id ? normalizeTask(updatedTask) : item))
      );
      setCompletionDraft(null);
      setNoticeMessage(`${draft.task.title} was submitted to the client for review.`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit completed task."));
    }
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
          <Card key={item.label} className={`p-5 !shadow-sm dark:!shadow-none ${statCardStyles[item.tone]}`}>
            <div className="flex items-center gap-4">
              <span className={`grid h-16 w-16 place-items-center rounded-2xl ${toneStyles[item.tone]}`}>
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
        <div>
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

export default EmpTask;
