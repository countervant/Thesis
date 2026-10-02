import { useState, useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import api from "../../services/api.js";

const Addtask = lazy(() => import("../../pages/Dashboard/Admin/Addtask.jsx"));

const formatInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayInputDate = () => formatInputDate(new Date());

const ModalLoadingSpinner = ({ message = "Synthesizing project title, tasks, budget, and deadlines...", onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 text-neutral-950 dark:text-white">
    <div className="w-full max-w-[420px] rounded-2xl bg-white p-7 text-center shadow-2xl dark:bg-[#0c0c0c] dark:ring-1 dark:ring-neutral-800">
      <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#dc4fb2]" />
      <h3
        className="mt-4 text-lg font-black uppercase text-neutral-900 dark:text-white"
        style={{ fontFamily: "var(--font-bruno)" }}
      >
        Analyzing Chat
      </h3>
      <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {message}
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-lg border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          Cancel
        </button>
      )}
    </div>
  </div>
);

/**
 * ReviewProjectModal
 * Reuses CLIENTRA's canonical Addtask component pre-filled with Gemini chat extraction.
 * Exactly matches "Create Project" in the project section.
 */
export default function ReviewProjectModal({
  isOpen,
  onClose,
  conversationId,
  initialData = null,
  onProjectCreated,
}) {
  const [isLoading, setIsLoading] = useState(() => !initialData && Boolean(conversationId));
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedTask, setExtractedTask] = useState(() => {
    if (!initialData) return null;
    return {
      title: initialData.projectName || "",
      description: initialData.clientSummary || "",
      amount: initialData.budgetCeiling ?? "",
      dueDate: initialData.targetDeadline || todayInputDate(),
      priority: (initialData.priority || "medium").toLowerCase(),
      requestedBy: conversationId,
      subtasks: Array.isArray(initialData.tasks)
        ? initialData.tasks.map((t) => ({
            title: t.title || "",
            completed: false,
            assignedTo: "",
          }))
        : [],
    };
  });

  const fetchExtraction = async () => {
    if (!conversationId) {
      setExtractedTask({
        title: "",
        description: "",
        dueDate: todayInputDate(),
        priority: "medium",
        subtasks: [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.post(`/chat/${conversationId}/extract-preview`);
      const payload = response.data?.data || response.data;
      if (payload) {
        setExtractedTask({
          title: payload.projectName || "",
          description: payload.clientSummary || "",
          amount: payload.budgetCeiling ?? "",
          dueDate: payload.targetDeadline || todayInputDate(),
          priority: (payload.priority || "medium").toLowerCase(),
          requestedBy: conversationId,
          subtasks: Array.isArray(payload.tasks)
            ? payload.tasks.map((t) => ({
                title: t.title || "",
                completed: false,
                assignedTo: "",
              }))
            : [],
        });
      } else {
        setExtractedTask({
          title: "",
          description: "",
          dueDate: todayInputDate(),
          priority: "medium",
          requestedBy: conversationId,
          subtasks: [],
        });
      }
    } catch (err) {
      console.error("Failed to extract project proposal:", err);
      setErrorMessage(
        err.response?.data?.message ||
          "Could not automatically extract project details. You can enter them manually."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    if (isOpen && !initialData) {
      Promise.resolve().then(() => {
        if (isSubscribed) {
          fetchExtraction();
        }
      });
    }
    return () => {
      isSubscribed = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conversationId]);

  if (!isOpen) return null;

  if (isLoading) {
    return <ModalLoadingSpinner onClose={onClose} />;
  }

  if (errorMessage && !extractedTask) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 text-neutral-950 dark:text-white">
        <div className="w-full max-w-[460px] rounded-2xl bg-white p-7 text-center shadow-2xl dark:bg-[#0c0c0c] dark:ring-1 dark:ring-neutral-800">
          <p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-neutral-300 px-4 text-xs font-bold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setExtractedTask({
                  title: "",
                  description: "",
                  dueDate: todayInputDate(),
                  priority: "medium",
                  requestedBy: conversationId,
                  subtasks: [],
                });
                setErrorMessage("");
              }}
              className="h-9 rounded-lg bg-[#dc4fb2] px-4 text-xs font-bold text-white transition hover:brightness-105"
            >
              Open Blank Project Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ModalLoadingSpinner onClose={onClose} />}>
      <Addtask
        key={`addtask-${conversationId}-${extractedTask?.title || "blank"}`}
        task={extractedTask}
        onNavigate={() => onClose()}
        onTaskCreated={() => {
          onProjectCreated?.();
          onClose();
        }}
      />
    </Suspense>
  );
}
