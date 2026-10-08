import { useEffect, useMemo, useState } from "react";
import { taskAPI } from "../../services/api";

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getPersonName = (person) => {
  if (!person) return "Unassigned";
  if (typeof person === "string") return person;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return fullName || person.companyName || person.username || person.email || person.name || "Assigned user";
};

const getClientName = (task) => {
  if (!task) return "No client";
  if (String(task.requestedByName || "").trim()) return task.requestedByName;
  if (task.clientName) return task.clientName;
  if (task.client?.name) return task.client.name;
  if (typeof task.client === "string") return task.client;
  if (task.requestedBy && typeof task.requestedBy !== "string") {
    return task.requestedBy.companyName
      ? `${task.requestedBy.companyName} - ${getPersonName(task.requestedBy)}`
      : getPersonName(task.requestedBy);
  }
  if (task.createdBy?.role === "client") return getPersonName(task.createdBy);
  return "Unassigned client";
};

const formatReadableDate = (date) => {
  if (!date) return "No due date";
  const str = String(date).slice(0, 10);
  const parsedDate = new Date(`${str}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date);
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

const priorityBadgeStyles = {
  low: "border-emerald-500/80 text-emerald-600 bg-emerald-50/50 dark:border-emerald-400 dark:text-emerald-400 dark:bg-emerald-950/20",
  medium: "border-amber-500/80 text-amber-600 bg-amber-50/50 dark:border-amber-400 dark:text-amber-400 dark:bg-amber-950/20",
  high: "border-orange-500/80 text-orange-600 bg-orange-50/50 dark:border-orange-400 dark:text-orange-400 dark:bg-orange-950/20",
  urgent: "border-rose-500/80 text-rose-600 bg-rose-50/50 dark:border-rose-400 dark:text-rose-400 dark:bg-rose-950/20",
};

export const ProjectDetailsModal = ({
  canAccessTasks = true,
  currentUserId = "",
  headerCategory = "PROJECT MANAGEMENT",
  isApprovingCustomClient = false,
  isDownloadingOutput = false,
  isDownloadingRevisionAttachment = false,
  isMarkingPaid = false,
  isPayingEmployee = false,
  isStartingRevision = false,
  item,
  onApproveCustomClient,
  onClose,
  onDelete,
  onDownloadOutput,
  onDownloadRevisionAttachment,
  onEdit,
  onMarkPaid,
  onPayWithPayMongo,
  onPayEmployee,
  onStartRevision,
  onSubmitOutput,
  onToggleSubtask,
  onToggleTask,
  onViewCalendar,
}) => {
  const handleToggleTask = onToggleTask || onToggleSubtask;
  const [downloadingRevIdx, setDownloadingRevIdx] = useState(null);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);

  const revisionRequests = useMemo(() => {
    return Array.isArray(item?.revisionRequests) ? item.revisionRequests : [];
  }, [item?.revisionRequests]);

  const activeRevision = useMemo(() => {
    if (!revisionRequests.length) return null;
    return revisionRequests[revisionRequests.length - 1];
  }, [revisionRequests]);

  const handleDownloadRevision = async (revIndex, fileName) => {
    if (onDownloadRevisionAttachment) {
      return onDownloadRevisionAttachment(item, revIndex, fileName);
    }
    try {
      setDownloadingRevIdx(revIndex);
      await taskAPI.downloadRevisionAttachment(item.id, revIndex, fileName);
    } catch (error) {
      console.error("Unable to download revision attachment:", error);
    } finally {
      setDownloadingRevIdx(null);
    }
  };

  const handleDownloadOutputFile = async () => {
    if (onDownloadOutput) {
      return onDownloadOutput(item);
    }
    if (item?.finalOutput?.fileName) {
      try {
        await taskAPI.downloadOutput(item.id, item.finalOutput.fileName);
      } catch (error) {
        console.error("Unable to download output:", error);
      }
    }
  };

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

  const subtasks = useMemo(() => item?.subtasks || [], [item?.subtasks]);

  const numSubtaskCols = subtasks.length > 6 ? 3 : 2;
  const subtaskColumns = useMemo(() => {
    if (!subtasks.length) return [];
    const cols = subtasks.length > 6 ? 3 : 2;
    const itemsPerCol = Math.max(1, Math.ceil(subtasks.length / cols));
    if (cols === 2) {
      return [subtasks.slice(0, itemsPerCol), subtasks.slice(itemsPerCol)];
    }
    return [
      subtasks.slice(0, itemsPerCol),
      subtasks.slice(itemsPerCol, itemsPerCol * 2),
      subtasks.slice(itemsPerCol * 2),
    ];
  }, [subtasks]);

  const allAssignees = useMemo(() => {
    if (!item) return [];
    const employees = [...(item.assignees || []), item.assignedTo].filter(Boolean);
    const uniqueEmployees = new Map();
    employees.forEach((emp) => {
      const id = getEntityId(emp);
      if (id && !uniqueEmployees.has(id)) uniqueEmployees.set(id, emp);
    });
    return [...uniqueEmployees.values()];
  }, [item]);

  const assignedEmployees = useMemo(() => {
    return allAssignees.filter((emp) => {
      const id = getEntityId(emp);
      if (currentUserId && id === currentUserId) return false;
      if (typeof emp === "object" && emp?.role) {
        return emp.role === "employee";
      }
      return true;
    });
  }, [allAssignees, currentUserId]);

  if (!item) return null;

  const isDone = item.status === "Done" || item.status === "Completed";
  const clientReviewIndex = subtasks.findIndex(isClientReviewSubtask);
  const submissionSubtaskIndex = getSubmissionSubtaskIndex(subtasks);
  const submitOutputIndex = subtasks.findIndex(isSubmitOutputSubtask);
  const hasSubmittedOutput = Boolean(item.finalOutput?.submittedAt);
  const isUnderReview = hasSubmittedOutput && item.apiStatus === "review";
  const isApproved = hasSubmittedOutput && item.clientApproved;
  const isRevisionPending = Boolean(activeRevision && !activeRevision.startedAt);
  const needsRevision =
    hasSubmittedOutput &&
    (item.apiStatus === "pending" || isRevisionPending) &&
    (item.revisionRequests || []).length > 0;

  const isPaid = Number(item.amount || 0) > 0 && Number(item.paid || 0) >= Number(item.amount || 0);
  const isDownPaymentSettled = Boolean(
    item.downPayment?.paidAt ||
    (Number(item.downPayment?.amount || 0) > 0 && Number(item.paid || 0) >= Number(item.downPayment.amount))
  );
  const isPartiallyPaid = !isPaid && Number(item.paid || 0) > 0;
  const paymentBadgeLabel = isPaid
    ? "Paid"
    : isDownPaymentSettled
      ? "Down Payment Paid"
      : isPartiallyPaid
        ? "Partially Paid"
        : "Not paid";

  const priorityKey = String(item.priority || "low").toLowerCase();
  const priorityStyle = priorityBadgeStyles[priorityKey] || priorityBadgeStyles.low;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="project-details-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        role="dialog"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-neutral-800 sm:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7c3aed] dark:text-[#a78bfa]">
              {headerCategory}
            </p>
            <h2
              id="project-details-title"
              className="mt-1 text-2xl font-black text-[#10142d] dark:text-white"
            >
              {item.title || "Project Details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
            aria-label="Close project details"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="max-h-[calc(92dvh-90px)] overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
          {/* Project Description Card */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/70">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">
                Project Description
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-xs font-normal leading-relaxed text-slate-600 dark:text-neutral-300">
              {item.description || "No description provided."}
            </p>
          </div>

          {/* Main 2-Column Content: Left Tasks/Status & Right Metadata */}
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_210px] items-start">
            {/* Left Column */}
            <div className="min-w-0 space-y-4">
              {/* Row 1: Status & Due Date Combined Info Bar */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-1">
                {/* Status */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-neutral-300">
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                    <span>Status</span>
                  </div>

                  {/* Status Pill Badge */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7c3aed] px-3.5 py-1 text-xs font-semibold text-white shadow-sm">
                    {item.status || "In progress"}
                    {isDone && (
                      <svg className="h-3 w-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>

                  {/* Payment Status / Action Button */}
                  {onMarkPaid ? (
                    <button
                      type="button"
                      disabled={isPaid || Number(item.amount || 0) <= 0 || isMarkingPaid}
                      onClick={() => onMarkPaid(item)}
                      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-semibold text-white shadow-sm transition ${
                        isPaid
                          ? "bg-emerald-600 cursor-default"
                          : isPartiallyPaid
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-[#7c3aed] hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
                      }`}
                      title={
                        isPaid
                          ? "Project is fully paid"
                          : isPartiallyPaid
                            ? "Partial payment received. Click to record remaining balance"
                            : Number(item.amount || 0) <= 0
                              ? "Set project amount first"
                              : isMarkingPaid
                                ? "Recording payment..."
                                : "Click to mark as paid"
                      }
                    >
                      {isMarkingPaid ? "Saving..." : paymentBadgeLabel}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-semibold text-white shadow-sm ${
                        isPaid ? "bg-emerald-600" : isPartiallyPaid ? "bg-blue-600" : "bg-[#7c3aed]"
                      }`}
                    >
                      {paymentBadgeLabel}
                    </span>
                  )}
                  {Number(item.amount || 0) > 0 && (
                    <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                      ₱{Number(item.paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {!isPaid && Number(item.amount || 0) > 0 && onPayWithPayMongo && (
                    <button
                      type="button"
                      onClick={() => onPayWithPayMongo(item)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:brightness-105"
                      title="Pay via PayMongo"
                    >
                      Pay via PayMongo
                    </button>
                  )}
                </div>

                {/* Subtle vertical divider */}
                <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-neutral-800" aria-hidden="true" />

                {/* Due Date */}
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                    Due Date
                  </span>
                  {onViewCalendar ? (
                    <button
                      type="button"
                      onClick={() => onViewCalendar(item)}
                      className="ml-1 text-xs font-medium text-slate-600 transition hover:text-[#7c3aed] dark:text-neutral-300"
                      title="View in calendar"
                    >
                      {formatReadableDate(item.dueDate)}
                    </button>
                  ) : (
                    <span className="ml-1 text-xs font-medium text-slate-600 dark:text-neutral-300">
                      {formatReadableDate(item.dueDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Tasks Header */}
              <div className="flex items-center gap-2 pt-1">
                <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                  Tasks
                </span>
                <span className="ml-2 text-xs font-normal text-slate-400">
                  Complete each step in order.
                </span>
              </div>

              {/* Row 3: Tasks Columns + Assignees Column */}
              <div
                className={`grid grid-cols-1 gap-5 pt-1 sm:grid-cols-2 ${
                  numSubtaskCols === 3 ? "md:grid-cols-4" : "md:grid-cols-3"
                } items-start`}
              >
                {subtasks.length > 0 ? (
                  subtaskColumns.map((colTasks, colIdx) => (
                    <div key={`col-${colIdx}`} className="space-y-2">
                      {colTasks.map((subtask) => {
                        const originalIndex = subtasks.indexOf(subtask);
                        const isWaitingForClientApproval =
                          submitOutputIndex < 0 &&
                          clientReviewIndex >= 0 &&
                          originalIndex > clientReviewIndex &&
                          !item.clientApproved;
                        const isAssignedToCurrentUser = currentUserId
                          ? subtask.assignedTo
                            ? getEntityId(subtask.assignedTo) === currentUserId
                            : (item.assignees || []).some((a) => getEntityId(a) === currentUserId)
                          : true;
                        const isSequenceLocked = subtask.completed
                          ? subtasks.slice(originalIndex + 1).some((next) => next.completed)
                          : subtasks.slice(0, originalIndex).some((prev) => !prev.completed);
                        const isLocked =
                          !canAccessTasks ||
                          isDone ||
                          isWaitingForClientApproval ||
                          isSequenceLocked ||
                          !isAssignedToCurrentUser;

                        const isFinalOutputSubtask = isSubmitOutputSubtask(subtask);
                        const isReviewSubtask = isClientReviewSubtask(subtask);
                        const isLegacyCustomSubmission =
                          clientReviewIndex < 0 &&
                          submitOutputIndex < 0 &&
                          originalIndex === submissionSubtaskIndex;
                        const isSubmissionSubtask = submitOutputIndex >= 0
                          ? isFinalOutputSubtask
                          : isReviewSubtask || isLegacyCustomSubmission;
                        const isClientReviewStatusSubtask = isSubmissionSubtask;
                        const canSubmit =
                          canAccessTasks &&
                          !isDone &&
                          !subtask.completed &&
                          isSubmissionSubtask &&
                          subtasks.slice(0, originalIndex).every((prev) => prev.completed);
                        const isSubmissionBlockedByReview =
                          isClientReviewStatusSubtask && (isUnderReview || isApproved);

                        return (
                          <div key={subtask.id || `${item.id}-${originalIndex}`} className="space-y-1">
                            <label
                              className={`flex min-w-0 items-center gap-2 text-xs ${
                                isLocked ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700 dark:text-neutral-200"
                              }`}
                              title={
                                !isAssignedToCurrentUser
                                  ? "Assigned to another team member"
                                  : isWaitingForClientApproval
                                    ? "Waiting for client review approval"
                                    : isLocked && !isDone
                                      ? "Complete the previous step first"
                                      : undefined
                              }
                            >
                              <input
                                type="checkbox"
                                checked={subtask.completed}
                                disabled={isLocked}
                                onChange={() => handleToggleTask && handleToggleTask(item, originalIndex)}
                                className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <span
                                className={`truncate font-medium ${
                                  subtask.completed ? "line-through text-slate-400" : ""
                                }`}
                              >
                                {subtask.title}
                              </span>
                            </label>

                            {/* Submit Output Button directly under the active submission subtask */}
                            {canSubmit && !isSubmissionBlockedByReview && onSubmitOutput && (
                              <button
                                type="button"
                                onClick={() => onSubmitOutput(item, originalIndex)}
                                className="mt-1 inline-flex items-center rounded-lg bg-[#7c3aed] px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9]"
                              >
                                {needsRevision ? "Needs Revision" : "Submit Output"}
                              </button>
                            )}

                            {/* Start Revision button when revision is requested */}
                            {isSubmissionSubtask && isRevisionPending && onStartRevision && (
                              <button
                                type="button"
                                disabled={isStartingRevision}
                                onClick={() => onStartRevision(item)}
                                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
                              >
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                {isStartingRevision ? "Starting..." : "Start Revision"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-xs text-slate-400">
                    No steps added yet.
                  </div>
                )}

                {/* Column 4: Assignees */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-neutral-300">
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Assignees</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {allAssignees.length > 0 ? (
                      allAssignees.map((emp) => (
                        <span
                          key={getEntityId(emp)}
                          className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50/60 px-3 py-0.5 text-xs font-semibold text-pink-700 dark:border-pink-900/50 dark:bg-pink-950/20 dark:text-pink-300"
                        >
                          {getPersonName(emp)}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50/60 px-3 py-0.5 text-xs font-semibold text-pink-600 dark:border-pink-900/50 dark:bg-pink-950/20 dark:text-pink-300">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Metadata Sidebar */}
            <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/30 lg:border-0 lg:border-l lg:border-slate-100 lg:bg-transparent lg:p-0 lg:pl-6 dark:lg:border-neutral-800">
              <div className="space-y-4">
                {/* Priority */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-neutral-300">
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
                    </svg>
                    <span>Priority</span>
                  </div>
                  <div className="mt-1.5">
                    <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${priorityStyle}`}>
                      {item.priority || "low"}
                    </span>
                  </div>
                </div>

                {/* Client */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-neutral-300">
                    <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>Client</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-slate-700 dark:text-neutral-200" title={getClientName(item)}>
                    {getClientName(item)}
                  </p>
                </div>

                {/* Employee Payment Action (only rendered when an employee is assigned) */}
                {onPayEmployee && assignedEmployees.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isPayingEmployee}
                      onClick={() => onPayEmployee(item)}
                      className="w-full rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-bold text-[#b524a2] transition hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPayingEmployee ? "Saving..." : "Pay Employee"}
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Right Actions: Edit & Delete */}
              <div className="flex items-center justify-end gap-2 pt-4">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-neutral-800 dark:hover:text-white"
                    aria-label={`Edit ${item.title}`}
                    title="Edit project"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                    aria-label={`Delete ${item.title}`}
                    title="Delete project"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Client Revision Request Section */}
          {activeRevision && (
            <section className="mt-6 rounded-2xl border border-rose-200/90 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        !activeRevision.startedAt
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {!activeRevision.startedAt ? "Needs Revision" : "Revision in Progress"}
                    </span>

                    {activeRevision.priority && (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black capitalize ${
                          priorityBadgeStyles[String(activeRevision.priority).toLowerCase()] ||
                          priorityBadgeStyles.medium
                        }`}
                      >
                        {activeRevision.priority} Priority
                      </span>
                    )}

                    {revisionRequests.length > 1 && (
                      <span className="text-[10px] font-bold text-slate-500">
                        Revision #{revisionRequests.length} of {revisionRequests.length}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-base font-black text-[#10142d] dark:text-white">
                    {activeRevision.title || "Client Revision Request"}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    <span>
                      Requested by{" "}
                      <strong className="text-slate-700 dark:text-neutral-200">
                        {getPersonName(activeRevision.user || item.requestedBy || item.createdBy)}
                      </strong>
                    </span>
                    {activeRevision.createdAt && (
                      <span>• {formatSubmittedDate(activeRevision.createdAt)}</span>
                    )}
                    {activeRevision.section && (
                      <span>
                        • Section:{" "}
                        <strong className="text-slate-700 dark:text-neutral-200">
                          {activeRevision.section}
                        </strong>
                      </span>
                    )}
                    {activeRevision.preferredCompletionDate && (
                      <span>
                        • Preferred completion:{" "}
                        <strong className="text-slate-700 dark:text-neutral-200">
                          {formatReadableDate(activeRevision.preferredCompletionDate)}
                        </strong>
                      </span>
                    )}
                  </div>

                  {activeRevision.startedAt && (
                    <p className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Revision started on {formatSubmittedDate(activeRevision.startedAt)}
                      {activeRevision.startedBy ? ` by ${getPersonName(activeRevision.startedBy)}` : ""}
                    </p>
                  )}
                </div>

                {/* Start Revision CTA */}
                {!activeRevision.startedAt && onStartRevision && (
                  <button
                    type="button"
                    disabled={isStartingRevision}
                    onClick={() => onStartRevision(item)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_8px_18px_rgba(199,47,178,0.25)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {isStartingRevision ? "Starting..." : "Start Revision"}
                  </button>
                )}
              </div>

              {/* Description of Changes */}
              <div className="mt-3.5 rounded-xl border border-rose-200/70 bg-white/90 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/70">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Requested Changes / Client Feedback
                </span>
                <p className="mt-1.5 whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-700 dark:text-neutral-200">
                  {activeRevision.description || "No description of changes provided."}
                </p>
              </div>

              {/* Revision Reference Attachment */}
              {activeRevision.attachment && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-100 text-[#c72fb2] dark:bg-pink-950/40">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Client Reference Attachment
                      </span>
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-white" title={activeRevision.attachment.fileName || "Revision file"}>
                        {activeRevision.attachment.fileName || "Revision attachment"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={isDownloadingRevisionAttachment || downloadingRevIdx === revisionRequests.length - 1}
                      onClick={() => handleDownloadRevision(revisionRequests.length - 1, activeRevision.attachment.fileName)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#c72fb2] px-3.5 text-xs font-bold text-white shadow-xs transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
                      </svg>
                      {isDownloadingRevisionAttachment || downloadingRevIdx === revisionRequests.length - 1
                        ? "Downloading..."
                        : "Download File"}
                    </button>

                    {activeRevision.attachment.fileUrl && (
                      <a
                        href={activeRevision.attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      >
                        Open
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Earlier Revision Requests History Accordion */}
              {revisionRequests.length > 1 && (
                <div className="mt-3.5 pt-3 border-t border-rose-200/60 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowRevisionHistory((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#c72fb2] hover:underline"
                  >
                    <span>{showRevisionHistory ? "Hide" : "View"} Earlier Revision Requests ({revisionRequests.length - 1})</span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${showRevisionHistory ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {showRevisionHistory && (
                    <div className="mt-3 space-y-3">
                      {revisionRequests.slice(0, -1).map((rev, revIdx) => (
                        <div
                          key={`rev-hist-${revIdx}`}
                          className="rounded-xl border border-slate-200 bg-white/70 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900/60"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-black text-slate-800 dark:text-white">
                              Revision #{revIdx + 1}: {rev.title || "Revision request"}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatSubmittedDate(rev.createdAt)}
                            </span>
                          </div>
                          {rev.description && (
                            <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-neutral-300">
                              {rev.description}
                            </p>
                          )}
                          {rev.attachment && (
                            <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                              <span className="truncate text-[11px] font-semibold text-slate-500">
                                📎 {rev.attachment.fileName || "Attachment"}
                              </span>
                              <button
                                type="button"
                                disabled={isDownloadingRevisionAttachment || downloadingRevIdx === revIdx}
                                onClick={() => handleDownloadRevision(revIdx, rev.attachment.fileName)}
                                className="text-[11px] font-bold text-[#c72fb2] hover:underline"
                              >
                                {downloadingRevIdx === revIdx ? "Downloading..." : "Download"}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Submitted Output Section (Preserved for workflow continuity) */}
          {item.finalOutput?.submittedAt && (
            <section className="mt-6 rounded-2xl border border-pink-100 bg-pink-50/40 p-4 dark:border-pink-900/30 dark:bg-pink-950/10 sm:p-5">
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
                      onClick={handleDownloadOutputFile}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#c72fb2] px-4 text-xs font-black text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
                      </svg>
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
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 5h6v6M19 5l-8 8M17 13v6H5V7h6" />
                      </svg>
                    </a>
                  )}
                  {item.apiStatus === "review" && !getEntityId(item.requestedBy) && onApproveCustomClient && (
                    <button
                      type="button"
                      disabled={isApprovingCustomClient}
                      onClick={() => onApproveCustomClient(item)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                      {isApprovingCustomClient ? "Recording..." : "Record Offline Approval"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProjectDetailsModal;
