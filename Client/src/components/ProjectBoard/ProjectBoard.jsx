import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Disc,
  Flag,
  GripVertical,
  Loader2,
  User,
} from "lucide-react";
import InitialsAvatar from "../InitialsAvatar/InitialsAvatar.jsx";

const GROUPS = [
  {
    id: "in_progress",
    apiStatus: "in_progress",
    title: "IN PROGRESS",
    icon: CircleDot,
    badgeClass: "bg-[#0070f3] text-white",
    dotClass: "text-[#0070f3]",
    borderAccent: "border-t-[#0070f3]",
  },
  {
    id: "review",
    apiStatus: "review",
    title: "IN REVIEW",
    icon: Disc,
    badgeClass: "bg-[#475569] text-white",
    dotClass: "text-[#475569]",
    borderAccent: "border-t-[#475569]",
  },
  {
    id: "pending",
    apiStatus: "pending",
    title: "REVISION",
    icon: CircleDashed,
    badgeClass: "border border-slate-300 bg-white/90 text-slate-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200",
    dotClass: "text-amber-500",
    borderAccent: "border-t-amber-500",
  },
  {
    id: "done",
    apiStatus: "done",
    title: "COMPLETED",
    icon: CheckCircle2,
    badgeClass: "bg-[#16a34a] text-white",
    dotClass: "text-[#16a34a]",
    borderAccent: "border-t-[#16a34a]",
  },
];

const isTaskInGroup = (task, groupId) => {
  const status = String(task.status || "").toLowerCase();
  const apiStatus = String(task.apiStatus || task.raw?.status || "").toLowerCase();

  if (groupId === "in_progress") {
    return (
      apiStatus === "in_progress" ||
      status === "in progress" ||
      status === "in_progress"
    );
  }
  if (groupId === "pending") {
    return (
      apiStatus === "pending" ||
      apiStatus === "revision" ||
      status === "pending" ||
      status === "revision" ||
      status === "revisions" ||
      status === "pending revisions" ||
      status === "to do" ||
      status === "to_do" ||
      (!apiStatus && !status)
    );
  }
  if (groupId === "review") {
    return (
      apiStatus === "review" ||
      status === "in review" ||
      status === "review"
    );
  }
  if (groupId === "done") {
    return (
      apiStatus === "done" ||
      status === "done" ||
      status === "completed" ||
      status === "complete"
    );
  }
  return false;
};

const getPriorityConfig = (priority = "medium") => {
  const p = String(priority).toLowerCase();
  if (p === "urgent" || p === "high") {
    return {
      label: p === "urgent" ? "Urgent" : "High",
      flagColor: "text-red-500 fill-red-500/20",
      badgeClass:
        "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40",
    };
  }
  if (p === "medium") {
    return {
      label: "Medium",
      flagColor: "text-amber-500 fill-amber-500/20",
      badgeClass:
        "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40",
    };
  }
  return {
    label: "Low",
    flagColor: "text-emerald-500 fill-emerald-500/20",
    badgeClass:
      "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40",
  };
};

const formatCardDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getDueDateStatus = (dueDate, isCompleted) => {
  if (!dueDate || isCompleted) return "normal";
  const today = new Date();
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "normal";
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = (dueStart - todayStart) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  return "normal";
};

const getClientName = (task) => {
  if (task.requestedByName) return task.requestedByName;
  if (task.requestedBy && typeof task.requestedBy === "object") {
    const fullName = [task.requestedBy.firstName, task.requestedBy.lastName]
      .filter(Boolean)
      .join(" ");
    return (
      fullName ||
      task.requestedBy.companyName ||
      task.requestedBy.email ||
      ""
    );
  }
  if (typeof task.requestedBy === "string") return task.requestedBy;
  if (task.client) {
    if (typeof task.client === "object") {
      return (
        task.client.companyName ||
        [task.client.firstName, task.client.lastName].filter(Boolean).join(" ") ||
        task.client.name ||
        ""
      );
    }
    return String(task.client);
  }
  return "";
};

const getUniqueAssignees = (task) => {
  const list = [...(task.assignees || []), task.assignedTo].filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const item of list) {
    const id = typeof item === "string" ? item : item._id || item.id || item.email;
    if (id && !seen.has(id)) {
      seen.add(id);
      unique.push(item);
    }
  }
  return unique;
};

const ProjectCard = ({
  task,
  onSelectTask,
  showAssignee,
  isDraggable,
  isDragged,
  isUpdating,
  onDragStart,
  onDragEnd,
}) => {
  const priorityConfig = getPriorityConfig(task.priority);
  const isPaid = Boolean(
    task.paid &&
      Number(task.paid) >= Number(task.amount || 0) &&
      Number(task.amount || 0) > 0
  );
  const isCompleted = isTaskInGroup(task, "done");
  const formattedDate = formatCardDate(task.dueDate);
  const dateStatus = getDueDateStatus(task.dueDate, isCompleted);
  const clientName = getClientName(task);
  const assignees = getUniqueAssignees(task);

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const progressPercent =
    totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : isCompleted
      ? 100
      : 0;

  return (
    <div
      draggable={isDraggable && !isUpdating}
      onDragStart={(e) => onDragStart?.(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onSelectTask?.(task.id)}
      className={`group relative flex flex-col gap-3 rounded-xl border bg-white p-3.5 shadow-2xs transition-all dark:bg-neutral-800/90 ${
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        isDragged
          ? "opacity-30 scale-[0.98] border-dashed border-pink-400 dark:border-pink-500 shadow-none ring-2 ring-pink-400/40"
          : isUpdating
          ? "opacity-60 pointer-events-none border-slate-200 dark:border-neutral-800"
          : "border-slate-200/90 hover:border-pink-300 hover:shadow-md dark:border-neutral-800 dark:hover:border-pink-500/50"
      }`}
    >
      {/* Priority, Drag Handle & Payment Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isDraggable && (
            <span
              className="text-slate-300 transition-colors group-hover:text-slate-500 dark:text-neutral-600 dark:group-hover:text-neutral-400"
              title="Drag to change status"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${priorityConfig.badgeClass}`}
          >
            <Flag className={`h-3 w-3 ${priorityConfig.flagColor}`} />
            <span>{priorityConfig.label}</span>
          </span>
        </div>

        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
            isPaid
              ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "border-slate-200 bg-slate-100 text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {isPaid ? "Paid" : "Not paid"}
        </span>
      </div>

      {/* Title & Description */}
      <div>
        <h4 className="line-clamp-2 text-sm font-bold text-slate-900 transition-colors group-hover:text-pink-600 dark:text-neutral-100 dark:group-hover:text-pink-400">
          {task.title}
        </h4>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-neutral-400">
            {task.description}
          </p>
        )}
      </div>

      {/* Client Name */}
      {clientName && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-neutral-400">
          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{clientName}</span>
        </div>
      )}

      {/* Subtasks Progress */}
      {totalSubtasks > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
            <span>
              {completedSubtasks}/{totalSubtasks} tasks
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPercent === 100 ? "bg-emerald-500" : "bg-[#0070f3]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Due Date & Assignees */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-neutral-800">
        {formattedDate ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              dateStatus === "overdue"
                ? "bg-red-50 font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : dateStatus === "today"
                ? "bg-amber-50 font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                : "text-slate-500 dark:text-neutral-400"
            }`}
            title={`Due: ${formattedDate}${
              dateStatus === "overdue"
                ? " (Overdue)"
                : dateStatus === "today"
                ? " (Due Today)"
                : ""
            }`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formattedDate}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 dark:text-neutral-500">
            No due date
          </span>
        )}

        {showAssignee && (
          <div className="flex items-center">
            {assignees.length > 0 ? (
              <div className="flex -space-x-1.5 overflow-hidden">
                {assignees.slice(0, 3).map((assignee, idx) => (
                  <InitialsAvatar
                    key={
                      typeof assignee === "string"
                        ? assignee
                        : assignee._id || assignee.id || idx
                    }
                    user={typeof assignee === "object" ? assignee : undefined}
                    name={typeof assignee === "string" ? assignee : undefined}
                    className="h-6 w-6 ring-2 ring-white dark:ring-neutral-800"
                    textClassName="text-[10px]"
                  />
                ))}
                {assignees.length > 3 && (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 ring-2 ring-white dark:bg-neutral-700 dark:text-neutral-300 dark:ring-neutral-800">
                    +{assignees.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-neutral-500"
                title="Unassigned"
              >
                <User className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )}
      </div>

      {isUpdating && (
        <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/70 backdrop-blur-[1px] dark:bg-neutral-800/70">
          <Loader2 className="h-5 w-5 animate-spin text-[#c72fb2]" />
        </div>
      )}
    </div>
  );
};

const ProjectBoard = ({
  tasks = [],
  showAssignee = true,
  onSelectTask,
  onUpdateStatus,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Auto-scroll loop when dragging near viewport boundaries
  useEffect(() => {
    if (!draggedTaskId) return;

    let animId = null;
    let scrollSpeedY = 0;
    let scrollSpeedX = 0;

    const EDGE_THRESHOLD = 90;
    const MAX_SPEED = 24;

    const handleDragOverDoc = (e) => {
      const { clientY, clientX } = e;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Vertical auto-scroll calculation
      if (clientY < EDGE_THRESHOLD) {
        const factor = (EDGE_THRESHOLD - Math.max(0, clientY)) / EDGE_THRESHOLD;
        scrollSpeedY = -Math.max(4, Math.round(factor * MAX_SPEED));
      } else if (clientY > windowHeight - EDGE_THRESHOLD) {
        const factor = (clientY - (windowHeight - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
        scrollSpeedY = Math.max(4, Math.round(factor * MAX_SPEED));
      } else {
        scrollSpeedY = 0;
      }

      // Horizontal auto-scroll calculation (in case viewport overflows horizontally)
      if (clientX < EDGE_THRESHOLD) {
        const factor = (EDGE_THRESHOLD - Math.max(0, clientX)) / EDGE_THRESHOLD;
        scrollSpeedX = -Math.max(4, Math.round(factor * MAX_SPEED));
      } else if (clientX > windowWidth - EDGE_THRESHOLD) {
        const factor = (clientX - (windowWidth - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
        scrollSpeedX = Math.max(4, Math.round(factor * MAX_SPEED));
      } else {
        scrollSpeedX = 0;
      }

      if ((scrollSpeedY !== 0 || scrollSpeedX !== 0) && !animId) {
        startScrollLoop();
      }
    };

    const startScrollLoop = () => {
      const step = () => {
        if (scrollSpeedY !== 0 || scrollSpeedX !== 0) {
          window.scrollBy({
            top: scrollSpeedY,
            left: scrollSpeedX,
            behavior: "auto",
          });
          animId = requestAnimationFrame(step);
        } else {
          animId = null;
        }
      };
      animId = requestAnimationFrame(step);
    };

    const handleWheelDuringDrag = (e) => {
      window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "auto" });
    };

    const handleStopDrag = () => {
      scrollSpeedY = 0;
      scrollSpeedX = 0;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    document.addEventListener("dragover", handleDragOverDoc, { passive: false });
    window.addEventListener("wheel", handleWheelDuringDrag, { passive: true });
    document.addEventListener("dragend", handleStopDrag);
    document.addEventListener("drop", handleStopDrag);

    return () => {
      handleStopDrag();
      document.removeEventListener("dragover", handleDragOverDoc);
      window.removeEventListener("wheel", handleWheelDuringDrag);
      document.removeEventListener("dragend", handleStopDrag);
      document.removeEventListener("drop", handleStopDrag);
    };
  }, [draggedTaskId]);

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("text/plain", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverGroupId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e, groupId) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverGroupId(null);
    }
  };

  const handleDrop = async (e, group) => {
    e.preventDefault();
    const targetGroupId = group.id;
    setDragOverGroupId(null);

    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId || !onUpdateStatus || updatingTaskId) return;

    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;

    // Do nothing if already in target status group
    if (isTaskInGroup(task, targetGroupId)) return;

    try {
      setUpdatingTaskId(task.id);
      await onUpdateStatus(task, group.apiStatus || group.id);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="relative">
      {/* Floating Quick Drop Bar when dragging any card */}
      {draggedTaskId && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-pink-300 bg-white/95 px-4 py-2.5 shadow-2xl backdrop-blur-md dark:border-pink-500/60 dark:bg-neutral-900/95 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-xs font-black text-slate-500 dark:text-neutral-400 mr-1 hidden sm:inline">
            Quick Drop:
          </span>
          {GROUPS.map((g) => {
            const GIcon = g.icon;
            const isOver = dragOverGroupId === `quick_${g.id}`;
            return (
              <div
                key={`quick_${g.id}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, `quick_${g.id}`)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, g)}
                className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all cursor-copy ${
                  isOver
                    ? "border-pink-500 bg-pink-100 text-pink-700 scale-105 shadow-md dark:bg-pink-950 dark:text-pink-300"
                    : "border-dashed border-slate-300 bg-slate-50 text-slate-700 hover:border-pink-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                <GIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{g.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Kanban Columns Grid - items-stretch guarantees all columns have the exact same full height */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
        {GROUPS.map((group) => {
          const groupTasks = tasks.filter((task) => isTaskInGroup(task, group.id));
          const IconComponent = group.icon;
          const isDragOver = dragOverGroupId === group.id;

          return (
            <div
              key={group.id}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, group.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group)}
              className={`flex flex-col h-full rounded-2xl border p-3 transition-all duration-200 shadow-2xs ${
                isDragOver
                  ? "border-pink-400 bg-pink-50/40 ring-2 ring-pink-400/40 dark:border-pink-500/80 dark:bg-pink-950/20"
                  : "border-slate-200/80 bg-slate-50/70 dark:border-neutral-800 dark:bg-neutral-900/60"
              }`}
            >
              {/* Sticky Column Header with drop support */}
              <div
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, group.id)}
                onDrop={(e) => handleDrop(e, group)}
                className="sticky top-2 z-10 mb-3 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/95 px-3 py-2.5 backdrop-blur-md shadow-2xs dark:border-neutral-800 dark:bg-neutral-900/95"
              >
                <div className="flex items-center gap-2">
                  <span className={group.dotClass}>
                    <IconComponent className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    {group.title}
                  </h3>
                </div>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-slate-600 shadow-2xs dark:bg-neutral-800 dark:text-neutral-300">
                  {groupTasks.length}
                </span>
              </div>

              {/* Drop Target Indicator */}
              {isDragOver && (
                <div className="mb-2.5 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pink-400 bg-white/90 py-3 text-xs font-bold text-pink-600 shadow-xs dark:border-pink-500 dark:bg-neutral-800/90 dark:text-pink-400 animate-pulse">
                  <span>Drop to move to {group.title}</span>
                </div>
              )}

              {/* Column Cards (flex-1 ensures drop area extends all the way to bottom of the column) */}
              <div className="flex flex-1 flex-col gap-2.5 min-h-[260px] pb-4">
                {groupTasks.length === 0 ? (
                  <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-slate-200/90 py-8 text-center dark:border-neutral-800">
                    <p className="text-xs font-medium text-slate-400 dark:text-neutral-500">
                      No projects in this stage
                    </p>
                  </div>
                ) : (
                  groupTasks.map((task) => (
                    <ProjectCard
                      key={task.id}
                      task={task}
                      onSelectTask={onSelectTask}
                      showAssignee={showAssignee}
                      isDraggable={Boolean(onUpdateStatus)}
                      isDragged={draggedTaskId === task.id}
                      isUpdating={updatingTaskId === task.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectBoard;
