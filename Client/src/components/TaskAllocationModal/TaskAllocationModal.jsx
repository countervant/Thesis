import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import InitialsAvatar from "../InitialsAvatar/InitialsAvatar.jsx";
import {
  useAllocationPreviewQuery,
  useAllocationMutations,
} from "../../hooks/index.js";

export default function TaskAllocationModal({
  isOpen,
  onClose,
  projectId = null,
  initialTasks = null,
  onAllocationCommitted,
}) {
  const [localErrorMessage, setLocalErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Manual overrides map: taskId -> employeeId
  const [manualAssignments, setManualAssignments] = useState({});
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    onClose();
  }, [onClose]);

  const payload = useMemo(() => {
    const p = {};
    if (Array.isArray(initialTasks) && initialTasks.length > 0) {
      p.tasks = initialTasks.map((t) => ({
        _id: t._id || t.id,
        id: t._id || t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status || t.apiStatus,
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks.map((st) => (typeof st === "string" ? st : st?.title || ""))
          : [],
      }));
    }
    return p;
  }, [initialTasks]);

  const {
    data: optimizationData,
    isLoading: isOptimizing,
    error: optimizationError,
    refetch: refetchOptimization,
  } = useAllocationPreviewQuery({
    projectId,
    payload,
    isOpen,
    enabled: Boolean(isOpen),
  });

  const { commitAllocation: commitMutation } = useAllocationMutations();
  const isCommitting = commitMutation.isPending;

  const errorMessage =
    localErrorMessage ||
    (optimizationError
      ? (optimizationError.response?.data?.message ||
         optimizationError.message ||
         "Failed to optimize task allocation with Hungarian algorithm.")
      : "");

  const handleReoptimize = useCallback(() => {
    setManualAssignments({});
    setLocalErrorMessage("");
    setSuccessMessage("");
    refetchOptimization();
  }, [refetchOptimization]);

  // Employee lookup map for O(1) override resolution
  const employeeMap = useMemo(() => {
    const map = new Map();
    (optimizationData?.availableEmployees || []).forEach((e) => {
      map.set(String(e._id), e);
    });
    return map;
  }, [optimizationData?.availableEmployees]);

  // Compute final effective assignments merging Hungarian result with manual overrides
  const effectiveAssignments = useMemo(() => {
    if (!optimizationData?.matches) return [];
    return optimizationData.matches.map((match) => {
      const taskId = String(match.task?._id || match.task?.id);
      const overriddenEmpId = manualAssignments[taskId];
      let assignedEmp = match.assignedEmployee;

      if (overriddenEmpId) {
        const found = employeeMap.get(String(overriddenEmpId));
        if (found) {
          assignedEmp = {
            ...assignedEmp,
            ...found,
            isManuallyAssigned: true,
          };
        }
      }

      return {
        ...match,
        assignedEmployee: assignedEmp,
        isOverridden: Boolean(overriddenEmpId),
      };
    });
  }, [optimizationData, manualAssignments, employeeMap]);

  const handleManualReassign = useCallback((taskId, employeeId) => {
    setManualAssignments((prev) => ({
      ...prev,
      [String(taskId)]: employeeId,
    }));
  }, []);

  const handleCommit = async () => {
    if (effectiveAssignments.length === 0 || isCommitting) return;

    setLocalErrorMessage("");

    try {
      const assignments = effectiveAssignments
        .filter((m) => (m?.task?._id || m?.task?.id) && m?.assignedEmployee?._id)
        .map((m) => ({
          taskId: String(m.task._id || m.task.id),
          employeeId: String(m.assignedEmployee._id),
        }));

      const res = await commitMutation.mutateAsync({
        projectId: projectId || "global",
        payload: {
          assignments,
          status: "To Do",
        },
      });

      setSuccessMessage(res?.message || "Tasks assigned successfully!");
      if (onAllocationCommitted) {
        onAllocationCommitted(res?.data || res);
      }

      // Auto close after brief display
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to commit assignments:", err);
      setLocalErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to commit task assignments to database."
      );
    }
  };

  if (!isOpen) return null;

  const matches = effectiveAssignments;
  const unassigned = optimizationData?.unassignedTasks || [];
  const candidateEmployees = optimizationData?.availableEmployees || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#0d0d0d] dark:text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-[#dc4fb2] to-pink-500 text-white shadow-sm">
              <Cpu className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase sm:text-lg"
                  style={{ fontFamily: "var(--font-bruno)" }}
                >
                  Auto Assign
                </h2>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {isOptimizing ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-[#dc4fb2]" />
              <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
                Loading...
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-slate-600 dark:text-neutral-400">
                No unassigned tasks found to allocate.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                All tasks are currently assigned.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Recommended Assignments ({matches.length})
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  You can manually reassign any task before applying.
                </span>
              </div>

              <div className="space-y-2.5">
                {matches.map((item) => {
                  const t = item.task;
                  const emp = item.assignedEmployee;

                  return (
                    <div
                      key={t._id}
                      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-pink-300 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-pink-500/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Task Info */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {t.title}
                          </h4>
                        </div>

                        {t.description && (
                          <p className="line-clamp-1 text-xs text-slate-500 dark:text-neutral-400">
                            {t.description}
                          </p>
                        )}

                        {/* Skills Required */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Skills:
                          </span>
                          {Array.isArray(t.requiredSkills) &&
                          t.requiredSkills.length > 0 ? (
                            t.requiredSkills.map((skill, idx) => {
                              const isMatched =
                                item.matchedSkills?.includes(skill.toLowerCase()) ||
                                item.matchedSkills?.includes(skill);
                              return (
                                <span
                                  key={idx}
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                    isMatched
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                      : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400"
                                  }`}
                                >
                                  {skill}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] italic text-slate-400">
                              General task (No specific skill specified)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="hidden sm:block text-slate-300 dark:text-neutral-700">
                        <ArrowRight className="h-4 w-4" />
                      </div>

                      {/* Employee Match Card & Manual Dropdown */}
                      <div className="flex items-center gap-3 shrink-0 rounded-xl bg-slate-50 p-2 dark:bg-neutral-800/60 border border-slate-100 dark:border-neutral-700/60 sm:min-w-[280px] justify-between">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar
                            user={emp}
                            name={`${emp.firstName || ""} ${emp.lastName || ""}`}
                            className="h-9 w-9 ring-1 ring-slate-200 dark:ring-neutral-700"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {emp.firstName} {emp.lastName}
                              </span>
                              {item.isOverridden && (
                                <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  Manual
                                </span>
                              )}
                            </div>
                            <span className="block text-[10px] text-slate-500 dark:text-neutral-400 truncate max-w-[130px]">
                              {emp.position || "Team Member"} • {emp.currentActiveTasks || 0} active
                            </span>
                          </div>
                        </div>

                        {/* Quick Reassign Select */}
                        <div className="relative">
                          <select
                            value={emp._id}
                            onChange={(e) =>
                              handleManualReassign(t._id, e.target.value)
                            }
                            className="text-[10px] font-bold text-slate-600 dark:text-neutral-300 bg-transparent outline-none hover:text-pink-600 dark:hover:text-pink-400 cursor-pointer pr-1"
                            title="Reassign employee"
                          >
                            <option value={emp._id} disabled>
                              Swap assignee...
                            </option>
                            {candidateEmployees.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.firstName} {c.lastName} ({c.position || "Staff"})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unassigned Tasks if any */}
              {unassigned.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">
                      Unassigned Tasks ({unassigned.length})
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
                    These tasks could not be matched due to team workload saturation. Consider adding capacity or adjusting deadlines.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {unassigned.map((ut) => (
                      <li
                        key={ut._id}
                        className="text-xs font-semibold text-slate-700 dark:text-neutral-300"
                      >
                        • {ut.title} ({ut.priority} Priority)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-neutral-800 dark:bg-neutral-900/80">
          <button
            type="button"
            onClick={handleReoptimize}
            disabled={isOptimizing || isCommitting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isOptimizing ? "animate-spin" : ""}`}
            />
            <span>Re-optimize</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCommitting}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting || isOptimizing || matches.length === 0}
              className="flex items-center gap-2 rounded-xl bg-linear-to-r from-[#dc4fb2] to-pink-600 px-5 py-2 text-xs font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Auto Assign ({matches.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
