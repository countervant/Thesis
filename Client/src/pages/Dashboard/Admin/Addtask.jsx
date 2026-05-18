import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { authAPI, taskAPI } from "../../../services/api.js";

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const statusToApi = {
  Pending: "pending",
  "In progress": "in_progress",
  Done: "done",
  "In review": "review",
};

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayInputDate = () => formatInputDate(new Date());

const isPastInputDate = (date) => Boolean(date) && date < todayInputDate();

const toInputDate = (date) => {
  if (!date) return todayInputDate();
  const dateValue = String(date);
  if (dateValue.includes("-")) return dateValue.slice(0, 10);
  const [month, day, year] = dateValue.split("/");
  if (!month || !day || !year) return todayInputDate();
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [{ title: "", completed: false }];

  const normalizedSubtasks = subtasks.map((subtask) => ({
    title: subtask?.title || "",
    completed: Boolean(subtask?.completed),
  }));

  return normalizedSubtasks.length > 0
    ? normalizedSubtasks
    : [{ title: "", completed: false }];
};

const normalizeAssignees = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assignees)) return data.assignees;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatAssigneeName = (assignee) => {
  if (!assignee) return "Myself";

  const name = [assignee.firstName, assignee.lastName].filter(Boolean).join(" ");
  const label = name || assignee.email || "Unnamed user";

  return assignee.isSelf ? `${label} (Myself)` : label;
};

const FieldLabel = ({ children }) => (
  <label className="text-sm font-medium text-neutral-800 dark:text-neutral-300">{children}</label>
);

const Addtask = ({ onNavigate, onTaskCreated, task }) => {
  const { user } = useAuth();
  const isEditing = Boolean(task?.id);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: todayInputDate(),
    dueDate: todayInputDate(),
    priority: "medium",
    assignedTo: getEntityId(user),
    subtasks: [{ title: "", completed: false }],
  });
  const [assignees, setAssignees] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAssignees = async () => {
      try {
        const data = await authAPI.getAssignees();
        const loadedAssignees = normalizeAssignees(data);

        if (isMounted) {
          setAssignees(loadedAssignees);

          setFormData((currentData) => ({
            ...currentData,
            assignedTo:
              currentData.assignedTo ||
              getEntityId(task?.assignedTo) ||
              getEntityId(loadedAssignees[0]) ||
              getEntityId(user),
          }));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || "Unable to load assignees."
          );
        }
      }
    };

    loadAssignees();

    return () => {
      isMounted = false;
    };
  }, [task?.assignedTo, user]);

  useEffect(() => {
    if (!task) {
      return;
    }

    setFormData({
      title: task.title || "",
      description: task.description || "",
      startDate: toInputDate(task.startDate || task.createdAt || task.dueDate),
      dueDate: toInputDate(task.dueDate),
      priority: task.priority || "medium",
      assignedTo: getEntityId(task.assignedTo) || getEntityId(user),
      subtasks: normalizeSubtasks(task.subtasks),
    });
  }, [task, user]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const updateSubtask = (index, field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      subtasks: currentData.subtasks.map((subtask, currentIndex) =>
        currentIndex === index ? { ...subtask, [field]: value } : subtask
      ),
    }));
  };

  const addSubtask = () => {
    setFormData((currentData) => ({
      ...currentData,
      subtasks: [...currentData.subtasks, { title: "", completed: false }],
    }));
  };

  const removeSubtask = (index) => {
    setFormData((currentData) => ({
      ...currentData,
      subtasks:
        currentData.subtasks.length > 1
          ? currentData.subtasks.filter((_, currentIndex) => currentIndex !== index)
          : [{ title: "", completed: false }],
    }));
  };

  const handleCancel = () => {
    onNavigate?.("tasks");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (!formData.dueDate) {
      setErrorMessage("Due date is required.");
      return;
    }

    if (!formData.startDate) {
      setErrorMessage("Start date is required.");
      return;
    }

    if ((!isEditing && isPastInputDate(formData.startDate)) || isPastInputDate(formData.dueDate)) {
      setErrorMessage("Past dates cannot be selected.");
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.dueDate)) {
      setErrorMessage("Start date cannot be after due date.");
      return;
    }

    if (!formData.assignedTo) {
      setErrorMessage("Please choose who this task is assigned to.");
      return;
    }

    const subtasks = formData.subtasks
      .map((subtask) => ({
        title: subtask.title.trim(),
        completed: Boolean(subtask.completed),
      }))
      .filter((subtask) => subtask.title);

    if (subtasks.length === 0) {
      setErrorMessage("At least one subtask is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: statusToApi[task?.status] || task?.status || "in_progress",
        assignedTo: formData.assignedTo,
        subtasks,
      };

      if (isEditing) {
        await taskAPI.update(task.id, payload);
      } else {
        await taskAPI.create(payload);
      }

      onTaskCreated?.();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          `Unable to ${isEditing ? "update" : "create"} task.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeAssignees = normalizeAssignees(assignees);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 text-neutral-950 dark:text-white">
      <section className="max-h-full w-full max-w-[690px] overflow-y-auto bg-[#f1f1f1] shadow-2xl dark:bg-[#070707] dark:ring-1 dark:ring-neutral-800">
        <header className="border-b border-neutral-300 px-8 py-11 dark:border-neutral-800 sm:px-11">
          <h1
            className="text-2xl uppercase leading-none text-neutral-950 dark:text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            {isEditing ? "Edit Task" : "New Task"}
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col px-8 py-10 sm:px-11 sm:py-12"
        >
          {errorMessage && (
            <p className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}

          <div className="space-y-1">
            <FieldLabel>Title</FieldLabel>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Task title..."
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
            />
          </div>

          <div className="mt-6 space-y-1">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={formData.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Task description..."
              rows={6}
              className="min-h-[126px] w-full resize-none rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
            />
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Subtasks</FieldLabel>
              <button
                type="button"
                onClick={addSubtask}
                className="h-8 rounded-lg bg-pink-50 px-3 text-xs font-black text-[#dc4fb2] transition hover:bg-pink-100"
              >
                Add Subtask
              </button>
            </div>
            <div className="space-y-2">
              {formData.subtasks.map((subtask, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_36px] sm:items-center">
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(event) => updateSubtask(index, "title", event.target.value)}
                    placeholder={`Subtask ${index + 1}`}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-pink-600 transition hover:bg-pink-50"
                    aria-label={`Remove subtask ${index + 1}`}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <path d="M5 10h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Start Date</FieldLabel>
              <input
                type="date"
                disabled={isEditing}
                min={todayInputDate()}
                value={formData.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-500 dark:focus:ring-pink-950"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Due Date</FieldLabel>
              <input
                type="date"
                min={formData.startDate || todayInputDate()}
                value={formData.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-300 dark:focus:ring-pink-950"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Priority</FieldLabel>
              <select
                value={formData.priority}
                onChange={(event) => updateField("priority", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:focus:ring-pink-950"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            <FieldLabel>Assign Task to:</FieldLabel>
            <select
              value={formData.assignedTo}
              onChange={(event) => updateField("assignedTo", event.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:focus:ring-pink-950"
            >
              {safeAssignees.length === 0 && (
                <option value={getEntityId(user)}>Myself</option>
              )}
              {safeAssignees.map((assignee) => (
                <option key={getEntityId(assignee)} value={getEntityId(assignee)}>
                  {formatAssigneeName(assignee)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 rounded-lg border border-[#9a55ff] bg-transparent text-xs font-semibold text-neutral-700 transition hover:bg-purple-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-[#dc4fb2] text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Task"
                  : "Create Task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Addtask;
