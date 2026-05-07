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

const formatInputDate = (date) => date.toISOString().slice(0, 10);

const toInputDate = (date) => {
  if (!date) return formatInputDate(new Date());
  if (date.includes("-")) return date.slice(0, 10);
  const [month, day, year] = date.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const formatAssigneeName = (assignee) => {
  if (!assignee) return "Myself";

  const name = [assignee.firstName, assignee.lastName].filter(Boolean).join(" ");
  const label = name || assignee.email || "Unnamed user";

  return assignee.isSelf ? `${label} (Myself)` : label;
};

const normalizeAssignees = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.assignees)) return data.assignees;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const FieldLabel = ({ children }) => (
  <label className="text-sm font-medium text-neutral-800">{children}</label>
);

const Addtask = ({ onNavigate, onTaskCreated, task }) => {
  const { user } = useAuth();
  const isEditing = Boolean(task?.id);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: formatInputDate(new Date()),
    priority: "medium",
    assignedTo: getEntityId(user),
  });
  const [assignees, setAssignees] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAssignees = async () => {
      try {
        const data = await authAPI.getAssignees();
        const nextAssignees = normalizeAssignees(data);

        if (isMounted) {
          setAssignees(nextAssignees);

          setFormData((currentData) => ({
            ...currentData,
            assignedTo:
              currentData.assignedTo ||
              getEntityId(task?.assignedTo) ||
              getEntityId(nextAssignees[0]) ||
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
      dueDate: toInputDate(task.dueDate),
      priority: task.priority || "medium",
      assignedTo: getEntityId(task.assignedTo) || getEntityId(user),
    });
  }, [task, user]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
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

    if (!formData.assignedTo) {
      setErrorMessage("Please choose who this task is assigned to.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: statusToApi[task?.status] || task?.status || "in_progress",
        assignedTo: formData.assignedTo,
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

  const assigneeOptions = normalizeAssignees(assignees);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 text-neutral-950">
      <section className="max-h-full w-full max-w-[690px] overflow-y-auto bg-[#f1f1f1] shadow-2xl">
        <header className="border-b border-neutral-300 px-8 py-11 sm:px-11">
          <h1
            className="text-2xl uppercase leading-none text-neutral-950 sm:text-3xl"
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
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div className="mt-6 space-y-1">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={formData.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Task description..."
              rows={6}
              className="min-h-[126px] w-full resize-none rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Due Date</FieldLabel>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Priority</FieldLabel>
              <select
                value={formData.priority}
                onChange={(event) => updateField("priority", event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
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
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
            >
              {assigneeOptions.length === 0 && (
                <option value={getEntityId(user)}>Myself</option>
              )}
              {assigneeOptions.map((assignee) => (
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
              className="h-10 rounded-lg border border-[#9a55ff] bg-transparent text-xs font-semibold text-neutral-700 transition hover:bg-purple-50"
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
