import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Skeleton from "../../components/Skeleton/Skeleton.jsx";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog.jsx";
import PayMongoModal from "../../components/PayMongoModal/PayMongoModal.jsx";
import ProjectGroupTable from "../../components/ProjectGroupTable/ProjectGroupTable.jsx";
import {
  fileToDataUrl,
  getApiErrorMessage,
  getProjectOutputFileError,
  paymentAPI,
  PROJECT_OUTPUT_FILE_ACCEPT,
  taskAPI,
} from "../../services/api.js";
import { QUERY_KEYS } from "../../constants/queryKeys.js";
import {
  useTasksQuery,
  useTaskDetailsQuery,
  useTaskMutations,
} from "../../hooks/index.js";
import { unwrapData } from "../../utils/queryUtils.js";
import progressIcon from "../../assets/progress.png";
import pendingIcon from "../../assets/pending.png";
import reviewIcon from "../../assets/Review.png";
import doneIcon from "../../assets/done.png";

const notificationTargetKey = "clientraNotificationTarget";

const statusFromApi = {
  pending: "Pending Revisions",
  in_progress: "In Progress",
  review: "In Review",
  done: "Completed",
};

const statusStyles = {
  "In Progress": "bg-pink-50 text-[#c72fb2]",
  "In Review": "bg-orange-50 text-orange-600",
  Completed: "bg-emerald-50 text-emerald-600",
  "Pending Revisions": "bg-pink-50 text-pink-600",
};

const statStyles = {
  "In Progress": "bg-pink-50 text-[#c72fb2] ring-[#c72fb2]/20",
  "In Review": "bg-orange-50 text-orange-500 ring-orange-500/20",
  Completed: "bg-emerald-50 text-emerald-500 ring-emerald-500/20",
  "Pending Revisions": "bg-pink-50 text-pink-500 ring-pink-500/20",
};

const statusFilters = [
  "All Status",
  "In Progress",
  "In Review",
  "Completed",
  "Pending Revisions",
  "Archived",
];
const sortOptions = ["Newest to Oldest", "Oldest to Newest", "Due Date", "Progress"];
const API_ROOT = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

const todayInputDate = () => {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localToday.toISOString().slice(0, 10);
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800 ${className}`}>
    {children}
  </section>
);

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "folder") return <svg {...props}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "hourglass") return <svg {...props}><path d="M7 4h10M7 20h10M8 4c0 4 2.5 5.5 4 8-1.5 2.5-4 4-4 8M16 4c0 4-2.5 5.5-4 8 1.5 2.5 4 4 4 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "check") return <svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="m8.5 12 2.3 2.3 4.9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "refresh") return <svg {...props}><path d="M19 8a7 7 0 0 0-12-2l-2 2M5 5v3h3M5 16a7 7 0 0 0 12 2l2-2M19 19v-3h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "file") return <svg {...props}><path d="M7 3h7l4 4v14H7zM14 3v5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "search") return <svg {...props}><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "filter") return <svg {...props}><path d="M5 6h14l-5 6v5l-4 2v-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "eye") return <svg {...props}><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "arrow") return <svg {...props}><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "download") return <svg {...props}><path d="M12 4v10M8 10l4 4 4-4M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "external") return <svg {...props}><path d="M14 5h5v5M19 5l-8 8M10 6H6v12h12v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "star") return <svg {...props}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "send") return <svg {...props}><path d="m20 4-8 16-2-7-6-3 16-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "message") return <svg {...props}><path d="M5 5h14v11H9l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "upload") return <svg {...props}><path d="M12 16V5M8 9l4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "dots") return <svg {...props}><path d="M12 6h.01M12 12h.01M12 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
  if (name === "credit-card") return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.8" /><path d="M7 15h2M12 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "archive") return <svg {...props}><rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "delete") return <svg {...props}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const getPayButtonLabel = (project) => {
  if (!project) return "Pay Balance";
  const downPaymentAmount = Number(project.downPayment?.amount) || 0;
  const isDownPaymentPending = downPaymentAmount > 0 && !project.downPayment?.paidAt && project.paid < downPaymentAmount;

  if (isDownPaymentPending) {
    return "Pay Down Payment";
  }
  return "Pay Balance";
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
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

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return "No date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPersonName = (person, fallback = "Clientra Team") => {
  if (!person || typeof person === "string") return fallback;
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.companyName || person.email || fallback;
};

const getFileUrl = (fileUrl) => {
  const value = String(fileUrl || "").trim();
  if (!value) return "";
  if (value.startsWith("/uploads/")) return `${API_ROOT}${value}`;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
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

const normalizeProject = (task) => {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const status = statusFromApi[task?.status] || task?.status || "Pending Revisions";
  const attachments = Array.isArray(task?.attachments) ? task.attachments : [];
  const finalOutput = task?.finalOutput || null;
  const amount = Number(task?.amount ?? task?.budget ?? 0);
  const paid = Number(task?.paid ?? 0);
  const fullyPaid = (amount > 0 && paid >= amount) || (paid > 0 && amount === 0) || Boolean(task?.isPaid);
  const feedback = task?.feedback;
  const hasSubmittedFeedback = Boolean(
    feedback?.submittedAt &&
    Number(feedback?.overallRating) >= 1 &&
    Number(feedback?.overallRating) <= 5
  );
  const uploadedFileIds = new Set(
    [
      ...attachments.map((file) => file?.fileUrl || file?.fileName),
      finalOutput?.fileUrl || finalOutput?.fileName,
    ].filter(Boolean)
  );

  return {
    id: getEntityId(task),
    raw: task,
    title: task?.title || "Untitled project",
    description: task?.description || "Project request",
    startDate: task?.startDate || task?.createdAt,
    dueDate: task?.dueDate,
    createdAt: task?.createdAt,
    amount,
    paid,
    pendingAmount: Math.max(0, amount - paid),
    fullyPaid,
    paymentPending: !fullyPaid,
    downPayment: task?.downPayment,
    files: uploadedFileIds.size,
    priority: task?.priority || "medium",
    progress: status === "Completed" ? 100 : getTaskProgress(subtasks),
    subtasks,
    revisions: Array.isArray(task?.revisionRequests) ? task.revisionRequests.length : 0,
    revisionRequests: Array.isArray(task?.revisionRequests) ? task.revisionRequests : [],
    activities: Array.isArray(task?.activities) ? task.activities : [],
    status,
    team: Math.max(1, task?.assignedTo ? 2 : 1),
    updatedAt: task?.updatedAt || task?.createdAt,
    completedAt: task?.completedAt,
    assignedTo: task?.assignedTo,
    createdBy: task?.createdBy,
    requestedBy: task?.requestedBy,
    attachments,
    finalOutput,
    awaitingClientDecision: status === "In Review" && Boolean(finalOutput?.submittedAt),
    feedback: hasSubmittedFeedback ? feedback : null,
    archived: Boolean(task?.archived),
    archivedAt: task?.archivedAt,
    clientApproved: Array.isArray(task?.activities)
      && task.activities.some((activity) => activity?.type === "client_approved"),
    newsfeedPermissionAllowed: Boolean(task?.newsfeedPermission?.allowed),
    newsfeedPermissionGrantedAt: task?.newsfeedPermission?.grantedAt,
  };
};

const ProjectStats = ({ projects }) => {
  const stats = [
    { label: "In Progress", value: projects.filter((item) => item.status === "In Progress").length, sub: "Active projects", icon: progressIcon },
    { label: "In Review", value: projects.filter((item) => item.status === "In Review").length, sub: "Awaiting your review", icon: reviewIcon },
    { label: "Completed", value: projects.filter((item) => item.status === "Completed").length, sub: "Successfully delivered", icon: doneIcon },
    { label: "Pending Revisions", value: projects.filter((item) => item.status === "Pending Revisions").length, sub: "Action needed", icon: pendingIcon },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
      {stats.map((item) => (
        <Card key={item.label} className="p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 md:h-16 md:w-16 md:rounded-2xl ${statStyles[item.label]}`}>
              <img src={item.icon} alt="" className="h-5 w-5 object-contain md:h-8 md:w-8" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xl font-black text-[#10142d] dark:text-white md:text-3xl">{item.value}</span>
              <span className="block text-[10px] font-black leading-tight text-[#10142d] dark:text-white md:text-sm">{item.label}</span>
              <span className="mt-1 hidden text-xs font-bold text-slate-500 md:block">{item.sub}</span>
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
};


const ProjectActivityPanel = ({ children, count, onClose, title }) => (
  <div
    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
    onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    role="presentation"
  >
    <section
      className="flex max-h-[min(760px,88dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_24px_70px_rgba(30,20,45,0.28)] dark:border-neutral-800 dark:bg-neutral-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-activity-panel-title"
    >
      <header className="flex items-center justify-between gap-4 border-b border-pink-100 px-5 py-4 dark:border-neutral-800">
        <div>
          <h2 id="project-activity-panel-title" className="text-lg font-black text-[#10142d] dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs font-bold text-slate-500">{count} {count === 1 ? "item" : "items"}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-pink-100 text-sm font-black text-[#c72fb2] transition hover:bg-pink-50" aria-label={`Close ${title}`}>x</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-3">
        {children}
      </div>
    </section>
  </div>
);

const ProjectDetails = ({
  errorMessage,
  isDownloadingOutput,
  isVerifyingPayment = false,
  noticeMessage,
  onApprove,
  onBack,
  onDelete,
  onDownloadOutput,
  onFeedback,
  onPay,
  onRequestRevision,
  onSetNewsfeedPermission,
  onToggleArchive,
  onViewOutput,
  project,
}) => {
  const [openActivityPanel, setOpenActivityPanel] = useState(null);
  const rawFinalOutputLink = String(project.finalOutput?.link || "").trim();
  const safeFinalOutputLink = getSafeOutputLink(rawFinalOutputLink);
  const isFinalOutputLinkProtected = Boolean(project.finalOutput?.linkProtected);
  const outputCandidates = [
    ...(rawFinalOutputLink || isFinalOutputLinkProtected
      ? [{
          id: "final-link",
          title: "Project Output Link",
          subtitle: isFinalOutputLinkProtected
            ? "Available after the project payment is confirmed."
            : safeFinalOutputLink
              ? rawFinalOutputLink
              : "Submitted link is unavailable.",
          type: "link",
          url: safeFinalOutputLink,
          protected: isFinalOutputLinkProtected,
          submittedAt: project.finalOutput.submittedAt,
        }]
      : []),
    ...(project.finalOutput?.fileName
      ? [{
          id: "final-file",
          title: project.finalOutput.fileName || "Submitted Output",
          subtitle: project.paymentPending
            ? project.finalOutput.watermarked
              ? "Watermarked preview • Payment pending"
              : "Review copy • Payment pending"
            : "Original output • Fully paid",
          type: "file",
          url: getFileUrl(project.finalOutput.fileUrl),
          source: "final-output",
          available: true,
          protected: project.paymentPending,
          watermarked: Boolean(project.finalOutput.watermarked),
          submittedAt: project.finalOutput.submittedAt,
        }]
      : []),
    ...project.attachments.map((file, index) => ({
      id: `${file.fileUrl || file.fileName}-${index}`,
      title: file.fileName || `File ${index + 1}`,
      subtitle: "Project file",
      type: "file",
      url: getFileUrl(file.fileUrl),
      source: "attachment",
      attachmentIndex: index,
      localAttachment: String(file.fileUrl || "").startsWith("/uploads/"),
      submittedAt: project.finalOutput?.submittedAt || project.updatedAt,
    })),
  ];
  const seenOutputs = new Set();
  const outputItems = outputCandidates.filter((output) => {
    const normalizedUrl = String(output.url || "").trim().replace(/\\/g, "/").toLowerCase();
    const normalizedTitle = String(output.title || "").trim().toLowerCase();
    const key = normalizedUrl || `${output.type}:${normalizedTitle}`;
    if (!key || seenOutputs.has(key)) return false;
    seenOutputs.add(key);
    return true;
  });
  const clientActivities = (project.activities || []).filter(
    (activity) =>
      activity?.type !== "employee_paid" &&
      !String(activity?.title || "").toLowerCase().startsWith("paid employee")
  );
  const timeline = clientActivities.length > 0
    ? [...clientActivities]
        .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
        .map((activity) => ({
          label: activity.title,
          details: "",
          date: activity.createdAt,
          done: activity.type !== "subtask_reopened",
          final: activity.type === "output_submitted",
        }))
    : project.subtasks.length > 0
      ? project.subtasks.map((subtask) => ({
          label: `${subtask.completed ? "Completed" : "Pending"} task: ${subtask.title}`,
          details: "",
          date: subtask.completed ? project.updatedAt : project.dueDate,
          done: subtask.completed,
          final: false,
        }))
      : [{ label: "No task activity yet", details: "", date: project.updatedAt, done: false, final: false }];
  const visibleTimeline = timeline.slice(0, 6);

  const renderTimeline = (items) => (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={`${item.label}-${item.date || index}-${index}`} className="grid grid-cols-[28px_1fr] gap-3">
          <span className="flex flex-col items-center">
            <span className={`grid h-7 w-7 place-items-center rounded-full ${item.final ? "bg-[#c72fb2] text-white" : item.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
              <Icon name={item.final ? "star" : "check"} className="h-4 w-4" />
            </span>
            {index < items.length - 1 && <span className={`min-h-9 flex-1 w-px ${item.done ? "bg-emerald-200" : "bg-slate-200"}`} />}
          </span>
          <span className="pb-4">
            <span className="block text-sm font-black">{item.label}</span>
            <span className="block text-xs font-bold leading-5 text-slate-500">
              {formatDateTime(item.date)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );

  const renderOutputs = (items) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm font-bold text-slate-500">No submitted output yet.</p>
      ) : (
        items.map((output) => (
          <div
            key={output.id}
            className="rounded-xl border border-pink-100/80 bg-pink-50/25 p-3.5 transition hover:border-pink-200 dark:border-neutral-800 dark:bg-neutral-800/40"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pink-100/70 text-[#c72fb2] dark:bg-pink-950/40">
                <Icon name={output.type === "link" ? "external" : "file"} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="block truncate text-sm font-black text-[#10142d] dark:text-white" title={output.title}>
                    {output.title}
                  </span>
                  {output.protected && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                      {output.watermarked ? "Watermarked" : "Pending"}
                    </span>
                  )}
                </div>
                {output.subtitle && (
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500" title={output.subtitle}>
                    {output.subtitle}
                  </span>
                )}
                <span className="mt-1 block text-[11px] font-bold text-slate-400">
                  {formatDateTime(output.submittedAt)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-pink-100/60 pt-2.5 dark:border-neutral-800">
              {output.type === "link" ? (
                output.url ? (
                  <a
                    href={output.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8.5 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#c72fb2]/40 bg-white px-3 text-xs font-black text-[#c72fb2] shadow-2xs transition hover:bg-pink-50 dark:bg-neutral-900"
                  >
                    Open Link
                    <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span
                    className="inline-flex h-8.5 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-400 dark:border-neutral-800 dark:bg-neutral-900"
                    aria-disabled="true"
                  >
                    {output.protected ? "Payment required" : "Link unavailable"}
                  </span>
                )
              ) : (
                <>
                  {(output.available || output.url) && (
                    <button
                      type="button"
                      onClick={() => onViewOutput(project, output)}
                      className="inline-flex h-8.5 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#c72fb2]/40 bg-white px-3 text-xs font-black text-[#c72fb2] shadow-2xs transition hover:bg-pink-50 dark:bg-neutral-900"
                    >
                      View
                      <Icon name="eye" className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={(!output.url && output.source === "attachment") || isDownloadingOutput}
                    onClick={() => onDownloadOutput(project, output)}
                    className="inline-flex h-8.5 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#c72fb2]/40 bg-white px-3 text-xs font-black text-[#c72fb2] shadow-2xs transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:bg-neutral-900"
                  >
                    {output.source === "attachment" && !output.localAttachment
                      ? "Open"
                      : isDownloadingOutput
                        ? "Downloading..."
                        : "Download"}
                    <Icon
                      name={output.source === "attachment" && !output.localAttachment ? "external" : "download"}
                      className="h-3.5 w-3.5"
                    />
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="-mb-10 -mt-8 min-h-[calc(100dvh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-[#c72fb2]">
          <Icon name="arrow" className="h-4 w-4" />
          Back to My Projects
        </button>
        <span className="flex flex-wrap gap-3">
          {project.fullyPaid ? (
            <span
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-xs font-black text-emerald-700 shadow-2xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
              title={`Project is fully paid (₱${(project.paid || project.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
            >
              <Icon name="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Marked as Paid</span>
            </span>
          ) : (
            <>
              {project.paid > 0 && (
                <span
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                  title={`Down payment received: ₱${project.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                >
                  <Icon name="check" className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Down Payment Paid</span>
                </span>
              )}
              {project.amount > 0 && onPay && (
                <button
                  type="button"
                  onClick={() => onPay(project)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 px-5 text-xs font-black text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition hover:brightness-105 active:scale-98"
                  title="Pay securely with PayMongo (GCash, Maya, Cards, GrabPay)"
                >
                  <Icon name="credit-card" className="h-4 w-4" />
                  <span>{getPayButtonLabel(project)}</span>
                </button>
              )}
            </>
          )}
          {project.status === "Completed" ? (
            <button type="button" onClick={onFeedback} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.22)] transition hover:brightness-105">
              <Icon name="star" className="h-4 w-4" />
              {project.feedback ? "Edit Feedback" : "Give Feedback"}
            </button>
          ) : project.awaitingClientDecision ? (
            <>
              <button type="button" onClick={() => onRequestRevision(project)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e347a8]/40 bg-white px-5 text-xs font-black text-[#e347a8] transition hover:bg-pink-50">
                <Icon name="refresh" className="h-4 w-4" />
                Request Revision
              </button>
              <button type="button" onClick={() => onApprove(project)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-xs font-black text-white transition hover:bg-emerald-600">
                <Icon name="check" className="h-4 w-4" />
                Approve
              </button>
            </>
          ) : null}
          {onToggleArchive && (
            <button
              type="button"
              onClick={() => onToggleArchive(project, !project.archived)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              title={project.archived ? "Restore to active projects" : "Move project to archive"}
            >
              <Icon name="archive" className="h-4 w-4" />
              <span>{project.archived ? "Restore" : "Archive"}</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(project)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-xs font-black text-rose-600 transition hover:bg-rose-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-rose-400"
              title="Delete project"
            >
              <Icon name="delete" className="h-4 w-4" />
              <span>Delete</span>
            </button>
          )}
        </span>
      </header>
      {errorMessage && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{errorMessage}</p>}
      {noticeMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{noticeMessage}</p>}
      {isVerifyingPayment && (
        <div className="flex items-center gap-3 rounded-xl border border-[#c72fb2]/30 bg-pink-50/80 px-4 py-3 text-sm font-bold text-[#c72fb2]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Verifying PayMongo transaction... Please wait a moment while your project records update.</span>
        </div>
      )}


      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-black">Submitted Output</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Here are the latest files and links submitted by your team.</p>
          <div className="mt-4">{renderOutputs(outputItems.slice(0, 3))}</div>
          {outputItems.length > 3 && (
            <button
              type="button"
              onClick={() => setOpenActivityPanel("files")}
              className="mt-4 h-10 w-full rounded-lg border border-[#c72fb2]/40 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50"
            >
              View All Files ({outputItems.length})
            </button>
          )}
          {project.clientApproved && project.finalOutput?.submittedAt && (
            <div className={`mt-5 rounded-xl border p-4 ${project.newsfeedPermissionAllowed ? "border-emerald-200 bg-emerald-50/80" : "border-pink-100 bg-pink-50/40"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${project.newsfeedPermissionAllowed ? "bg-emerald-500 text-white" : "bg-pink-100 text-[#c72fb2]"}`}>
                  <Icon name={project.newsfeedPermissionAllowed ? "check" : "send"} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#10142d] dark:text-white">Permission to post this work</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                    {project.newsfeedPermissionAllowed
                      ? "Admin and assigned employees have been informed that they may post this approved work to the newsfeed."
                      : "Allow the admin and assigned employees to post this approved work to the newsfeed. This will not post it automatically."}
                  </span>
                  {project.newsfeedPermissionGrantedAt && project.newsfeedPermissionAllowed && (
                    <span className="mt-1 block text-[10px] font-bold text-emerald-600">Granted {formatDateTime(project.newsfeedPermissionGrantedAt)}</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSetNewsfeedPermission(project, !project.newsfeedPermissionAllowed)}
                className={`mt-3 h-10 w-full rounded-lg text-xs font-black transition ${project.newsfeedPermissionAllowed ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50" : "bg-[#c72fb2] text-white hover:brightness-105"}`}
              >
                {project.newsfeedPermissionAllowed ? "Remove Permission" : "Allow Newsfeed Posting"}
              </button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-black">Project Timeline</h2>
          <div className="mt-5 space-y-0">
            {renderTimeline(visibleTimeline)}
          </div>
          {timeline.length > 6 && <button type="button" onClick={() => setOpenActivityPanel("milestones")} className="mt-2 h-10 w-full rounded-lg border border-[#c72fb2]/40 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">View All Milestones ({timeline.length})</button>}
        </Card>
      </div>

      {project.status === "Completed" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 bg-emerald-50/50 p-5">
          <span className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-base font-black">Thank you for working with us!</span>
              <span className="mt-1 block text-sm font-semibold text-slate-500">If you are satisfied with our work, please give your feedback to help us improve.</span>
            </span>
          </span>
          <button type="button" onClick={() => onFeedback(project)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c72fb2] px-6 text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.22)] transition hover:brightness-105">
            <Icon name="star" className="h-4 w-4" />
            {project.feedback ? "Edit Feedback" : "Give Feedback"}
          </button>
        </Card>
      )}
      {project.feedback?.reply?.message && (
        <Card className="border-pink-100 bg-linear-to-r from-pink-50/80 to-violet-50/70 p-5 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-900">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-pink-500 to-violet-600 text-white"><Icon name="message" className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#10142d] dark:text-white">Admin Reply to Your Feedback</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{project.feedback.reply.message}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{getPersonName(project.feedback.reply.repliedBy, "CLIENTRA Admin")} · {formatDateTime(project.feedback.reply.repliedAt)}</p>
            </div>
          </div>
        </Card>
      )}
      {openActivityPanel === "milestones" && (
        <ProjectActivityPanel title="Project Milestones" count={timeline.length} onClose={() => setOpenActivityPanel(null)}>
          {renderTimeline(timeline)}
        </ProjectActivityPanel>
      )}
      {openActivityPanel === "files" && (
        <ProjectActivityPanel title="All Submitted Files and Links" count={outputItems.length} onClose={() => setOpenActivityPanel(null)}>
          {renderOutputs(outputItems)}
        </ProjectActivityPanel>
      )}
    </div>
  );
};

const SimpleFeedbackModal = ({ onClose, onSubmit, project }) => {
  const [rating, setRating] = useState(project.feedback?.rating || 0);
  const [comment, setComment] = useState(project.feedback?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!rating) {
      setFormError("Please select a rating.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      await onSubmit(project, { rating, comment });
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to submit feedback."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 p-3 backdrop-blur-[2px] sm:p-6">
      <form onSubmit={handleSubmit} className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.28)] sm:max-h-[calc(100dvh-3rem)] sm:p-6 dark:border-neutral-800 dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#10142d] dark:text-white">Share your feedback</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">How was the completed work on <span className="text-[#10142d] dark:text-white">{project.title}</span>?</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2]" aria-label="Close feedback form">x</button>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-black text-[#10142d] dark:text-white">Your rating</legend>
          <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} className={`grid h-11 min-w-0 w-full place-items-center rounded-lg text-xl transition ${value <= rating ? "bg-pink-50 text-[#c72fb2]" : "bg-slate-50 text-slate-300 hover:text-[#e347a8] dark:bg-neutral-900"}`}>
                ★
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 block text-sm font-black text-[#10142d] dark:text-white">
          Comments <span className="font-bold text-slate-400">(optional)</span>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={5} placeholder="Tell us what went well or what we can improve..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white" />
          <span className="mt-1 block text-right text-xs font-bold text-slate-400">{comment.length}/1000</span>
        </label>
        {formError && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-5 text-sm font-black text-slate-500 transition hover:bg-slate-100 dark:hover:bg-neutral-900">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="h-10 rounded-lg bg-[#c72fb2] px-5 text-sm font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Submitting..." : "Submit Feedback"}</button>
        </div>
      </form>
    </div>
  );
};

SimpleFeedbackModal.displayName = "SimpleFeedbackModal";

const RevisionModal = ({ errorMessage = "", isSubmitting = false, onClose, onSubmit, project }) => {
  const [form, setForm] = useState({
    title: "",
    priority: "",
    description: "",
    dueDate: "",
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const statusClass = statusStyles[project.status] || statusStyles["Pending Revisions"];

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    let submitForm = { ...form };
    if (file) {
      try {
        const dataUrl = await fileToDataUrl(file);
        submitForm.file = { dataUrl, fileName: file.name, size: file.size, type: file.type };
      } catch {
        setFileError("Unable to read the selected file.");
        return;
      }
    }

    onSubmit(project, submitForm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 p-3 backdrop-blur-[2px] sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-pink-50 sm:max-h-[calc(100dvh-3rem)] sm:p-6 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#10142d] dark:text-white">
              Request Revision
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Tell us what changes you'd like for this project.
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-900"
            aria-label="Close request revision"
          >
            x
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-pink-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-black text-[#10142d] dark:text-white">{project.title}</span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${statusClass}`}>{project.status}</span>
            </span>
            <span className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Icon name="calendar" className="h-4 w-4" />
                Due Date: {formatDate(project.dueDate)}
              </span>
              <span>Project ID: {project.id || "PRJ-1001"}</span>
            </span>
          </span>
        </div>

        <fieldset disabled={isSubmitting} className="m-0 mt-6 grid min-w-0 gap-4 border-0 p-0 disabled:opacity-70 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-600 dark:text-slate-300">Revision Title <span className="text-pink-500">*</span></span>
            <input
              required
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="e.g., Update hero section headline"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-600 dark:text-slate-300">Priority <span className="text-pink-500">*</span></span>
            <select
              required
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none transition focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
            >
              <option value="">Select priority</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-black text-slate-600 dark:text-slate-300">Description of Changes <span className="text-pink-500">*</span></span>
            <textarea
              required
              maxLength={1000}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Please describe the changes you'd like us to make in detail..."
              className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
            />
            <span className="mt-1 block text-xs font-bold text-slate-400">{form.description.length} / 1000 characters</span>
          </label>
          <div className="block">
            <span className="mb-2 block text-xs font-black text-slate-600 dark:text-slate-300">Reference Attachment <span className="font-bold text-slate-400">(optional)</span></span>
            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-pink-100 bg-white px-4 py-3 text-xs font-bold text-[#10142d] dark:border-neutral-800 dark:bg-neutral-950 dark:text-white">
                <span className="inline-flex min-w-0 items-center gap-3">
                  <Icon name="upload" className="h-5 w-5 text-[#c72fb2]" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button type="button" disabled={isSubmitting} onClick={() => { setFile(null); setFileError(""); }} className="text-slate-400 hover:text-[#c72fb2] disabled:cursor-not-allowed disabled:opacity-60" aria-label="Remove file">x</button>
              </div>
            ) : (
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <Icon name="upload" className="h-6 w-6 text-slate-400" />
                <span className="mt-2 text-sm font-black text-[#10142d] dark:text-white">Click to upload an attachment</span>
                <span className="mt-1 text-xs font-bold text-slate-500">Image, document, or audio (10MB max)</span>
                <input
                  type="file"
                  accept={PROJECT_OUTPUT_FILE_ACCEPT}
                  disabled={isSubmitting}
                  className="sr-only"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    const error = selectedFile ? getProjectOutputFileError(selectedFile, "Attachment") : "";
                    setFile(error ? null : selectedFile);
                    setFileError(error);
                  }}
                />
              </label>
            )}
            {fileError && <p className="mt-2 text-xs font-bold text-rose-600">{fileError}</p>}
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-600 dark:text-slate-300">Preferred Completion Date <span className="font-bold text-slate-400">(optional)</span></span>
            <span className="relative block">
              <input
                type="date"
                min={todayInputDate()}
                value={form.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none transition focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </span>
            <span className="mt-2 block text-xs font-bold text-slate-500">Let us know if you have a target date in mind.</span>
          </label>
        </fieldset>

        {errorMessage && <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{errorMessage}</p>}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-12 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-6 text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="send" className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
};

const RatingStars = ({ label, onChange, required = false, value }) => (
  <div className="grid gap-2 min-[400px]:flex min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-4">
    <span className="text-xs font-black text-slate-600 dark:text-slate-300">
      {label} {required && <span className="text-pink-500">*</span>}
    </span>
    <span className="grid grid-cols-5 gap-1.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`flex h-9 min-w-0 w-full items-center justify-center rounded-md transition min-[400px]:w-7 ${rating <= value ? "bg-amber-50 text-amber-500" : "text-slate-300 hover:bg-amber-50 hover:text-amber-400"}`}
          aria-label={`${rating} star rating`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={rating <= value ? "currentColor" : "none"} aria-hidden="true">
            <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </span>
  </div>
);

const FeedbackModal = ({ errorMessage = "", isSubmitting = false, onClose, onSubmit, project }) => {
  const feedback = project.feedback || {};
  const [form, setForm] = useState({
    overallRating: feedback.overallRating || 0,
    quality: feedback.quality || 0,
    communication: feedback.communication || 0,
    timeliness: feedback.timeliness || 0,
    overallSatisfaction: feedback.overallSatisfaction || 0,
    comment: feedback.comment || "",
    wouldRecommend: feedback.wouldRecommend === false ? "no" : feedback.wouldRecommend ? "yes" : "",
  });

  const updateRating = (field, value) =>
    setForm((currentForm) => ({ ...currentForm, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    onSubmit(project, {
      ...form,
      wouldRecommend: form.wouldRecommend === "yes",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 p-3 backdrop-blur-[2px] sm:p-6">
      <form onSubmit={handleSubmit} className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-pink-50 sm:max-h-[calc(100dvh-3rem)] sm:p-6 dark:border-neutral-800 dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#10142d] dark:text-white">Give Feedback</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">Tell us about your experience with this project.</p>
          </div>
          <button type="button" disabled={isSubmitting} onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close feedback">x</button>
        </div>

        <div className="mt-5 rounded-xl border border-pink-100 bg-pink-50/30 p-4">
          <p className="text-sm font-black text-[#10142d]">{project.title}</p>
          <p className="mt-1 text-xs font-bold text-emerald-600">Completed {formatDate(project.completedAt || project.updatedAt)}</p>
        </div>

        <fieldset disabled={isSubmitting} className="m-0 mt-5 space-y-4 border-0 p-0 disabled:opacity-70">
          <RatingStars label="Overall Rating" required value={form.overallRating} onChange={(value) => updateRating("overallRating", value)} />
          <div className="rounded-xl border border-pink-100 p-4">
            <p className="mb-3 text-xs font-black text-slate-600">Detailed Ratings <span className="font-bold text-slate-400">(optional)</span></p>
            <div className="space-y-3">
              <RatingStars label="Quality of Work" value={form.quality} onChange={(value) => updateRating("quality", value)} />
              <RatingStars label="Communication" value={form.communication} onChange={(value) => updateRating("communication", value)} />
              <RatingStars label="Timeliness" value={form.timeliness} onChange={(value) => updateRating("timeliness", value)} />
              <RatingStars label="Overall Satisfaction" value={form.overallSatisfaction} onChange={(value) => updateRating("overallSatisfaction", value)} />
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-600">Your Feedback</span>
            <textarea value={form.comment} onChange={(event) => updateRating("comment", event.target.value)} maxLength={1000} rows={4} placeholder="Share your thoughts about the project..." className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100" />
          </label>
          <fieldset>
            <legend className="mb-2 text-xs font-black text-slate-600">Would you recommend us?</legend>
            <div className="flex items-center gap-5 text-xs font-bold text-slate-600">
              <label className="inline-flex items-center gap-2"><input type="radio" name="recommend" checked={form.wouldRecommend === "yes"} onChange={() => updateRating("wouldRecommend", "yes")} className="accent-[#c72fb2]" />Yes, definitely</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="recommend" checked={form.wouldRecommend === "no"} onChange={() => updateRating("wouldRecommend", "no")} className="accent-[#c72fb2]" />Not really</label>
            </div>
          </fieldset>
        </fieldset>

        {errorMessage && <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{errorMessage}</p>}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button type="button" disabled={isSubmitting} onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={!form.overallRating || isSubmitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c72fb2] text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="send" className="h-4 w-4" />{isSubmitting ? "Submitting..." : "Submit Feedback"}</button>
        </div>
      </form>
    </div>
  );
};

const FeedbackSuccessModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/45 px-4 backdrop-blur-[2px]">
    <section className="w-full max-w-sm rounded-2xl border border-pink-100 bg-white px-7 py-9 text-center shadow-[0_22px_60px_rgba(15,23,42,0.28)]">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.26)]"><Icon name="check" className="h-9 w-9" /></span>
      <h2 className="mt-5 text-2xl font-black text-[#10142d]">Feedback Submitted!</h2>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-500">Thank you for your feedback. Your response helps us improve our service.</p>
      <button type="button" onClick={onClose} className="mt-6 h-10 rounded-lg bg-[#c72fb2] px-9 text-sm font-black text-white shadow-[0_8px_18px_rgba(199,47,178,0.22)]">Close</button>
    </section>
  </div>
);

const ClientProjectsSkeleton = () => (
  <div className="-mb-10 -mt-8 min-h-[calc(100dvh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:px-6 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px] lg:w-auto lg:min-w-[620px]">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </header>

    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <span className="min-w-0 flex-1">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="mt-2 h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-24" />
            </span>
          </div>
        </Card>
      ))}
    </div>

    <Card className="overflow-hidden">
      <div className="flex gap-4 overflow-x-auto border-b border-pink-50 px-5 dark:border-neutral-800">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="flex h-12 items-center px-2">
            <Skeleton className="h-3 w-20" />
          </span>
        ))}
      </div>

      <div className="p-5">
        <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1">
                      <Skeleton className="h-5 w-44 max-w-full" />
                      <Skeleton className="mt-2 h-3 w-56 max-w-full" />
                    </span>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </span>
                  <span className="mt-5 block">
                    <span className="mb-2 flex items-center justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </span>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </span>
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <span className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <span>
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="mt-1 h-3 w-20" />
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <span>
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="mt-1 h-3 w-20" />
                  </span>
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((__, statIndex) => (
                  <span key={statIndex}>
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="mt-2 h-4 w-12" />
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-[1fr_1fr_36px] gap-2">
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-9 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-pink-50 px-5 py-4 dark:border-neutral-800">
        <Skeleton className="h-3 w-48" />
        <span className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </span>
      </div>
    </Card>
  </div>
);

const ClientProjects = () => {
  const queryClient = useQueryClient();
  const tasksParams = useMemo(() => ({ limit: 100, view: "client-projects" }), []);

  const {
    data: rawProjects = [],
    isLoading,
    error: tasksError,
  } = useTasksQuery(tasksParams);

  const [selectedProjectId, setSelectedProjectId] = useState("");

  const {
    data: rawProjectDetails,
    isLoading: isLoadingProjectDetails,
    error: projectDetailsError,
  } = useTaskDetailsQuery(selectedProjectId);

  const {
    requestRevision: requestRevisionMutation,
    approveTask: approveTaskMutation,
    setArchived: setArchivedMutation,
    setNewsfeedPermission: setNewsfeedPermissionMutation,
    submitFeedback: submitFeedbackMutation,
    deleteTask: deleteTaskMutation,
    invalidateTaskData,
  } = useTaskMutations();

  const isApprovingProject = approveTaskMutation.isPending;
  const isArchivingProject = setArchivedMutation.isPending;
  const isDeletingProject = deleteTaskMutation.isPending;
  const isSubmittingFeedback = submitFeedbackMutation.isPending;
  const isSubmittingRevision = requestRevisionMutation.isPending;
  const isUpdatingPermission = setNewsfeedPermissionMutation.isPending;

  const [approveProject, setApproveProject] = useState(null);
  const [localErrorMessage, setLocalErrorMessage] = useState("");
  const [feedbackProject, setFeedbackProject] = useState(null);
  const [feedbackSuccessProject, setFeedbackSuccessProject] = useState(null);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [revisionProject, setRevisionProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Newest to Oldest");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [archiveAction, setArchiveAction] = useState(null);
  const [deleteAction, setDeleteAction] = useState(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [permissionAction, setPermissionAction] = useState(null);
  const [isDownloadingOutputId, setIsDownloadingOutputId] = useState("");
  const [payMongoTask, setPayMongoTask] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const noticeTimerRef = useRef(null);

  const errorMessage =
    localErrorMessage ||
    (tasksError ? getApiErrorMessage(tasksError, "Unable to load projects.") : "") ||
    (projectDetailsError ? getApiErrorMessage(projectDetailsError, "Unable to load project details.") : "");
  const setErrorMessage = setLocalErrorMessage;

  const projects = useMemo(() => {
    const list = Array.isArray(rawProjects) ? rawProjects : [];
    return list.map(normalizeProject);
  }, [rawProjects]);

  const selectedProject = useMemo(() => {
    if (rawProjectDetails) return normalizeProject(rawProjectDetails);
    if (selectedProjectId) {
      return projects.find((item) => item.id === selectedProjectId) || null;
    }
    return null;
  }, [projects, rawProjectDetails, selectedProjectId]);

  const updateProjectInCache = useCallback(
    (updatedTask) => {
      const normalized = normalizeProject(updatedTask);
      queryClient.setQueryData(QUERY_KEYS.tasks(tasksParams), (old) => {
        const list = Array.isArray(old) ? old : [];
        return list.map((item) =>
          getEntityId(item) === normalized.id ? normalized : item
        );
      });
      if (selectedProjectId === normalized.id) {
        queryClient.setQueryData(QUERY_KEYS.taskDetails(normalized.id), normalized);
      }
      invalidateTaskData(normalized.id);
      return normalized;
    },
    [invalidateTaskData, queryClient, selectedProjectId, tasksParams]
  );

  useEffect(() => () => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
  }, []);

  const showNotice = (message) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNoticeMessage(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNoticeMessage("");
      noticeTimerRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    const handlePaymentRedirect = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get("payment");
      const taskId = params.get("taskId");
      const sessionId = params.get("session_id");
      const paymentId = params.get("paymentId");

      if (!paymentStatus) return;

      if (paymentStatus === "cancelled") {
        showNotice("Payment was cancelled. You can resume checkout at any time.");
        params.delete("payment");
        params.delete("taskId");
        params.delete("session_id");
        params.delete("paymentId");
        params.delete("simulated");
        const newSearch = params.toString() ? `?${params.toString()}` : "";
        window.history.replaceState({}, document.title, `${window.location.pathname}${newSearch}`);
        return;
      }

      if (
        paymentStatus === "success" &&
        (paymentId || taskId || (sessionId && sessionId !== "{CHECKOUT_SESSION_ID}"))
      ) {
        try {
          setIsVerifyingPayment(true);
          const response = await paymentAPI.verifyCheckoutSession({ sessionId, taskId, paymentId });
          if (response?.data?.task) {
            updateProjectInCache(response.data.task);
          }
          invalidateTaskData(taskId || response?.data?.task?._id);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientDashboard() });
          queryClient.invalidateQueries({ queryKey: ["budget"] });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });

          const amountPaid = response?.data?.payment?.amount;
          const formatted = amountPaid
            ? `₱${Number(amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "";
          showNotice(`Payment confirmed! ${formatted ? `${formatted} received` : "Transaction complete"} via PayMongo.`);
          if (taskId) setSelectedProjectId(taskId);
        } catch (error) {
          console.error("Payment verification failed:", error);
          setLocalErrorMessage(getApiErrorMessage(error, "Failed to verify PayMongo payment session."));
        } finally {
          setIsVerifyingPayment(false);
          params.delete("payment");
          params.delete("taskId");
          params.delete("session_id");
          params.delete("paymentId");
          params.delete("simulated");
          const newSearch = params.toString() ? `?${params.toString()}` : "";
          window.history.replaceState({}, document.title, `${window.location.pathname}${newSearch}`);
        }
      }
    };

    handlePaymentRedirect();
  }, [invalidateTaskData, queryClient, setLocalErrorMessage, updateProjectInCache]);

  useEffect(() => {
    const openNotificationTarget = () => {
      if (isLoading || projects.length === 0) return;
      try {
        const target = JSON.parse(sessionStorage.getItem(notificationTargetKey) || "null");
        if (target?.page !== "projects" || !target?.taskId) return;
        const project = projects.find((item) => item.id === target.taskId);
        if (project) {
          setSelectedProjectId(project.id);
          sessionStorage.removeItem(notificationTargetKey);
        }
      } catch {
        sessionStorage.removeItem(notificationTargetKey);
      }
    };

    openNotificationTarget();
  }, [isLoading, projects]);

  const visibleProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects
      .filter((project) => {
        const matchesStatus =
          statusFilter === "All Status"
            ? !project.archived
            : statusFilter === "Archived"
            ? project.archived
            : !project.archived && project.status === statusFilter;
        const matchesSearch =
          !normalizedSearch ||
          [project.title, project.description, project.status]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        return matchesStatus && matchesSearch;
      })
      .sort((first, second) => {
        if (sortBy === "Oldest to Newest" || sortBy === "Oldest") {
          const firstTime = parseDate(first.createdAt) || parseDate(first.startDate) || parseDate(first.updatedAt) || 0;
          const secondTime = parseDate(second.createdAt) || parseDate(second.startDate) || parseDate(second.updatedAt) || 0;
          return firstTime - secondTime;
        }
        if (sortBy === "Due Date") {
          return (parseDate(first.dueDate) || new Date(8640000000000000)) - (parseDate(second.dueDate) || new Date(8640000000000000));
        }
        if (sortBy === "Progress") {
          return second.progress - first.progress;
        }
        const firstTime = parseDate(first.createdAt) || parseDate(first.startDate) || parseDate(first.updatedAt) || 0;
        const secondTime = parseDate(second.createdAt) || parseDate(second.startDate) || parseDate(second.updatedAt) || 0;
        return secondTime - firstTime;
      });
  }, [projects, searchTerm, sortBy, statusFilter]);

  const handleOpenFeedback = async (project) => {
    try {
      setErrorMessage("");
      const completeProject = selectedProject?.id === project.id
        ? selectedProject
        : normalizeProject(await taskAPI.getById(project.id, { refresh: true }));
      setFeedbackProject(completeProject);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to load project feedback."));
    }
  };

  const handleArchiveProject = async () => {
    const action = archiveAction;
    if (!action || isArchivingProject) return;
    try {
      setErrorMessage("");
      const res = await setArchivedMutation.mutateAsync({
        id: action.project.id,
        archived: action.archived,
      });
      updateProjectInCache(unwrapData(res));
      setArchiveAction(null);
      showNotice(action.archived ? "Project moved to Archived." : "Project restored to My Projects.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, action.archived ? "Unable to archive the project." : "Unable to restore the project."));
    }
  };

  const handleDeleteProject = async () => {
    const project = deleteAction;
    if (!project || isDeletingProject) return;
    try {
      setErrorMessage("");
      await deleteTaskMutation.mutateAsync(project.id);
      queryClient.setQueryData(QUERY_KEYS.tasks(tasksParams), (old) => {
        const list = Array.isArray(old) ? old : [];
        return list.filter((item) => getEntityId(item) !== project.id);
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientDashboard() });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
      if (selectedProjectId === project.id) {
        setSelectedProjectId("");
      }
      setDeleteAction(null);
      showNotice(`“${project.title}” was permanently deleted.`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to delete the project."));
    }
  };

  const handleSubmitRevision = async (project, form) => {
    if (isSubmittingRevision) return;

    try {
      setErrorMessage("");
      const res = await requestRevisionMutation.mutateAsync({
        id: project.id,
        revision: form,
      });
      updateProjectInCache(unwrapData(res));
      setRevisionProject(null);
      setRevisionMessage(`Revision request submitted for ${project.title}.`);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit revision request."));
    }
  };

  const handleDownloadOutput = async (project, output) => {
    try {
      setIsDownloadingOutputId(project.id);
      setErrorMessage("");
      if (output.source === "attachment") {
        if (output.localAttachment) {
          await taskAPI.downloadAttachment(project.id, output.attachmentIndex, output.title);
        } else if (output.url) {
          window.open(output.url, "_blank", "noopener,noreferrer");
        } else {
          throw new Error("This attachment is unavailable.");
        }
        return;
      }
      await taskAPI.downloadOutput(project.id, output.title, {
        watermark: project.paymentPending && !project.finalOutput?.watermarked,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to download the uploaded file."));
    } finally {
      setIsDownloadingOutputId("");
    }
  };

  const handleViewOutput = async (project, output) => {
    try {
      setErrorMessage("");
      if (output.source === "attachment") {
        if (output.localAttachment) {
          await taskAPI.viewAttachment(project.id, output.attachmentIndex, output.title);
        } else if (output.url) {
          window.open(output.url, "_blank", "noopener,noreferrer");
        } else {
          throw new Error("This attachment is unavailable.");
        }
        return;
      }
      await taskAPI.viewOutput(project.id, output.title, {
        watermark: project.paymentPending && !project.finalOutput?.watermarked,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to open the submitted output."));
    }
  };

  const handleApproveProject = async () => {
    const project = approveProject;
    if (!project || isApprovingProject) return;

    try {
      setErrorMessage("");
      const res = await approveTaskMutation.mutateAsync(project.id);
      updateProjectInCache(unwrapData(res));
      setApproveProject(null);
      showNotice(`${project.title} was approved.`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to approve the project."));
    }
  };

  const handleUpdateNewsfeedPermission = async () => {
    const action = permissionAction;
    if (!action || isUpdatingPermission) return;

    try {
      setErrorMessage("");
      const res = await setNewsfeedPermissionMutation.mutateAsync({
        id: action.project.id,
        allowed: action.allowed,
      });
      updateProjectInCache(unwrapData(res));
      setPermissionAction(null);
      showNotice(
        action.allowed
          ? `Admin and assigned employees may now post ${action.project.title} to the newsfeed.`
          : `Newsfeed posting permission was removed for ${action.project.title}.`
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to update newsfeed posting permission."));
      setPermissionAction(null);
    }
  };

  const handleSubmitFeedback = async (project, form) => {
    if (isSubmittingFeedback) return;

    try {
      setErrorMessage("");
      const res = await submitFeedbackMutation.mutateAsync({
        id: project.id,
        feedback: form,
      });
      const updatedProject = updateProjectInCache(unwrapData(res));
      setFeedbackProject(null);
      setFeedbackSuccessProject(updatedProject);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit feedback."));
    }
  };

  if (isLoading) {
    return <ClientProjectsSkeleton />;
  }

  if (selectedProjectId && isLoadingProjectDetails) {
    return <ClientProjectsSkeleton />;
  }

  if (selectedProjectId && selectedProject) {
    return (
      <>
        <ProjectDetails
          errorMessage={errorMessage}
          isDownloadingOutput={isDownloadingOutputId === selectedProject.id}
          isVerifyingPayment={isVerifyingPayment}
          noticeMessage={noticeMessage}
          onApprove={(project) => {
            setErrorMessage("");
            setApproveProject(project);
          }}
          onBack={() => setSelectedProjectId("")}
          onDelete={(project) => {
            setErrorMessage("");
            setDeleteAction(project);
          }}
          onDownloadOutput={handleDownloadOutput}
          onFeedback={() => handleOpenFeedback(selectedProject)}
          onPay={(project) => {
            setErrorMessage("");
            setPayMongoTask(project);
          }}
          onRequestRevision={(project) => {
            setErrorMessage("");
            setRevisionMessage("");
            setRevisionProject(project);
          }}
          onSetNewsfeedPermission={(project, allowed) => setPermissionAction({ project, allowed })}
          onToggleArchive={(project, archived) => {
            setErrorMessage("");
            setArchiveAction({ project, archived });
          }}
          onViewOutput={handleViewOutput}
          project={selectedProject}
        />
        {payMongoTask && (
          <PayMongoModal
            isOpen={Boolean(payMongoTask)}
            onClose={() => setPayMongoTask(null)}
            onSuccess={() => {
              setPayMongoTask(null);
              invalidateTaskData(payMongoTask.id);
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks() });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientDashboard() });
              queryClient.invalidateQueries({ queryKey: ["budget"] });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
              showNotice("Payment session completed!");
            }}
            task={payMongoTask}
          />
        )}
        {revisionProject && (
          <RevisionModal
            errorMessage={errorMessage}
            isSubmitting={isSubmittingRevision}
            onClose={() => {
              setErrorMessage("");
              setRevisionProject(null);
            }}
            onSubmit={handleSubmitRevision}
            project={revisionProject}
          />
        )}
        {feedbackProject && (
          <FeedbackModal
            errorMessage={errorMessage}
            isSubmitting={isSubmittingFeedback}
            key={feedbackProject.id}
            onClose={() => {
              setErrorMessage("");
              setFeedbackProject(null);
            }}
            onSubmit={handleSubmitFeedback}
            project={feedbackProject}
          />
        )}
        {feedbackSuccessProject && (
          <FeedbackSuccessModal onClose={() => setFeedbackSuccessProject(null)} />
        )}
        <ConfirmDialog
          confirmLabel={archiveAction?.archived ? "Archive" : "Restore"}
          confirmingLabel={archiveAction?.archived ? "Archiving..." : "Restoring..."}
          errorMessage={errorMessage}
          icon="done"
          isConfirming={isArchivingProject}
          isOpen={Boolean(archiveAction)}
          message={archiveAction?.archived ? `Archive “${archiveAction.project.title}”? You can restore it later from the Archived filter.` : `Restore “${archiveAction?.project.title}” to My Projects?`}
          onCancel={() => {
            setErrorMessage("");
            setArchiveAction(null);
          }}
          onConfirm={handleArchiveProject}
          title={archiveAction?.archived ? "Archive Project" : "Restore Project"}
        />
        <ConfirmDialog
          cancelLabel="Cancel"
          confirmLabel="Delete"
          confirmingLabel="Deleting..."
          errorMessage={errorMessage}
          icon="delete"
          isConfirming={isDeletingProject}
          isOpen={Boolean(deleteAction)}
          message={`Permanently delete “${deleteAction?.title || "this project"}”? This cannot be undone.`}
          onCancel={() => {
            setErrorMessage("");
            setDeleteAction(null);
          }}
          onConfirm={handleDeleteProject}
          title="Delete Project"
        />
        <ConfirmDialog
          confirmLabel="Approve"
          confirmingLabel="Approving..."
          errorMessage={errorMessage}
          icon="done"
          isConfirming={isApprovingProject}
          isOpen={Boolean(approveProject)}
          message={`Approve “${approveProject?.title || "this project"}”? This will mark the submitted output as completed.`}
          onCancel={() => {
            setErrorMessage("");
            setApproveProject(null);
          }}
          onConfirm={handleApproveProject}
          title="Approve Project"
        />
        <ConfirmDialog
          confirmLabel={permissionAction?.allowed ? "Allow" : "Remove"}
          confirmingLabel="Saving..."
          icon="done"
          isConfirming={isUpdatingPermission}
          isOpen={Boolean(permissionAction)}
          message={permissionAction?.allowed
            ? `Allow admin and assigned employees to post “${permissionAction?.project.title}” to the newsfeed? This will not post it automatically.`
            : `Remove newsfeed posting permission for “${permissionAction?.project.title}”?`}
          onCancel={() => setPermissionAction(null)}
          onConfirm={handleUpdateNewsfeedPermission}
          title={permissionAction?.allowed ? "Allow Newsfeed Posting" : "Remove Permission"}
        />
      </>
    );
  }

  return (
    <div className="-mb-10 -mt-8 min-h-[calc(100dvh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl">My Projects</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Track the progress of all your projects in one place.
          </p>
        </div>
        <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_150px_150px] lg:w-auto lg:min-w-[620px]">
          <label className="relative block">
            <span className="sr-only">Search projects</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search projects..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm font-bold text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
            />
            <Icon name="search" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          </label>
          <label className="relative block">
            <span className="sr-only">Status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-black text-[#10142d] outline-none transition focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
            >
              {statusFilters.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <Icon name="filter" className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </label>
          <label className="block">
            <span className="sr-only">Sort projects</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#10142d] outline-none transition focus:border-[#e347a8] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
            >
              {sortOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {errorMessage && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {errorMessage}
        </p>
      )}
      {revisionMessage && (
        <p className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm font-bold text-[#c72fb2]">
          {revisionMessage}
        </p>
      )}
      {noticeMessage && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{noticeMessage}</p>}
      {isVerifyingPayment && (
        <div className="flex items-center gap-3 rounded-xl border border-[#c72fb2]/30 bg-pink-50/80 px-4 py-3 text-sm font-bold text-[#c72fb2]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Verifying PayMongo transaction... Please wait a moment while your project records update.</span>
        </div>
      )}
      <ProjectStats projects={projects.filter((project) => !project.archived)} />

      <section className="space-y-4">
        {visibleProjects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
              No projects found.
            </p>
          </div>
        ) : (
          <ProjectGroupTable
            tasks={visibleProjects}
            showAssignee={false}
            showProgress={true}
            hideEmptyGroups={statusFilter !== "All Status"}
            onSelectTask={(taskId) => setSelectedProjectId(String(taskId))}
          />
        )}
      </section>
      <ConfirmDialog
        confirmLabel={archiveAction?.archived ? "Archive" : "Restore"}
        confirmingLabel={archiveAction?.archived ? "Archiving..." : "Restoring..."}
        errorMessage={errorMessage}
        icon="done"
        isConfirming={isArchivingProject}
        isOpen={Boolean(archiveAction)}
        message={archiveAction?.archived ? `Archive “${archiveAction.project.title}”? You can restore it later from the Archived filter.` : `Restore “${archiveAction?.project.title}” to My Projects?`}
        onCancel={() => {
          setErrorMessage("");
          setArchiveAction(null);
        }}
        onConfirm={handleArchiveProject}
        title={archiveAction?.archived ? "Archive Project" : "Restore Project"}
      />
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        errorMessage={errorMessage}
        icon="delete"
        isConfirming={isDeletingProject}
        isOpen={Boolean(deleteAction)}
        message={`Permanently delete “${deleteAction?.title || "this project"}”? This cannot be undone.`}
        onCancel={() => {
          setErrorMessage("");
          setDeleteAction(null);
        }}
        onConfirm={handleDeleteProject}
        title="Delete Project"
      />
      <ConfirmDialog
        confirmLabel="Approve"
        confirmingLabel="Approving..."
        errorMessage={errorMessage}
        icon="done"
        isConfirming={isApprovingProject}
        isOpen={Boolean(approveProject)}
        message={`Approve “${approveProject?.title || "this project"}”? This will mark the submitted output as completed.`}
        onCancel={() => {
          setErrorMessage("");
          setApproveProject(null);
        }}
        onConfirm={handleApproveProject}
        title="Approve Project"
      />
      {revisionProject && (
        <RevisionModal
          errorMessage={errorMessage}
          isSubmitting={isSubmittingRevision}
          onClose={() => {
            setErrorMessage("");
            setRevisionProject(null);
          }}
          onSubmit={handleSubmitRevision}
          project={revisionProject}
        />
      )}
      {feedbackProject && (
        <FeedbackModal
          errorMessage={errorMessage}
          isSubmitting={isSubmittingFeedback}
          key={feedbackProject.id}
          onClose={() => {
            setErrorMessage("");
            setFeedbackProject(null);
          }}
          onSubmit={handleSubmitFeedback}
          project={feedbackProject}
        />
      )}
      {feedbackSuccessProject && (
        <FeedbackSuccessModal onClose={() => setFeedbackSuccessProject(null)} />
      )}
      {payMongoTask && (
        <PayMongoModal
          isOpen={Boolean(payMongoTask)}
          onClose={() => setPayMongoTask(null)}
          onSuccess={() => {
            setPayMongoTask(null);
            invalidateTaskData(payMongoTask.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks() });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientDashboard() });
            queryClient.invalidateQueries({ queryKey: ["budget"] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard() });
            showNotice("Payment session completed!");
          }}
          task={payMongoTask}
        />
      )}
    </div>
  );
};

export default ClientProjects;
