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
    ],
  },
  {
    title: "AI Video",
    subtasks: [
      "Prepare concept and storyboard",
      "Write scene prompts",
      "Generate video clips",
      "Edit clips, audio, and captions",
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
      "Prepare final design handoff",
    ],
  },
];

const submitOutputTaskTitle = "Submit Output";
const createBlankSubtask = () => ({
  title: "",
  completed: false,
  assignedTo: "",
});
const createSubmitOutputSubtask = () => ({
  title: submitOutputTaskTitle,
  completed: false,
  assignedTo: "",
});
const isSubmitOutputSubtask = (subtask) =>
  String(subtask?.title || "").trim().toLowerCase() ===
  submitOutputTaskTitle.toLowerCase();
const isClientReviewSubtask = (subtask) =>
  /client\s+(?:review.*revision|revision)|review.*revision/i.test(
    String(subtask?.title || "")
  );

const ensureSubmitOutputSubtask = (subtasks = []) => {
  const submitOutputSubtask = subtasks.find(isSubmitOutputSubtask);
  return [
    ...subtasks.filter(
      (subtask) =>
        !isSubmitOutputSubtask(subtask) && !isClientReviewSubtask(subtask)
    ),
    submitOutputSubtask || createSubmitOutputSubtask(),
  ];
};

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
  if (!Array.isArray(subtasks)) return [];

  const normalizedSubtasks = subtasks.map((subtask) => ({
    title: subtask?.title || "",
    completed: Boolean(subtask?.completed),
    assignedTo: getEntityId(subtask?.assignedTo),
  }));

  return normalizedSubtasks;
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

const formatLeaveEndDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

const createInitialForm = (task, user, isAdmin) => {
  if (task) {
    return {
      title: task.title || "",
      description: task.description || "",
      startDate: toInputDate(task.startDate || task.createdAt || task.dueDate),
      dueDate: toInputDate(task.dueDate),
      amount: task.amount ?? task.budget ?? "",
      downPaymentType: task.downPayment?.mode || "none",
      downPaymentValue: task.downPayment?.value ?? "",
      priority: task.priority || "medium",
      requestedBy:
        getEntityId(task.requestedBy) ||
        (task.createdBy?.role === "client" ? getEntityId(task.createdBy) : ""),
      assignees: (task.assignees?.length ? task.assignees : [task.assignedTo])
        .map(getEntityId)
        .filter(Boolean),
      subtasks: ensureSubmitOutputSubtask(normalizeSubtasks(task.subtasks)),
    };
  }

  return {
    title: "",
    description: "",
    startDate: todayInputDate(),
    dueDate: todayInputDate(),
    amount: "",
    downPaymentType: "none",
    downPaymentValue: "",
    priority: "medium",
    requestedBy: isAdmin ? "" : getEntityId(user),
    assignees: isAdmin ? [] : [getEntityId(user)].filter(Boolean),
    subtasks: [createSubmitOutputSubtask()],
  };
};

const Addtask = ({ onNavigate, onTaskCreated, task }) => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const isEditing = Boolean(task?.id);
  const [formData, setFormData] = useState(() => createInitialForm(task, user, isAdmin));
  const [assignees, setAssignees] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientRequestType, setClientRequestType] = useState(
    task?.requestedByName && !getEntityId(task?.requestedBy) ? "custom" : "existing"
  );
  const [customClientName, setCustomClientName] = useState(
    task?.requestedByName && !getEntityId(task?.requestedBy) ? task.requestedByName : ""
  );
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
          ? loadedAssignees.filter(
              (assignee) =>
                assignee?.role === "employee" ||
                (assignee?.role === "admin" && assignee?.isSelf)
            )
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

          const requestedClient = loadedClients.find(
            (client) => getEntityId(client) === getEntityId(task?.requestedBy)
          );
          if (requestedClient) setClientSearch(formatClientName(requestedClient));

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
    setFormData((currentData) => {
      const submitOutputIndex = currentData.subtasks.findIndex(isSubmitOutputSubtask);
      const subtasks = [...currentData.subtasks];

      if (submitOutputIndex >= 0) {
        subtasks.splice(submitOutputIndex, 0, createBlankSubtask());
      } else {
        subtasks.push(createBlankSubtask());
      }

      return { ...currentData, subtasks };
    });
  };

  const removeSubtask = (index) => {
    setFormData((currentData) => {
      if (isSubmitOutputSubtask(currentData.subtasks[index])) return currentData;

      const subtasks = currentData.subtasks.filter(
        (_, currentIndex) => currentIndex !== index
      );

      return { ...currentData, subtasks };
    });
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
        subtasks: [createSubmitOutputSubtask()],
      }));
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      title: template.title,
      subtasks: ensureSubmitOutputSubtask(
        template.subtasks.map((title) => ({ title, completed: false, assignedTo: "" }))
      ),
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
      setErrorMessage("Project title is required.");
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
      setErrorMessage("Please choose at least one employee for this project.");
      return;
    }

    const unavailableAssignee = safeAssignees.find((assignee) => {
      const assigneeId = getEntityId(assignee);
      return (
        formData.assignees.includes(assigneeId) &&
        assignee?.isOnLeave &&
        !originalAssigneeIds.has(assigneeId)
      );
    });
    if (unavailableAssignee) {
      setErrorMessage(`${formatAssigneeName(unavailableAssignee)} is currently on approved leave and cannot be assigned to this project.`);
      return;
    }

    if (formData.amount === "" || Number(formData.amount) < 0) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    if (isAdmin && !isEditing && formData.downPaymentType !== "none") {
      const projectAmount = Number(formData.amount);
      const downPaymentValue = Number(formData.downPaymentValue);
      const downPaymentAmount = formData.downPaymentType === "percentage"
        ? projectAmount * (downPaymentValue / 100)
        : downPaymentValue;

      if (!Number.isFinite(downPaymentValue) || downPaymentValue <= 0) {
        setErrorMessage("Down payment must be greater than 0.");
        return;
      }
      if (formData.downPaymentType === "percentage" && downPaymentValue > 100) {
        setErrorMessage("Down payment percentage cannot be greater than 100%.");
        return;
      }
      if (downPaymentAmount > projectAmount) {
        setErrorMessage("Down payment cannot be greater than the project amount.");
        return;
      }
    }

    if (isAdmin && clientRequestType === "existing" && !formData.requestedBy) {
      setErrorMessage("Please choose which client requested this project.");
      return;
    }

    if (isAdmin && clientRequestType === "custom" && !customClientName.trim()) {
      setErrorMessage("Please enter the custom client's name.");
      return;
    }

    const selectedClient = safeClients.find(
      (client) => getEntityId(client) === formData.requestedBy
    );
    if (
      isAdmin &&
      clientRequestType === "existing" &&
      (!selectedClient || formatClientName(selectedClient) !== clientSearch.trim())
    ) {
      setErrorMessage("Please select a client from the search results.");
      return;
    }

    const normalizedFormSubtasks = formData.subtasks
      .map((subtask) => ({
        title: subtask.title.trim(),
        completed: Boolean(subtask.completed),
        assignedTo: subtask.assignedTo || undefined,
      }))
      .filter((subtask) => subtask.title);
    const subtasks = ensureSubmitOutputSubtask(normalizedFormSubtasks);

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        amount: Number(formData.amount),
        ...(!isEditing && isAdmin
          ? {
              downPaymentType:
                formData.downPaymentType === "none" ? undefined : formData.downPaymentType,
              downPaymentValue:
                formData.downPaymentType === "none"
                  ? undefined
                  : Number(formData.downPaymentValue),
            }
          : {}),
        priority: formData.priority,
        status: statusToApi[task?.status] || task?.status || "in_progress",
        assignedTo: formData.assignees[0],
        assignees: formData.assignees,
        requestedBy:
          !isAdmin ||
          (clientRequestType === "existing" && isRegisteredClientUser(selectedClient))
            ? formData.requestedBy
            : undefined,
        requestedByName: isAdmin
          ? clientRequestType === "custom"
            ? customClientName.trim()
            : formatClientName(selectedClient)
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
          `Unable to ${isEditing ? "update" : "create"} project.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeAssignees = normalizeAssignees(assignees);
  const originalAssigneeIds = new Set(
    (task?.assignees?.length ? task.assignees : [task?.assignedTo])
      .map(getEntityId)
      .filter(Boolean)
  );
  const isUnavailableForNewAssignment = (assignee) =>
    Boolean(assignee?.isOnLeave) && !originalAssigneeIds.has(getEntityId(assignee));
  const safeClients = normalizeClients(clients);
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
  const projectAmount = Math.max(0, Number(formData.amount) || 0);
  const downPaymentValue = Math.max(0, Number(formData.downPaymentValue) || 0);
  const calculatedDownPayment = Math.min(
    projectAmount,
    Math.round(
      (formData.downPaymentType === "percentage"
        ? projectAmount * (downPaymentValue / 100)
        : formData.downPaymentType === "fixed"
          ? downPaymentValue
          : 0) * 100
    ) / 100
  );
  const remainingBalance = Math.max(0, projectAmount - calculatedDownPayment);
  const formatMoney = (value) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-3 text-neutral-950 sm:p-6 dark:text-white">
      <section className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[690px] overflow-y-auto bg-[#f1f1f1] shadow-2xl sm:max-h-[calc(100dvh-3rem)] dark:bg-[#070707] dark:ring-1 dark:ring-neutral-800">
        <header className="border-b border-neutral-300 px-5 py-7 dark:border-neutral-800 sm:px-11 sm:py-11">
          <h1
            className="text-2xl uppercase leading-none text-neutral-950 dark:text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            {isEditing ? "Edit Project" : "New Project"}
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col px-5 py-7 sm:px-11 sm:py-12"
        >
          {errorMessage && (
            <p className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}

          <div className="space-y-1">
            <FieldLabel>Project Title</FieldLabel>
            <select
              value={selectedTemplateTitle}
              onChange={(event) => handleTaskTemplateSelect(event.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-200 dark:focus:ring-pink-950"
            >
              <option value="custom">Custom Project</option>
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
                placeholder="Enter custom project title..."
                className="mt-2 h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
              />
            )}
          </div>

          <div className="mt-6 space-y-1">
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={formData.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Project description..."
              rows={6}
              className="min-h-[126px] w-full resize-none rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
            />
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0">
                <FieldLabel>Tasks</FieldLabel>
                <span className="ml-2 text-[10px] font-bold text-neutral-400">
                  Optional — assignees complete added tasks in order
                </span>
              </span>
              <button
                type="button"
                onClick={addSubtask}
                className="h-8 rounded-lg bg-pink-50 px-3 text-xs font-black text-[#dc4fb2] transition hover:bg-pink-100"
              >
                Add Task
              </button>
            </div>
            <div className="space-y-2">
              {formData.subtasks.map((subtask, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_36px] sm:items-center">
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(event) => updateSubtask(index, "title", event.target.value)}
                    disabled={isSubmitOutputSubtask(subtask)}
                    placeholder={`Task ${index + 1}`}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 disabled:cursor-not-allowed disabled:bg-pink-50 disabled:font-black disabled:text-[#c72fb2] dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600 dark:disabled:bg-pink-950/20 dark:disabled:text-pink-400 dark:focus:ring-pink-950"
                  />
                  <select
                    value={subtask.assignedTo || ""}
                    onChange={(event) => updateSubtask(index, "assignedTo", event.target.value)}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-xs font-medium text-neutral-600 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300"
                    aria-label={`Assign task ${index + 1}`}
                  >
                    <option value="">Any project assignee</option>
                    {safeAssignees.map((assignee) => (
                        <option
                          key={getEntityId(assignee)}
                          value={getEntityId(assignee)}
                          disabled={isUnavailableForNewAssignment(assignee)}
                        >
                          {formatAssigneeName(assignee)}{assignee?.isOnLeave ? " — On approved leave" : ""}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    disabled={isSubmitOutputSubtask(subtask)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-pink-600 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-25"
                    aria-label={`Remove task ${index + 1}`}
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
          </div>

          {isAdmin && !isEditing && (
            <section className="mt-5 rounded-xl border border-pink-100 bg-pink-50/40 p-4 dark:border-pink-900/30 dark:bg-pink-950/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <FieldLabel>Down Payment</FieldLabel>
                  <p className="mt-1 text-[10px] font-medium text-neutral-400">
                    Optional payment received when creating this project.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#c72fb2] dark:bg-neutral-950">
                  Budget Income
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-300">Payment type</span>
                  <select
                    value={formData.downPaymentType}
                    onChange={(event) => {
                      updateField("downPaymentType", event.target.value);
                      if (event.target.value === "none") updateField("downPaymentValue", "");
                    }}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-600 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:focus:ring-pink-950"
                  >
                    <option value="none">No down payment</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₱)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-300">
                    {formData.downPaymentType === "percentage" ? "Percentage" : "Amount"}
                  </span>
                  <span className="relative block">
                    {formData.downPaymentType === "fixed" && (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">₱</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      max={formData.downPaymentType === "percentage" ? "100" : formData.amount || undefined}
                      step="0.01"
                      disabled={formData.downPaymentType === "none"}
                      value={formData.downPaymentValue}
                      onChange={(event) => updateField("downPaymentValue", event.target.value)}
                      placeholder={formData.downPaymentType === "percentage" ? "e.g. 30" : "e.g. 5000"}
                      className={`h-9 w-full rounded-lg border border-neutral-300 bg-white pr-8 text-xs font-medium text-neutral-600 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:disabled:bg-neutral-900 ${formData.downPaymentType === "fixed" ? "pl-7" : "pl-3"}`}
                    />
                    {formData.downPaymentType === "percentage" && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">%</span>
                    )}
                  </span>
                </label>
              </div>

              <div className="mt-4 grid gap-2 rounded-lg border border-pink-100 bg-white p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950 sm:grid-cols-3">
                <span>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-neutral-400">Project Amount</span>
                  <span className="mt-1 block font-black text-neutral-700 dark:text-white">{formatMoney(projectAmount)}</span>
                </span>
                <span>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-neutral-400">Down Payment</span>
                  <span className="mt-1 block font-black text-emerald-600">− {formatMoney(calculatedDownPayment)}</span>
                </span>
                <span>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-neutral-400">Remaining Balance</span>
                  <span className="mt-1 block font-black text-[#c72fb2]">{formatMoney(remainingBalance)}</span>
                </span>
              </div>
            </section>
          )}

          {isAdmin && (
            <div className="mt-5 space-y-2">
              <FieldLabel>Client / Requested by:</FieldLabel>
              <div className="grid grid-cols-2 rounded-lg border border-neutral-300 bg-white/40 p-1 dark:border-neutral-700 dark:bg-neutral-950">
                <button
                  type="button"
                  onClick={() => {
                    setClientRequestType("existing");
                    setClientSearch(formatClientName(currentClient));
                  }}
                  className={`h-8 rounded-md text-xs font-bold transition ${
                    clientRequestType === "existing"
                      ? "bg-[#dc4fb2] text-white shadow-sm"
                      : "text-neutral-500 hover:bg-pink-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
                  }`}
                >
                  Existing Client
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientRequestType("custom");
                    updateField("requestedBy", "");
                    setIsClientPickerOpen(false);
                  }}
                  className={`h-8 rounded-md text-xs font-bold transition ${
                    clientRequestType === "custom"
                      ? "bg-[#dc4fb2] text-white shadow-sm"
                      : "text-neutral-500 hover:bg-pink-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
                  }`}
                >
                  Custom Client
                </button>
              </div>

              {clientRequestType === "custom" ? (
                <div>
                  <input
                    type="text"
                    value={customClientName}
                    onChange={(event) => setCustomClientName(event.target.value)}
                    placeholder="Enter client or company name..."
                    maxLength={160}
                    className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#070707] dark:text-neutral-300 dark:placeholder:text-neutral-600 dark:focus:ring-pink-950"
                  />
                  <p className="mt-1.5 text-[10px] font-medium text-neutral-400">
                    Use this when the client does not want or need a Clientra account.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="search"
                    value={clientSearch}
                    onChange={(event) => handleClientSearchChange(event.target.value)}
                    onFocus={() => setIsClientPickerOpen(true)}
                    onBlur={() => window.setTimeout(() => {
                      setIsClientPickerOpen(false);
                      setClientSearch(formatClientName(currentClient));
                    }, 120)}
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
                          No clients found. Choose Custom Client to enter a name directly.
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
              )}
            </div>
          )}

          <div className="mt-5 space-y-1">
            <FieldLabel>Assign Project to:</FieldLabel>
            <p className="text-[11px] font-medium text-neutral-400">
              Select everyone who will collaborate, then assign individual tasks above.
            </p>
            <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-neutral-300 bg-white/40 p-3 dark:border-neutral-700 dark:bg-neutral-950 sm:grid-cols-2">
              {safeAssignees.map((assignee) => {
                const assigneeId = getEntityId(assignee);
                const isSelected = formData.assignees.includes(assigneeId);
                const isUnavailable = isUnavailableForNewAssignment(assignee);
                const leaveEndDate = formatLeaveEndDate(assignee?.leaveEndDate);
                return (
                  <label key={assigneeId} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${isUnavailable ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700 opacity-80 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300" : isSelected ? "cursor-pointer border-pink-300 bg-pink-50 text-[#c72fb2] dark:bg-pink-950/30" : "cursor-pointer border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"}`}>
                    <input type="checkbox" checked={isSelected} disabled={isUnavailable} onChange={() => toggleAssignee(assigneeId)} className="h-4 w-4 accent-[#dc4fb2]" />
                    <span className="min-w-0">
                      <span className="block truncate">{formatAssigneeName(assignee)}</span>
                      {assignee?.isOnLeave && (
                        <span className="mt-0.5 block text-[10px] font-semibold">
                          On approved leave{leaveEndDate ? ` until ${leaveEndDate}` : ""}{!isUnavailable ? " • Existing assignment" : ""}
                        </span>
                      )}
                    </span>
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
                  ? "Update Project"
                  : "Create Project"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Addtask;
