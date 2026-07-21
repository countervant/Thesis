import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { authAPI, clientAPI, taskAPI } from "../../../services/api.js";

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const taskTemplates = [
  {
    title: "AI Image",
    subtasks: [
      "Gather client brief and references",
      "Create prompt concepts",
      "Generate initial image drafts",
      "Select and enhance best output",
      "Client review and revisions",
      "Export final image",
    ],
  },
  {
    title: "AI Video",
    subtasks: [
      "Prepare concept and storyboard",
      "Write scene prompts",
      "Generate video clips",
      "Edit clips, audio, and captions",
      "Client review and revisions",
      "Export final video",
    ],
  },
  {
    title: "UGC Video",
    subtasks: [
      "Gather product details",
      "Write UGC script and shot list",
      "Record raw clips",
      "Edit video and add captions",
      "Client review and revisions",
      "Export final video",
    ],
  },
  {
    title: "Video Editing",
    subtasks: [
      "Receive and organize footage",
      "Cut and arrange clips",
      "Add transitions and effects",
      "Improve audio and color",
      "Client review and revisions",
      "Final render and export",
    ],
  },
  {
    title: "Graphic Static Ads",
    subtasks: [
      "Gather ad requirements",
      "Create design concept",
      "Design first draft",
      "Apply branding and ad copy",
      "Client review and revisions",
      "Export final ad assets",
    ],
  },
  {
    title: "Scriptwriting",
    subtasks: [
      "Gather topic and objective",
      "Create script outline",
      "Write the first draft",
      "Review tone and clarity",
      "Apply client revisions",
      "Finalize script",
    ],
  },
  {
    title: "UI/UX Design",
    subtasks: [
      "Gather requirements",
      "Create user flow and wireframe",
      "Design high-fidelity screens",
      "Build prototype",
      "Client review and revisions",
      "Prepare final design handoff",
    ],
  },
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
    assignedTo: getEntityId(subtask?.assignedTo),
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

const normalizeClients = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatClientName = (client) => {
  if (!client) return "";

  const personName =
    client.contactPerson ||
    [client.firstName, client.lastName].filter(Boolean).join(" ");
  const companyName = client.companyName || "";

  if (companyName && personName) return `${companyName} - ${personName}`;
  return companyName || personName || client.email || "Unnamed client";
};

const isRegisteredClientUser = (client) => client?.source === "user" || client?.role === "client";

const FieldLabel = ({ children }) => (
  <label className="text-sm font-medium text-neutral-800 dark:text-neutral-300">{children}</label>
);

const Addtask = ({ onNavigate, onTaskCreated, task }) => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const isEditing = Boolean(task?.id);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: todayInputDate(),
    dueDate: todayInputDate(),
    amount: "",
    paid: "0",
    priority: "medium",
    requestedBy: isAdmin ? "" : getEntityId(user),
    assignees: isAdmin ? [] : [getEntityId(user)].filter(Boolean),
    subtasks: [{ title: "", completed: false, assignedTo: "" }],
  });
  const [assignees, setAssignees] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAssignees = async () => {
      try {
        const data = await authAPI.getAssignees();
        const loadedAssignees = normalizeAssignees(data);
        const availableAssignees = isAdmin
          ? loadedAssignees.filter((assignee) => assignee?.role === "employee")
          : loadedAssignees;

        if (isMounted) {
          setAssignees(availableAssignees);

          setFormData((currentData) => {
            const existingAssigneeIds = (task?.assignees?.length
              ? task.assignees
              : [task?.assignedTo]
            ).map(getEntityId).filter(Boolean);

            return {
              ...currentData,
              assignees:
                currentData.assignees.length > 0
                  ? currentData.assignees
                  : existingAssigneeIds.length > 0
                    ? existingAssigneeIds
                    : [getEntityId(availableAssignees[0])].filter(Boolean),
            };
          });
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
  }, [isAdmin, task?.assignedTo, task?.assignees, user]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isMounted = true;

    const loadClients = async () => {
      try {
        const data = await clientAPI.getAll({ limit: 100 });
        const loadedClients = normalizeClients(data);

        if (isMounted) {
          setClients(loadedClients);

          setFormData((currentData) => ({
            ...currentData,
            requestedBy:
              currentData.requestedBy ||
              getEntityId(task?.requestedBy) ||
              "",
          }));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || "Unable to load clients."
          );
        }
      }
    };

    loadClients();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, task?.requestedBy]);

  useEffect(() => {
    if (!task) {
      return;
    }

    setFormData({
      title: task.title || "",
      description: task.description || "",
      startDate: toInputDate(task.startDate || task.createdAt || task.dueDate),
      dueDate: toInputDate(task.dueDate),
      amount: task.amount ?? task.budget ?? "",
      paid: task.paid ?? "0",
      priority: task.priority || "medium",
      requestedBy:
        getEntityId(task.requestedBy) ||
        (task.requestedByName
          ? "existing-client"
          : task.createdBy?.role === "client"
            ? getEntityId(task.createdBy)
            : ""),
      assignees: (task.assignees?.length ? task.assignees : [task.assignedTo])
        .map(getEntityId)
        .filter(Boolean),
      subtasks: normalizeSubtasks(task.subtasks),
    });
  }, [task, user]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const toggleAssignee = (assigneeId) => {
    setFormData((currentData) => {
      const isSelected = currentData.assignees.includes(assigneeId);
      const assignees = isSelected
        ? currentData.assignees.filter((id) => id !== assigneeId)
        : [...currentData.assignees, assigneeId];

      return {
        ...currentData,
        assignees,
        subtasks: currentData.subtasks.map((subtask) =>
          subtask.assignedTo && !assignees.includes(subtask.assignedTo)
            ? { ...subtask, assignedTo: "" }
            : subtask
        ),
      };
    });
  };

  const updateSubtask = (index, field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      assignees:
        field === "assignedTo" && value && !currentData.assignees.includes(value)
          ? [...currentData.assignees, value]
          : currentData.assignees,
      subtasks: currentData.subtasks.map((subtask, currentIndex) =>
        currentIndex === index ? { ...subtask, [field]: value } : subtask
      ),
    }));
  };

  const addSubtask = () => {
    setFormData((currentData) => ({
      ...currentData,
      subtasks: [...currentData.subtasks, { title: "", completed: false, assignedTo: "" }],
    }));
  };

  const removeSubtask = (index) => {
    setFormData((currentData) => ({
      ...currentData,
      subtasks:
        currentData.subtasks.length > 1
          ? currentData.subtasks.filter((_, currentIndex) => currentIndex !== index)
          : [{ title: "", completed: false, assignedTo: "" }],
    }));
  };

  const handleCancel = () => {
    onNavigate?.("tasks");
  };

  const handleTaskTemplateSelect = (templateTitle) => {
    const template = taskTemplates.find((item) => item.title === templateTitle);
    if (!template) {
      setFormData((currentData) => ({
        ...currentData,
        title: "",
        subtasks: [{ title: "", completed: false, assignedTo: "" }],
      }));
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      title: template.title,
      subtasks: template.subtasks.map((title) => ({ title, completed: false, assignedTo: "" })),
    }));
  };

  const handleClientSearchChange = (value) => {
    setClientSearch(value);
    setIsClientPickerOpen(true);

    if (!value.trim()) {
      updateField("requestedBy", "");
    }
  };

  const handleClientSelect = (client) => {
    updateField("requestedBy", getEntityId(client));
    setClientSearch(formatClientName(client));
    setIsClientPickerOpen(false);
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

    if (formData.assignees.length === 0) {
      setErrorMessage("Please choose at least one employee for this task.");
      return;
    }

    if (formData.amount === "" || Number(formData.amount) < 0) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    if (formData.paid === "" || Number(formData.paid) < 0) {
      setErrorMessage("Please enter a valid paid amount.");
      return;
    }

    if (Number(formData.paid) > Number(formData.amount)) {
      setErrorMessage("Paid amount cannot be greater than the total amount.");
      return;
    }

    if (isAdmin && !formData.requestedBy) {
      setErrorMessage("Please choose which client requested this task.");
      return;
    }

    const selectedClient = safeClients.find(
      (client) => getEntityId(client) === formData.requestedBy
    );
    if (isAdmin && (!selectedClient || formatClientName(selectedClient) !== clientSearch.trim())) {
      setErrorMessage("Please select a client from the search results.");
      return;
    }

    const subtasks = formData.subtasks
      .map((subtask) => ({
        title: subtask.title.trim(),
        completed: Boolean(subtask.completed),
        assignedTo: subtask.assignedTo || undefined,
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
        amount: Number(formData.amount),
        paid: Number(formData.paid),
        priority: formData.priority,
        status: statusToApi[task?.status] || task?.status || "in_progress",
        assignedTo: formData.assignees[0],
        assignees: formData.assignees,
        requestedBy:
          !isAdmin || isRegisteredClientUser(selectedClient)
            ? formData.requestedBy
            : undefined,
        requestedByName: isAdmin
          ? formatClientName(selectedClient)
          : [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "",
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
  const existingClientOption =
    task?.requestedByName && !getEntityId(task?.requestedBy)
      ? [{ _id: "existing-client", source: "client", contactPerson: task.requestedByName }]
      : [];
  const safeClients = [
    ...existingClientOption,
    ...normalizeClients(clients).filter((client) => getEntityId(client) !== "existing-client"),
  ];
  const currentClient = safeClients.find(
    (client) => getEntityId(client) === formData.requestedBy
  );
  const normalizedClientSearch = clientSearch.trim().toLowerCase();
  const selectedTemplateTitle = taskTemplates.some((template) => template.title === formData.title)
    ? formData.title
    : "custom";
  const filteredClients = normalizedClientSearch
    ? safeClients.filter((client) => {
        const label = formatClientName(client).toLowerCase();
        const email = String(client?.email || "").toLowerCase();
        return label.includes(normalizedClientSearch) || email.includes(normalizedClientSearch);
      })
    : safeClients;

  useEffect(() => {
    if (!isClientPickerOpen) {
      setClientSearch(formatClientName(currentClient));
    }
  }, [clients, currentClient, isClientPickerOpen, task?.requestedByName]);

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
            <FieldLabel>Task Title</FieldLabel>
            <select
              value={selectedTemplateTitle}
              onChange={(event) => handleTaskTemplateSelect(event.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-200 dark:focus:ring-pink-950"
            >
              <option value="custom">Custom Task</option>
              {taskTemplates.map((template) => (
                <option key={template.title} value={template.title}>
                  {template.title}
                </option>
              ))}
            </select>
            {selectedTemplateTitle === "custom" && (
              <input
                type="text"
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Enter custom task title..."
                className="mt-2 h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
              />
            )}
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
              <span>
                <FieldLabel>Subtasks</FieldLabel>
                <span className="ml-2 text-[10px] font-bold text-neutral-400">
                  Employees complete these in order
                </span>
              </span>
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
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_36px] sm:items-center">
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(event) => updateSubtask(index, "title", event.target.value)}
                    placeholder={`Subtask ${index + 1}`}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
                  />
                  <select
                    value={subtask.assignedTo || ""}
                    onChange={(event) => updateSubtask(index, "assignedTo", event.target.value)}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-xs font-medium text-neutral-600 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300"
                    aria-label={`Assign subtask ${index + 1}`}
                  >
                    <option value="">Any assigned employee</option>
                    {safeAssignees.map((assignee) => (
                        <option key={getEntityId(assignee)} value={getEntityId(assignee)}>
                          {formatAssigneeName(assignee)}
                        </option>
                      ))}
                  </select>
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

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="space-y-1">
              <FieldLabel>Amount (₱)</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="Enter total amount"
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>Paid (₱)</FieldLabel>
              <input
                type="number"
                min="0"
                max={formData.amount || undefined}
                step="0.01"
                required
                value={formData.paid}
                onChange={(event) => updateField("paid", event.target.value)}
                placeholder="Enter amount paid"
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="mt-5 space-y-1">
              <FieldLabel>Client / Requested by:</FieldLabel>
              <div className="relative">
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(event) => handleClientSearchChange(event.target.value)}
                  onFocus={() => setIsClientPickerOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsClientPickerOpen(false), 120)}
                  placeholder="Search client..."
                  className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 pr-9 text-xs font-medium text-neutral-500 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
                />
                <svg
                  viewBox="0 0 20 20"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d94ab4]"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>

                {isClientPickerOpen && (
                  <div className="absolute left-0 right-0 top-10 z-20 max-h-48 overflow-y-auto rounded-lg border border-pink-100 bg-white py-1 shadow-xl dark:border-neutral-800 dark:bg-[#111111]">
                    {filteredClients.length === 0 ? (
                      <p className="px-4 py-3 text-xs font-semibold text-neutral-500">
                        No clients found.
                      </p>
                    ) : (
                      filteredClients.map((client) => {
                        const clientId = getEntityId(client);
                        const isSelected = clientId === formData.requestedBy;

                        return (
                          <button
                            key={clientId}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleClientSelect(client)}
                            className={`flex w-full flex-col px-4 py-2 text-left transition hover:bg-pink-50 dark:hover:bg-neutral-900 ${
                              isSelected ? "bg-pink-50 text-[#d94ab4] dark:bg-neutral-900" : "text-neutral-700 dark:text-neutral-300"
                            }`}
                          >
                            <span className="truncate text-xs font-bold">
                              {formatClientName(client)}
                            </span>
                            {client.email && (
                              <span className="mt-0.5 truncate text-[11px] font-medium text-neutral-400">
                                {client.email}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 space-y-1">
            <FieldLabel>Assign Task to:</FieldLabel>
            <p className="text-[11px] font-medium text-neutral-400">
              Select everyone who will collaborate, then assign individual subtasks above.
            </p>
            <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-neutral-300 bg-white/40 p-3 dark:border-neutral-700 dark:bg-neutral-950 sm:grid-cols-2">
              {safeAssignees.map((assignee) => {
                const assigneeId = getEntityId(assignee);
                const isSelected = formData.assignees.includes(assigneeId);
                return (
                  <label key={assigneeId} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${isSelected ? "border-pink-300 bg-pink-50 text-[#c72fb2] dark:bg-pink-950/30" : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleAssignee(assigneeId)} className="h-4 w-4 accent-[#dc4fb2]" />
                    <span className="truncate">{formatAssigneeName(assignee)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 rounded-lg border border-[#d94ab4] bg-transparent text-xs font-semibold text-neutral-700 transition hover:bg-pink-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
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
