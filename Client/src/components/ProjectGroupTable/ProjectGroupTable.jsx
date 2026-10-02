import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  CircleDot,
  Disc,
  Flag,
  GripVertical,
  Loader2,
  Search,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { authAPI, taskAPI } from "../../services/api.js";

const GROUPS = [
  {
    id: "in_progress",
    apiStatus: "in_progress",
    title: "IN PROGRESS",
    icon: CircleDot,
    badgeClass: "bg-[#0070f3] text-white shadow-xs",
    dotClass: "text-[#0070f3]",
  },
  {
    id: "review",
    apiStatus: "review",
    title: "IN REVIEW",
    icon: Disc,
    badgeClass: "bg-[#475569] text-white shadow-xs",
    dotClass: "text-[#475569]",
  },
  {
    id: "pending",
    apiStatus: "pending",
    title: "REVISION",
    icon: CircleDashed,
    badgeClass: "border border-slate-300 bg-white/90 text-slate-700 shadow-xs dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200",
    dotClass: "text-slate-400",
  },
  {
    id: "done",
    apiStatus: "done",
    title: "COMPLETE",
    icon: CheckCircle2,
    badgeClass: "bg-[#16a34a] text-white shadow-xs",
    dotClass: "text-[#16a34a]",
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

const formatRowDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const formatAssigneeName = (assignee) => {
  if (!assignee) return "Unnamed user";
  const name = [assignee.firstName, assignee.lastName].filter(Boolean).join(" ");
  const label = name || assignee.email || assignee.name || "Unnamed user";
  return assignee.isSelf ? `${label} (Myself)` : label;
};

const getAssigneeLabel = (task) => {
  const employees = [...(task.assignees || []), task.assignedTo].filter(Boolean);
  if (employees.length === 0) return null;
  const first = employees[0];
  const name =
    typeof first === "string"
      ? first
      : [first.firstName, first.lastName].filter(Boolean).join(" ") ||
        first.email ||
        first.name ||
        "Assigned";
  if (employees.length > 1) {
    return `${name} +${employees.length - 1}`;
  }
  return name;
};

const StatusPill = ({ group, size = "normal" }) => {
  const IconComponent = group.icon;
  const isLarge = size === "large";
  return (
    <span
      className={`inline-flex items-center rounded-[4px] font-bold uppercase tracking-wider ${
        isLarge
          ? "gap-2 px-3.5 py-1 text-xs"
          : "gap-1.5 px-2.5 py-0.5 text-[10px]"
      } ${group.badgeClass}`}
    >
      <IconComponent className={isLarge ? "h-3.5 w-3.5 shrink-0" : "h-3 w-3 shrink-0"} />
      <span>{group.title}</span>
    </span>
  );
};

const MiniCalendar = ({ selectedDate, onSelectDate, isUpdating }) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [viewDate, setViewDate] = useState(
    Number.isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = (e) => {
    e.stopPropagation();
    setViewDate(new Date());
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  const startingDay = (firstDayOfMonth.getDay() + 6) % 7;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedStr = selectedDate ? toInputDate(selectedDate) : "";

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const cells = [];
  for (let i = 0; i < startingDay; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateStr: dStr });
  }

  return (
    <div className="w-full">
      {/* Month Navigator */}
      <div className="flex items-center justify-between pb-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 dark:text-neutral-500">
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
        <span>Su</span>
      </div>

      {/* Days Grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-7 w-7" />;
          }

          const isSelected = cell.dateStr === selectedStr;
          const isToday = cell.dateStr === todayStr;

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDate(cell.dateStr);
              }}
              className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? "bg-[#dc4fb2] text-white shadow-xs font-bold"
                  : isToday
                  ? "border border-pink-400 font-bold text-pink-600 dark:border-pink-500 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                  : "text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ProjectGroupTable = ({
  tasks = [],
  showAssignee = true,
  onSelectTask,
  onUpdateAssignees,
  onUpdateDueDate,
  onUpdateStatus,
}) => {
  const [collapsed, setCollapsed] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [activeAssigneeTaskId, setActiveAssigneeTaskId] = useState(null);
  const [popoverCoords, setPopoverCoords] = useState({
    openAbove: false,
    top: 0,
    bottom: 0,
    left: 0,
    maxHeight: 380,
  });
  const [assigneesList, setAssigneesList] = useState([]);
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const popoverRef = useRef(null);

  const [activeDueDateTaskId, setActiveDueDateTaskId] = useState(null);
  const [dueDatePopoverCoords, setDueDatePopoverCoords] = useState({
    openAbove: false,
    top: 0,
    bottom: 0,
    left: 0,
    maxHeight: 450,
  });
  const dueDatePopoverRef = useRef(null);

  useEffect(() => {
    if (!activeAssigneeTaskId) return;

    const handlePointerDown = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActiveAssigneeTaskId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveAssigneeTaskId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeAssigneeTaskId]);

  useEffect(() => {
    if (!activeDueDateTaskId) return;

    const handlePointerDown = (event) => {
      if (dueDatePopoverRef.current && !dueDatePopoverRef.current.contains(event.target)) {
        setActiveDueDateTaskId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveDueDateTaskId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDueDateTaskId]);

  const fetchAssignees = async () => {
    try {
      setIsLoadingAssignees(true);
      const data = await authAPI.getAssignees();
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.assignees)
        ? data.assignees
        : Array.isArray(data?.users)
        ? data.users
        : [];
      const available = normalized.filter(
        (a) => a?.role === "employee" || (a?.role === "admin" && a?.isSelf)
      );
      setAssigneesList(available);
    } catch (err) {
      console.error("Failed to load assignees:", err);
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  const handleAssigneeClick = (e, task) => {
    e.stopPropagation();

    if (activeAssigneeTaskId === task.id) {
      setActiveAssigneeTaskId(null);
      return;
    }

    setActiveDueDateTaskId(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 280;
    const estimatedHeight = 360;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setPopoverCoords({
      openAbove,
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left,
      maxHeight: openAbove ? Math.min(spaceAbove - 16, 400) : Math.min(spaceBelow - 16, 400),
    });
    setActiveAssigneeTaskId(task.id);
    setSearchQuery("");
    setErrorMessage("");

    if (assigneesList.length === 0) {
      fetchAssignees();
    }
  };

  const handleDueDateClick = (e, task) => {
    e.stopPropagation();

    if (activeDueDateTaskId === task.id) {
      setActiveDueDateTaskId(null);
      return;
    }

    setActiveAssigneeTaskId(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 288;
    const estimatedHeight = 340;

    let left = rect.left - 40;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setDueDatePopoverCoords({
      openAbove,
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left,
      maxHeight: openAbove ? Math.min(spaceAbove - 16, 460) : Math.min(spaceBelow - 16, 460),
    });
    setActiveDueDateTaskId(task.id);
    setErrorMessage("");
  };

  const handleToggleAssignee = async (targetTask, employeeId) => {
    if (updatingTaskId) return;

    const currentIds = (
      targetTask.assignees?.length
        ? targetTask.assignees
        : [targetTask.assignedTo]
    )
      .filter(Boolean)
      .map(getEntityId);

    const isAssigned = currentIds.includes(employeeId);
    const nextAssigneeIds = isAssigned
      ? currentIds.filter((id) => id !== employeeId)
      : [...currentIds, employeeId];

    try {
      setUpdatingTaskId(targetTask.id);
      setErrorMessage("");

      if (onUpdateAssignees) {
        await onUpdateAssignees(targetTask, nextAssigneeIds);
      } else {
        const updatedSubtasks = (targetTask.subtasks || []).map((subtask) => {
          const subtaskAssigneeId = getEntityId(subtask.assignedTo);
          return subtaskAssigneeId && !nextAssigneeIds.includes(subtaskAssigneeId)
            ? { ...subtask, assignedTo: null }
            : subtask;
        });

        await taskAPI.update(targetTask.id, {
          assignedTo: nextAssigneeIds[0] || null,
          assignees: nextAssigneeIds,
          subtasks: updatedSubtasks,
        });
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to update assignee"
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleClearAssignees = async (targetTask) => {
    if (updatingTaskId) return;
    try {
      setUpdatingTaskId(targetTask.id);
      setErrorMessage("");

      if (onUpdateAssignees) {
        await onUpdateAssignees(targetTask, []);
      } else {
        const updatedSubtasks = (targetTask.subtasks || []).map((subtask) => ({
          ...subtask,
          assignedTo: null,
        }));

        await taskAPI.update(targetTask.id, {
          assignedTo: null,
          assignees: [],
          subtasks: updatedSubtasks,
        });
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to clear assignees"
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSelectDueDate = async (targetTask, newDateString) => {
    if (updatingTaskId) return;
    try {
      setUpdatingTaskId(targetTask.id);
      setErrorMessage("");

      const formatted = toInputDate(newDateString);
      if (onUpdateDueDate) {
        await onUpdateDueDate(targetTask, formatted);
      } else {
        const currentStart = toInputDate(targetTask.startDate);
        const finalStart = currentStart && currentStart > formatted ? formatted : currentStart;
        await taskAPI.update(targetTask.id, {
          title: targetTask.title,
          description: targetTask.description,
          startDate: finalStart,
          dueDate: formatted,
          priority: targetTask.priority,
          assignedTo: getEntityId(targetTask.assignedTo) || null,
          assignees: (targetTask.assignees || []).map(getEntityId).filter(Boolean),
          subtasks: targetTask.subtasks,
        });
      }
      setActiveDueDateTaskId(null);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to update due date"
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const toggleGroup = (groupId) => {
    setCollapsed((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const activeTask = tasks.find((t) => t.id === activeAssigneeTaskId);
  const activeAssigneeIds = (
    activeTask?.assignees?.length
      ? activeTask.assignees
      : [activeTask?.assignedTo]
  )
    .filter(Boolean)
    .map(getEntityId);

  const filteredAssignees = assigneesList.filter((assignee) => {
    if (!searchQuery.trim()) return true;
    const name = formatAssigneeName(assignee).toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || (assignee.email && assignee.email.toLowerCase().includes(query));
  });

  const activeDueDateTask = tasks.find((t) => t.id === activeDueDateTaskId);

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

    if (isTaskInGroup(task, targetGroupId)) return;

    try {
      setUpdatingTaskId(task.id);
      await onUpdateStatus(task, group.apiStatus || group.id);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {GROUPS.map((group) => {
        const groupTasks = tasks.filter((task) => isTaskInGroup(task, group.id));
        const isCollapsed = Boolean(collapsed[group.id]);
        const isDragOver = dragOverGroupId === group.id;

        return (
          <div
            key={group.id}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, group.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, group)}
            className={`rounded-2xl border transition-all duration-200 dark:bg-neutral-900 ${
              isDragOver
                ? "border-pink-400 bg-pink-50/40 ring-2 ring-pink-400/40 dark:border-pink-500/80 dark:bg-pink-950/20"
                : "border-slate-200/70 bg-white shadow-xs dark:border-neutral-800"
            }`}
          >
            {/* Group Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="group flex items-center gap-2.5 text-left transition"
              >
                <span className="text-slate-400 transition-transform group-hover:text-slate-600 dark:text-neutral-500">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
                <StatusPill group={group} size="large" />
                <span className="text-sm font-semibold text-slate-400 dark:text-neutral-500">
                  {groupTasks.length}
                </span>
              </button>

              {isDragOver && (
                <span className="text-xs font-bold text-pink-600 dark:text-pink-400 animate-pulse">
                  Drop to move to {group.title}
                </span>
              )}
            </div>

            {/* Tasks Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-neutral-800 dark:text-neutral-500">
                      <th className="py-2.5 pl-6 pr-4">Name</th>
                      {showAssignee && <th className="w-36 px-4 py-2.5">Assignee</th>}
                      <th className="w-32 px-4 py-2.5">Due Date</th>
                      <th className="w-24 px-4 py-2.5">Priority</th>
                      <th className="w-40 py-2.5 pl-4 pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                    {groupTasks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={showAssignee ? 5 : 4}
                          className="py-6 text-center text-xs text-slate-400 dark:text-neutral-500"
                        >
                          No tasks in this group
                        </td>
                      </tr>
                    ) : (
                      groupTasks.map((task) => {
                        const assigneeLabel = getAssigneeLabel(task);
                        const rowDate = formatRowDate(task.dueDate);
                        const priorityColor =
                          task.priority === "high"
                            ? "text-rose-500 fill-rose-500/20"
                            : task.priority === "medium"
                            ? "text-amber-500 fill-amber-500/20"
                            : "text-emerald-500 fill-emerald-500/20";

                        return (
                          <tr
                            key={task.id}
                            draggable={Boolean(onUpdateStatus) && updatingTaskId !== task.id}
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectTask?.(task.id)}
                            className={`group transition hover:bg-slate-50/80 dark:hover:bg-neutral-800/50 ${
                              onUpdateStatus ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                            } ${
                              draggedTaskId === task.id
                                ? "opacity-30 bg-pink-50/40"
                                : ""
                            }`}
                          >
                            {/* Name Column with Bullet */}
                            <td className="py-3 pl-6 pr-4">
                              <div className="flex items-center gap-2.5">
                                {onUpdateStatus && (
                                  <span className="text-slate-300 transition-colors group-hover:text-slate-500 dark:text-neutral-600 dark:group-hover:text-neutral-400">
                                    <GripVertical className="h-3.5 w-3.5" />
                                  </span>
                                )}
                                <span className={`shrink-0 ${group.dotClass}`}>
                                  <CircleDot className="h-4 w-4" />
                                </span>
                                <span className="font-semibold text-slate-800 transition group-hover:text-pink-600 dark:text-neutral-200 dark:group-hover:text-pink-400">
                                  {task.title}
                                </span>
                              </div>
                            </td>

                            {/* Assignee Column (Admin only) */}
                            {showAssignee && (
                              <td className="w-36 px-4 py-3">
                                {assigneeLabel ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleAssigneeClick(e, task)}
                                    className="group/assignee inline-flex max-w-[130px] items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left font-medium text-slate-700 transition hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                    title={`Assigned: ${assigneeLabel} - Click to change`}
                                  >
                                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                                      {assigneeLabel[0]?.toUpperCase()}
                                    </span>
                                    <span className="truncate">{assigneeLabel}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleAssigneeClick(e, task)}
                                    className="group/assignee inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-400 transition hover:bg-pink-50 hover:text-pink-600 dark:text-neutral-500 dark:hover:bg-pink-950/20 dark:hover:text-pink-400"
                                    title="Click to add assignee"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    <span className="text-[11px] font-medium">Assign</span>
                                  </button>
                                )}
                              </td>
                            )}

                            {/* Due Date Column */}
                            <td className="w-32 px-4 py-3">
                              {onUpdateDueDate ? (
                                rowDate ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDueDateClick(e, task)}
                                    className="group/date inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                                    title={`Due: ${rowDate} - Click to update`}
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 transition group-hover/date:text-pink-500" />
                                    <span>{rowDate}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDueDateClick(e, task)}
                                    className="group/date inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 transition hover:bg-pink-50 hover:text-pink-600 dark:text-neutral-500 dark:hover:bg-pink-950/20 dark:hover:text-pink-400"
                                    title="Click to set due date"
                                  >
                                    <CalendarPlus className="h-4 w-4" />
                                    <span className="text-[11px] font-medium">Set date</span>
                                  </button>
                                )
                              ) : rowDate ? (
                                <span
                                  className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-neutral-400"
                                  title={`Due: ${rowDate}`}
                                >
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{rowDate}</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center text-slate-400"
                                  title="No due date"
                                >
                                  <CalendarPlus className="h-4 w-4" />
                                </span>
                              )}
                            </td>

                            {/* Priority Column */}
                            <td className="w-24 px-4 py-3">
                              <span
                                className="inline-flex items-center"
                                title={`Priority: ${task.priority || "Medium"}`}
                              >
                                <Flag className={`h-4 w-4 ${priorityColor}`} />
                              </span>
                            </td>

                            {/* Status Column */}
                            <td className="w-40 py-3 pl-4 pr-6">
                              <StatusPill group={group} size="normal" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Interactive Assignee Picker Popover Dropdown */}
      {activeAssigneeTaskId && activeTask && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            left: popoverCoords.left,
            ...(popoverCoords.openAbove
              ? { bottom: popoverCoords.bottom }
              : { top: popoverCoords.top }),
            maxHeight: popoverCoords.maxHeight,
          }}
          className="fixed z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
            <div className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-[#c72fb2]" />
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Assign Project
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveAssigneeTaskId(null)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mt-2.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search team member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none transition focus:border-pink-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:border-pink-500"
            />
          </div>

          {/* Assignees List */}
          <div className="mt-2 max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-50 dark:divide-neutral-800/40">
            {isLoadingAssignees ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                <span>Loading team members...</span>
              </div>
            ) : filteredAssignees.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                No team members found
              </p>
            ) : (
              filteredAssignees.map((assignee) => {
                const assigneeId = getEntityId(assignee);
                const isAssigned = activeAssigneeIds.includes(assigneeId);
                const isUpdatingThis = updatingTaskId === activeTask.id;
                const isUnavailable = Boolean(assignee?.isOnLeave) && !isAssigned;

                return (
                  <button
                    key={assigneeId}
                    type="button"
                    disabled={isUpdatingThis || isUnavailable}
                    onClick={() => handleToggleAssignee(activeTask, assigneeId)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      isUnavailable
                        ? "cursor-not-allowed opacity-60 bg-amber-50/50 dark:bg-amber-950/20"
                        : isAssigned
                        ? "bg-pink-50/70 text-[#c72fb2] font-semibold dark:bg-pink-950/30"
                        : "hover:bg-slate-50 text-slate-700 font-medium dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pink-100 text-[10px] font-bold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                        {(assignee.firstName?.[0] || assignee.email?.[0] || "U").toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate">
                          {formatAssigneeName(assignee)}
                        </span>
                        {assignee?.isOnLeave && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                            On approved leave
                          </span>
                        )}
                      </div>
                    </div>

                    {isAssigned && (
                      <Check className="h-4 w-4 shrink-0 text-[#c72fb2]" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="mt-2 text-[11px] font-semibold text-rose-500">
              {errorMessage}
            </p>
          )}

          {/* Footer / Clear Action */}
          {activeAssigneeIds.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">
                {activeAssigneeIds.length} assigned
              </span>
              <button
                type="button"
                disabled={Boolean(updatingTaskId)}
                onClick={() => handleClearAssignees(activeTask)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 transition"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>Unassign all</span>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Flexible Interactive Due Date Picker Popover */}
      {activeDueDateTaskId && activeDueDateTask && createPortal(
        <div
          ref={dueDatePopoverRef}
          style={{
            position: "fixed",
            left: dueDatePopoverCoords.left,
            ...(dueDatePopoverCoords.openAbove
              ? { bottom: dueDatePopoverCoords.bottom }
              : { top: dueDatePopoverCoords.top }),
            maxHeight: dueDatePopoverCoords.maxHeight,
          }}
          className="fixed z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#c72fb2]" />
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Update Due Date
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveDueDateTaskId(null)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Interactive Mini Calendar */}
          <div className="mt-2.5">
            <MiniCalendar
              key={activeDueDateTask.dueDate || activeDueDateTask.id}
              selectedDate={activeDueDateTask.dueDate}
              onSelectDate={(dateStr) => handleSelectDueDate(activeDueDateTask, dateStr)}
              isUpdating={Boolean(updatingTaskId)}
            />
          </div>

          {/* Direct Input (Flexible date choice) */}
          <div className="mt-3 border-t border-slate-100 pt-2 dark:border-neutral-800">
            <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
              Custom Date
            </label>
            <input
              type="date"
              disabled={Boolean(updatingTaskId)}
              value={toInputDate(activeDueDateTask.dueDate)}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectDueDate(activeDueDateTask, e.target.value);
                }
              }}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-pink-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            />
          </div>

          {/* Updating indicator or error */}
          {updatingTaskId === activeDueDateTask.id && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-pink-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Updating date...</span>
            </div>
          )}
          {errorMessage && (
            <p className="mt-2 text-[11px] font-semibold text-rose-500">
              {errorMessage}
            </p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProjectGroupTable;
