import { useEffect, useMemo, useState } from "react";
import Skeleton from "../../components/Skeleton.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { getApiErrorMessage, taskAPI } from "../../services/api.js";

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

const progressColors = {
  "In Progress": "bg-[#c72fb2]",
  "In Review": "bg-orange-500",
  Completed: "bg-emerald-500",
  "Pending Revisions": "bg-pink-500",
};

const statStyles = {
  "In Progress": "bg-pink-50 text-[#c72fb2] ring-[#c72fb2]/20",
  "In Review": "bg-orange-50 text-orange-500 ring-orange-500/20",
  Completed: "bg-emerald-50 text-emerald-500 ring-emerald-500/20",
  "Pending Revisions": "bg-pink-50 text-pink-500 ring-pink-500/20",
};

const tabs = ["All Projects", "In Progress", "In Review", "Completed", "Archived"];
const statusFilters = ["All Status", "In Progress", "In Review", "Completed", "Pending Revisions"];
const sortOptions = ["Newest", "Oldest", "Due Date", "Progress"];
const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

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
  return <svg {...props}><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
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

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);

const getPersonName = (person, fallback = "Clientra Team") => {
  if (!person || typeof person === "string") return fallback;
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.companyName || person.email || fallback;
};

const getFileUrl = (fileUrl) => {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http") ? fileUrl : `${API_ROOT}${fileUrl}`;
};

const normalizeProject = (task) => {
  const subtasks = normalizeSubtasks(task?.subtasks);
  const status = statusFromApi[task?.status] || task?.status || "Pending Revisions";
  const attachments = Array.isArray(task?.attachments) ? task.attachments : [];
  const finalOutput = task?.finalOutput || null;
  const amount = Number(task?.amount ?? task?.budget ?? 0);
  const paid = Number(task?.paid ?? 0);
  const fullyPaid = amount > 0 && paid >= amount;
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
    amount,
    paid,
    pendingAmount: Math.max(0, amount - paid),
    fullyPaid,
    paymentPending: !fullyPaid,
    files: uploadedFileIds.size,
    priority: task?.priority || "medium",
    progress: getTaskProgress(subtasks),
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
  };
};

const ProjectStats = ({ projects }) => {
  const stats = [
    { label: "In Progress", value: projects.filter((item) => item.status === "In Progress").length, sub: "Active projects", icon: "folder" },
    { label: "In Review", value: projects.filter((item) => item.status === "In Review").length, sub: "Awaiting your review", icon: "hourglass" },
    { label: "Completed", value: projects.filter((item) => item.status === "Completed").length, sub: "Successfully delivered", icon: "check" },
    { label: "Pending Revisions", value: projects.filter((item) => item.status === "Pending Revisions").length, sub: "Action needed", icon: "refresh" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <Card key={item.label} className="p-5">
          <div className="flex items-center gap-4">
            <span className={`grid h-16 w-16 place-items-center rounded-2xl ring-1 ${statStyles[item.label]}`}>
              <Icon name={item.icon} className="h-8 w-8" />
            </span>
            <span>
              <span className="block text-3xl font-black text-[#10142d] dark:text-white">{item.value}</span>
              <span className="block text-sm font-black text-[#10142d] dark:text-white">{item.label}</span>
              <span className="mt-1 block text-xs font-bold text-slate-500">{item.sub}</span>
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
};

const ProjectCard = ({ onApprove, onFeedback, onRequestRevision, onToggleArchive, onViewDetails, project }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusClass = statusStyles[project.status] || statusStyles["Pending Revisions"];
  const progressClass = progressColors[project.status] || progressColors["Pending Revisions"];

  return (
    <Card className="overflow-hidden p-4">
      <div>
        <span className="min-w-0">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-[#10142d] dark:text-white">{project.title}</span>
              <span className="mt-1 block truncate text-xs font-bold text-slate-500">{project.description}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${statusClass}`}>{project.status}</span>
              {project.archived && <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500 dark:bg-neutral-800">Archived</span>}
            </span>
          </span>

          <span className="mt-4 block">
            <span className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </span>
            <span className="block h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
              <span className={`block h-2 rounded-full ${progressClass}`} style={{ width: `${Math.max(project.progress, project.status === "Completed" ? 100 : 10)}%` }} />
            </span>
          </span>
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-2">
          <Icon name="calendar" className="h-4 w-4" />
          <span><span className="block text-[10px] font-black text-slate-400">Start Date</span>{formatDate(project.startDate)}</span>
        </span>
        <span className="flex items-center gap-2">
          <Icon name="calendar" className="h-4 w-4" />
          <span><span className="block text-[10px] font-black text-slate-400">Due Date</span>{formatDate(project.dueDate)}</span>
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-xs font-bold text-slate-500">
        <span className="min-w-0">
          <span className="block text-[10px] font-black text-slate-400">Developer</span>
          <span className="block truncate font-black text-[#10142d] dark:text-white" title={getPersonName(project.assignedTo, "Unassigned")}>
            {getPersonName(project.assignedTo, "Unassigned")}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-black text-slate-400">Revisions</span>
          <span className="font-black text-[#10142d] dark:text-white">{project.revisions} pending</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-black text-slate-400">Files</span>
          <span className="inline-flex items-center gap-1 font-black text-[#10142d] dark:text-white">
            <Icon name="file" className="h-4 w-4 text-blue-500" /> {project.files}
          </span>
        </span>
      </div>

      {project.status === "Completed" ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => onFeedback(project)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#c72fb2] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(199,47,178,0.2)] transition hover:brightness-105"
          >
            <Icon name="star" className="h-4 w-4" />
            {project.feedback ? "Edit Feedback" : "Give Feedback"}
          </button>
        </div>
      ) : project.awaitingClientDecision ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onRequestRevision(project)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e347a8]/40 bg-white px-3 text-xs font-black text-[#e347a8] transition hover:bg-pink-50 dark:bg-[#141414]"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Request Revision
            </button>
            <button
              type="button"
              onClick={() => onApprove(project)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-xs font-black text-white transition hover:bg-emerald-600"
            >
              <Icon name="check" className="h-4 w-4" />
              Approve
            </button>
        </div>
      ) : null}

      <div className={`${project.status === "Completed" || project.awaitingClientDecision ? "mt-2" : "mt-5"} grid grid-cols-[1fr_36px] gap-2`}>
        <button type="button" onClick={() => onViewDetails(project)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#c72fb2]/40 bg-pink-50/70 px-3 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
          <Icon name="eye" className="h-4 w-4" />
          View Details
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid h-9 w-full place-items-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-pink-50 hover:text-[#e347a8] dark:bg-neutral-900" aria-label={`More options for ${project.title}`} aria-expanded={menuOpen}>
            <Icon name="dots" className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-11 right-0 z-20 w-44 rounded-xl border border-pink-100 bg-white p-1.5 shadow-[0_14px_34px_rgba(30,20,45,0.18)] dark:border-neutral-700 dark:bg-neutral-900">
              <button type="button" onClick={() => { setMenuOpen(false); onToggleArchive(project, !project.archived); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-[#c72fb2] dark:text-slate-300 dark:hover:bg-neutral-800">
                <Icon name={project.archived ? "refresh" : "folder"} className="h-4 w-4" />
                {project.archived ? "Restore Project" : "Archive Project"}
              </button>
            </div>
          )}
        </div>
      </div>
      {project.status === "Completed" && project.feedback && (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-700">
            <span className="inline-flex min-w-0 items-center gap-2"><Icon name="star" className="h-4 w-4 shrink-0" />You've submitted feedback</span>
          </div>
          {project.feedback.reply?.message && (
            <div className="mt-2 rounded-lg border border-pink-100 bg-pink-50/70 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#c72fb2]">Admin replied</p>
              <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-600 dark:text-slate-300">{project.feedback.reply.message}</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

const DetailRow = ({ label, value }) => (
  <p className="grid grid-cols-[150px_1fr] gap-4 py-2 text-sm font-bold">
    <span className="text-slate-500">{label}</span>
    <span className="text-[#10142d] dark:text-white">{value || "N/A"}</span>
  </p>
);

const ProjectActivityPanel = ({ children, count, onClose, title }) => (
  <div
    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
    onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    role="presentation"
  >
    <section
      className="flex max-h-[min(760px,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_24px_70px_rgba(30,20,45,0.28)] dark:border-neutral-800 dark:bg-neutral-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-activity-panel-title"
    >
      <header className="flex items-center justify-between gap-4 border-b border-pink-100 px-5 py-4 dark:border-neutral-800">
        <div>
          <h2 id="project-activity-panel-title" className="text-lg font-black text-[#10142d] dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs font-bold text-slate-500">{count} {count === 1 ? "item" : "items"}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-pink-100 text-sm font-black text-[#c72fb2] transition hover:bg-pink-50" aria-label={`Close ${title}`}>x</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-3">
        {children}
      </div>
    </section>
  </div>
);

const ProjectDetails = ({ errorMessage, onApprove, onBack, onDownloadOutput, onFeedback, onRequestRevision, onViewOutput, project }) => {
  const [openActivityPanel, setOpenActivityPanel] = useState(null);
  const outputCandidates = [
    ...(project.finalOutput?.link
      ? [{
          id: "final-link",
          title: "Project Output Link",
          subtitle: project.finalOutput.link,
          type: "link",
          url: project.finalOutput.link,
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
  const fallbackUpdates = [
    project.status === "Completed" && {
      id: "completed",
      title: "Project marked as completed",
      text: `by ${getPersonName(project.assignedTo, "Team")}`,
      date: project.completedAt || project.updatedAt,
      tone: "green",
    },
    project.finalOutput && {
      id: "output",
      title: `${getPersonName(project.assignedTo, "Team")} submitted final output`,
      text: project.finalOutput.message || "Project files were submitted.",
      date: project.finalOutput.submittedAt || project.updatedAt,
      tone: "pink",
    },
    ...project.revisionRequests.map((revision, index) => ({
      id: `revision-${index}`,
      title: "Client requested revision",
      text: revision.description,
      date: revision.createdAt,
      tone: "blue",
    })),
  ].filter(Boolean);
  const updates = project.activities.length > 0
    ? [...project.activities]
        .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
        .map((activity, index) => ({
          id: activity._id || `${activity.type}-${activity.createdAt}-${index}`,
          title: activity.title,
          text: [activity.actorName, activity.details].filter(Boolean).join(" - "),
          date: activity.createdAt,
          tone: activity.type === "subtask_completed" || activity.type === "output_submitted"
            ? "green"
            : activity.type === "revision_requested"
              ? "blue"
              : "pink",
        }))
    : fallbackUpdates;
  const timeline = project.activities.length > 0
    ? [...project.activities]
        .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
        .map((activity) => ({
          label: activity.title,
          details: activity.actorName || activity.details,
          date: activity.createdAt,
          done: activity.type !== "subtask_reopened",
          final: activity.type === "output_submitted",
        }))
    : project.subtasks.length > 0
      ? project.subtasks.map((subtask) => ({
          label: `${subtask.completed ? "Completed" : "Pending"} subtask: ${subtask.title}`,
          details: subtask.completed ? "Marked as done" : "Awaiting completion",
          date: subtask.completed ? project.updatedAt : project.dueDate,
          done: subtask.completed,
          final: false,
        }))
      : [{ label: "No task activity yet", details: "", date: project.updatedAt, done: false, final: false }];
  const visibleUpdates = updates.slice(0, 6);
  const visibleTimeline = timeline.slice(0, 6);

  const renderUpdates = (items) => (
    <div className="space-y-3">
      {items.map((update) => (
        <div key={update.id} className="flex gap-3 rounded-xl bg-pink-50/40 p-3 dark:bg-neutral-800/70">
          <span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${update.tone === "green" ? "bg-emerald-100 text-emerald-600" : update.tone === "blue" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-[#c72fb2]"}`}>
            <Icon name={update.tone === "green" ? "check" : update.tone === "blue" ? "file" : "upload"} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black">{update.title}</span>
            <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">{update.text}</span>
            <span className="mt-1 block text-xs font-bold text-slate-400">{formatDateTime(update.date)}</span>
          </span>
        </div>
      ))}
    </div>
  );

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
              {item.details ? `${item.details} - ` : ""}{formatDateTime(item.date)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-[#c72fb2]">
          <Icon name="arrow" className="h-4 w-4" />
          Back to My Projects
        </button>
        <span className="flex flex-wrap gap-3">
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
        </span>
      </header>
      {errorMessage && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{errorMessage}</p>}

      <Card className="p-5">
        <h1 className="page-title text-2xl">Project Overview</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Here's the summary of your project.</p>
        <div className="mt-5 grid gap-6 rounded-xl border border-pink-100 p-5 lg:grid-cols-2 dark:border-neutral-800">
          <div>
            <DetailRow label="Project Name" value={project.title} />
            <DetailRow label="Client" value={getPersonName(project.requestedBy, project.raw?.requestedByName || "Client")} />
            <DetailRow label="Developer" value={getPersonName(project.assignedTo, "Unassigned")} />
            <DetailRow label="Start Date" value={formatDate(project.startDate)} />
          </div>
          <div className="lg:border-l lg:border-pink-100 lg:pl-10 dark:lg:border-neutral-800">
            <DetailRow label="Due Date" value={formatDate(project.dueDate)} />
            <DetailRow label="Completed Date" value={project.completedAt ? formatDate(project.completedAt) : "Not completed"} />
            <DetailRow label="Amount" value={formatCurrency(project.amount)} />
            <DetailRow label="Paid" value={formatCurrency(project.paid)} />
            <DetailRow label="Pending" value={formatCurrency(project.pendingAmount)} />
            <DetailRow label="Last Updated" value={formatDateTime(project.updatedAt)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-black">Latest Update</h2>
          <div className="mt-4">
            {updates.length === 0 ? (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No updates yet.</p>
            ) : renderUpdates(visibleUpdates)}
          </div>
          {updates.length > 6 && <button type="button" onClick={() => setOpenActivityPanel("updates")} className="mt-5 h-10 w-full rounded-lg border border-[#c72fb2]/40 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">View All Updates ({updates.length})</button>}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-black">Submitted Output</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Here are the latest files and links submitted by your team.</p>
          <div className="mt-4 divide-y divide-pink-50 dark:divide-neutral-800">
            {outputItems.length === 0 ? (
              <p className="py-8 text-center text-sm font-bold text-slate-500">No submitted output yet.</p>
            ) : outputItems.map((output) => (
              <div key={output.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]">
                  <Icon name={output.type === "link" ? "external" : "file"} className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{output.title}</span>
                  <span className="block truncate text-xs font-bold text-slate-500">{output.subtitle}</span>
                  {output.protected && (
                    <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                      {output.watermarked ? "Watermarked" : "Payment pending"}
                    </span>
                  )}
                  <span className="block text-xs font-bold text-slate-400">{formatDateTime(output.submittedAt)}</span>
                </span>
                {output.type === "link" ? (
                  <a href={output.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c72fb2]/40 px-4 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
                    Open Link
                    <Icon name="external" className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="flex items-center gap-2">
                    {output.url && (
                      <button type="button" onClick={() => onViewOutput(project, output)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c72fb2]/40 px-3 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
                        View
                        <Icon name="eye" className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => onDownloadOutput(project, output)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c72fb2]/40 px-3 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
                      Download
                      <Icon name="download" className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="mt-5 h-10 w-full rounded-lg border border-[#c72fb2]/40 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">View All Files</button>
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
      {openActivityPanel === "updates" && (
        <ProjectActivityPanel title="All Project Updates" count={updates.length} onClose={() => setOpenActivityPanel(null)}>
          {renderUpdates(updates)}
        </ProjectActivityPanel>
      )}
      {openActivityPanel === "milestones" && (
        <ProjectActivityPanel title="Project Milestones" count={timeline.length} onClose={() => setOpenActivityPanel(null)}>
          {renderTimeline(timeline)}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 px-4 py-8 backdrop-blur-[2px]">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-pink-100 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.28)] dark:border-neutral-800 dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#10142d] dark:text-white">Share your feedback</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">How was the completed work on <span className="text-[#10142d] dark:text-white">{project.title}</span>?</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2]" aria-label="Close feedback form">x</button>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-black text-[#10142d] dark:text-white">Your rating</legend>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} className={`grid h-11 w-11 place-items-center rounded-lg text-xl transition ${value <= rating ? "bg-pink-50 text-[#c72fb2]" : "bg-slate-50 text-slate-300 hover:text-[#e347a8] dark:bg-neutral-900"}`}>
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
          <button disabled={isSubmitting} className="h-10 rounded-lg bg-[#c72fb2] px-5 text-sm font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Submitting..." : "Submit Feedback"}</button>
        </div>
      </form>
    </div>
  );
};

SimpleFeedbackModal.displayName = "SimpleFeedbackModal";

const RevisionModal = ({ onClose, onSubmit, project }) => {
  const [form, setForm] = useState({
    title: "",
    priority: "",
    description: "",
    dueDate: "",
  });
  const statusClass = statusStyles[project.status] || statusStyles["Pending Revisions"];

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(project, form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 px-4 py-8 backdrop-blur-[2px]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-2xl border border-pink-100 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800"
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
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2] dark:hover:bg-neutral-900"
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-600 dark:text-slate-300">Upload Attachment <span className="font-bold text-slate-400">(optional)</span></span>
            <span className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#e347a8]/50 bg-pink-50/30 text-center transition hover:bg-pink-50 dark:bg-neutral-950">
              <Icon name="upload" className="h-6 w-6 text-[#c72fb2]" />
              <span className="mt-2 text-sm font-black text-[#10142d] dark:text-white">Drag & drop files here</span>
              <span className="mt-1 text-xs font-bold text-slate-500">or click to browse</span>
              <span className="mt-2 text-[11px] font-bold text-slate-400">PNG, JPG, PDF up to 10MB each</span>
              <input type="file" className="sr-only" multiple />
            </span>
          </label>
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
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-6 text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.28)] transition hover:brightness-105"
          >
            <Icon name="send" className="h-4 w-4" />
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};

const RatingStars = ({ label, onChange, required = false, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-xs font-black text-slate-600 dark:text-slate-300">
      {label} {required && <span className="text-pink-500">*</span>}
    </span>
    <span className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`flex h-9 w-7 flex-col items-center justify-center gap-0.5 rounded-md transition ${rating <= value ? "bg-amber-50 text-amber-500" : "text-slate-300 hover:bg-amber-50 hover:text-amber-400"}`}
          aria-label={`${rating} star rating`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={rating <= value ? "currentColor" : "none"} aria-hidden="true">
            <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-black leading-none">{rating}</span>
        </button>
      ))}
    </span>
  </div>
);

const FeedbackModal = ({ onClose, onSubmit, project }) => {
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
    onSubmit(project, {
      ...form,
      wouldRecommend: form.wouldRecommend === "yes",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/45 px-4 py-8 backdrop-blur-[2px]">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-pink-100 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#10142d] dark:text-white">Give Feedback</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">Tell us about your experience with this project.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-pink-50 hover:text-[#c72fb2]" aria-label="Close feedback">x</button>
        </div>

        <div className="mt-5 rounded-xl border border-pink-100 bg-pink-50/30 p-4">
          <p className="text-sm font-black text-[#10142d]">{project.title}</p>
          <p className="mt-1 text-xs font-bold text-emerald-600">Completed {formatDate(project.completedAt || project.updatedAt)}</p>
        </div>

        <div className="mt-5 space-y-4">
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
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={!form.overallRating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c72fb2] text-sm font-black text-white shadow-[0_10px_22px_rgba(199,47,178,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="send" className="h-4 w-4" />Submit Feedback</button>
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
  <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px] lg:w-auto lg:min-w-[620px]">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
  const [activeTab, setActiveTab] = useState("All Projects");
  const [approveProject, setApproveProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackProject, setFeedbackProject] = useState(null);
  const [feedbackSuccessProject, setFeedbackSuccessProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [revisionProject, setRevisionProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Newest");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [archiveAction, setArchiveAction] = useState(null);
  const [noticeMessage, setNoticeMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await taskAPI.getAll({ limit: 100, refresh: Date.now() });
        if (isMounted) setProjects(data.map(normalizeProject));
      } catch (error) {
        if (isMounted) setErrorMessage(getApiErrorMessage(error, "Unable to load projects."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || projects.length === 0) return;
    try {
      const target = JSON.parse(sessionStorage.getItem(notificationTargetKey) || "null");
      if (target?.page !== "projects" || !target?.taskId) return;
      const project = projects.find((item) => item.id === target.taskId);
      if (project) {
        setSelectedProject(project);
        sessionStorage.removeItem(notificationTargetKey);
      }
    } catch {
      sessionStorage.removeItem(notificationTargetKey);
    }
  }, [isLoading, projects]);

  const visibleProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects
      .filter((project) => {
        const matchesTab =
          activeTab === "Archived"
            ? project.archived
            : !project.archived && (activeTab === "All Projects" || project.status === activeTab);
        const matchesStatus =
          statusFilter === "All Status" || project.status === statusFilter;
        const matchesSearch =
          !normalizedSearch ||
          [project.title, project.description, project.status]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        return matchesTab && matchesStatus && matchesSearch;
      })
      .sort((first, second) => {
        if (sortBy === "Oldest") {
          return (parseDate(first.updatedAt) || 0) - (parseDate(second.updatedAt) || 0);
        }
        if (sortBy === "Due Date") {
          return (parseDate(first.dueDate) || new Date(8640000000000000)) - (parseDate(second.dueDate) || new Date(8640000000000000));
        }
        if (sortBy === "Progress") {
          return second.progress - first.progress;
        }
        return (parseDate(second.updatedAt) || 0) - (parseDate(first.updatedAt) || 0);
      });
  }, [activeTab, projects, searchTerm, sortBy, statusFilter]);
  const projectsInCurrentSection = projects.filter((project) =>
    activeTab === "Archived" ? project.archived : !project.archived
  ).length;

  const handleArchiveProject = async () => {
    const action = archiveAction;
    if (!action) return;
    try {
      setErrorMessage("");
      const updatedTask = await taskAPI.setArchived(action.project.id, action.archived);
      const updatedProject = normalizeProject(updatedTask);
      setProjects((currentProjects) => currentProjects.map((project) => project.id === updatedProject.id ? updatedProject : project));
      setArchiveAction(null);
      setNoticeMessage(action.archived ? "Project moved to Archived." : "Project restored to My Projects.");
      window.setTimeout(() => setNoticeMessage(""), 4000);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, action.archived ? "Unable to archive the project." : "Unable to restore the project."));
      setArchiveAction(null);
    }
  };

  const handleSubmitRevision = async (project, form) => {
    try {
      const updatedTask = await taskAPI.requestRevision(project.id, form);
      const updatedProject = normalizeProject(updatedTask);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === updatedProject.id ? updatedProject : currentProject
        )
      );
      setSelectedProject((currentProject) =>
        currentProject?.id === updatedProject.id ? updatedProject : currentProject
      );
      setRevisionProject(null);
      setRevisionMessage(`Revision request submitted for ${project.title}.`);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to submit revision request."));
    }
  };

  const handleDownloadOutput = async (project, output) => {
    try {
      setErrorMessage("");
      await taskAPI.downloadOutput(project.id, output.title, {
        watermark: project.paymentPending && !project.finalOutput?.watermarked,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to download the uploaded file."));
    }
  };

  const handleViewOutput = async (project, output) => {
    try {
      setErrorMessage("");
      await taskAPI.viewOutput(project.id, output.title, {
        watermark: project.paymentPending && !project.finalOutput?.watermarked,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to open the submitted output."));
    }
  };

  const handleApproveProject = async () => {
    const project = approveProject;
    if (!project) return;

    try {
      setErrorMessage("");
      const updatedTask = await taskAPI.approve(project.id);
      const updatedProject = normalizeProject(updatedTask);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === updatedProject.id ? updatedProject : currentProject
        )
      );
      setSelectedProject((currentProject) =>
        currentProject?.id === updatedProject.id ? updatedProject : currentProject
      );
      setApproveProject(null);
      setNoticeMessage(`${project.title} was approved.`);
      window.setTimeout(() => setNoticeMessage(""), 4000);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to approve the project."));
      setApproveProject(null);
    }
  };

  const handleSubmitFeedback = async (project, form) => {
    try {
      const updatedTask = await taskAPI.submitFeedback(project.id, form);
      const updatedProject = normalizeProject(updatedTask);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === updatedProject.id ? updatedProject : currentProject
        )
      );
      setSelectedProject((currentProject) =>
        currentProject?.id === updatedProject.id ? updatedProject : currentProject
      );
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

  if (selectedProject) {
    return (
      <>
        <ProjectDetails
          errorMessage={errorMessage}
          onApprove={setApproveProject}
          onBack={() => setSelectedProject(null)}
          onDownloadOutput={handleDownloadOutput}
          onFeedback={() => setFeedbackProject(selectedProject)}
          onRequestRevision={(project) => {
            setRevisionMessage("");
            setRevisionProject(project);
          }}
          onViewOutput={handleViewOutput}
          project={selectedProject}
        />
        {revisionProject && (
          <RevisionModal
            onClose={() => setRevisionProject(null)}
            onSubmit={handleSubmitRevision}
            project={revisionProject}
          />
        )}
        {feedbackProject && (
          <FeedbackModal
            key={feedbackProject.id}
            onClose={() => setFeedbackProject(null)}
            onSubmit={handleSubmitFeedback}
            project={feedbackProject}
          />
        )}
        {feedbackSuccessProject && (
          <FeedbackSuccessModal onClose={() => setFeedbackSuccessProject(null)} />
        )}
        <ConfirmDialog
          confirmLabel="Approve"
          icon="done"
          isOpen={Boolean(approveProject)}
          message={`Approve “${approveProject?.title || "this project"}”? This will mark the submitted output as completed.`}
          onCancel={() => setApproveProject(null)}
          onConfirm={handleApproveProject}
          title="Approve Project"
        />
      </>
    );
  }

  return (
    <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] space-y-5 bg-[#f8f9fd] px-4 py-5 text-[#10142d] dark:bg-neutral-950 dark:text-white md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl">My Projects</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Track the progress of all your projects in one place.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px] lg:w-auto lg:min-w-[620px]">
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
      <ProjectStats projects={projects.filter((project) => !project.archived)} />

      <Card className="overflow-hidden">
        <div className="flex gap-4 overflow-x-auto border-b border-pink-50 px-5 dark:border-neutral-800">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative h-12 whitespace-nowrap px-2 text-xs font-black transition ${
                activeTab === tab ? "text-[#c72fb2]" : "text-slate-500 hover:text-[#e347a8]"
              }`}
            >
              {tab}
              {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#c72fb2]" />}
            </button>
          ))}
        </div>

        <div className="p-5">
          {visibleProjects.length === 0 ? (
            <p className="py-12 text-center text-sm font-bold text-slate-500">No projects found.</p>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id || project.title}
                  onApprove={setApproveProject}
                  onFeedback={(selectedProject) =>
                    setFeedbackProject(selectedProject)
                  }
                  onRequestRevision={(selectedProject) => {
                    setRevisionMessage("");
                    setRevisionProject(selectedProject);
                  }}
                  onToggleArchive={(selectedProject, archived) => setArchiveAction({ project: selectedProject, archived })}
                  onViewDetails={setSelectedProject}
                  project={project}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-pink-50 px-5 py-4 text-xs font-bold text-slate-500 dark:border-neutral-800">
          <span>Showing {visibleProjects.length ? 1 : 0} to {visibleProjects.length} of {projectsInCurrentSection} projects</span>
          <span className="flex items-center gap-2">
            <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-pink-50 hover:text-[#e347a8]" aria-label="Previous page">‹</button>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c72fb2] text-white">1</span>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-pink-50 hover:text-[#e347a8]" aria-label="Next page">›</button>
          </span>
        </div>
      </Card>
      <ConfirmDialog
        confirmLabel={archiveAction?.archived ? "Archive" : "Restore"}
        icon="done"
        isOpen={Boolean(archiveAction)}
        message={archiveAction?.archived ? `Archive “${archiveAction.project.title}”? You can restore it later from the Archived tab.` : `Restore “${archiveAction?.project.title}” to My Projects?`}
        onCancel={() => setArchiveAction(null)}
        onConfirm={handleArchiveProject}
        title={archiveAction?.archived ? "Archive Project" : "Restore Project"}
      />
      <ConfirmDialog
        confirmLabel="Approve"
        icon="done"
        isOpen={Boolean(approveProject)}
        message={`Approve “${approveProject?.title || "this project"}”? This will mark the submitted output as completed.`}
        onCancel={() => setApproveProject(null)}
        onConfirm={handleApproveProject}
        title="Approve Project"
      />
      {revisionProject && (
        <RevisionModal
          onClose={() => setRevisionProject(null)}
          onSubmit={handleSubmitRevision}
          project={revisionProject}
        />
      )}
      {feedbackProject && (
        <FeedbackModal
          key={feedbackProject.id}
          onClose={() => setFeedbackProject(null)}
          onSubmit={handleSubmitFeedback}
          project={feedbackProject}
        />
      )}
      {feedbackSuccessProject && (
        <FeedbackSuccessModal onClose={() => setFeedbackSuccessProject(null)} />
      )}
    </div>
  );
};

export default ClientProjects;
