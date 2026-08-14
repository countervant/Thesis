import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clientAPI, getApiErrorMessage, taskAPI } from "../../../services/api.js";
import ConfirmDialog from "../../../components/ConfirmDialog/ConfirmDialog";
import InitialsAvatar from "../../../components/InitialsAvatar/InitialsAvatar";
import { getCountryFlag } from "../../../utils/countries.js";
import { PersonGridSkeleton } from "../../../components/Skeleton/Skeleton";

const filters = [
  { label: "All accounts", value: "All" },
  { label: "Enabled", value: "Active" },
  { label: "Disabled", value: "Inactive" },
];

const statusLabels = {
  pending: "Pending",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

const statusStyles = {
  Pending: "bg-orange-50 text-orange-600",
  "In progress": "bg-pink-50 text-[#c72fb2]",
  "In review": "bg-blue-50 text-blue-600",
  Done: "bg-emerald-50 text-emerald-600",
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const formatProjectDate = (value) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const normalizeProject = (project) => {
  const subtasks = Array.isArray(project?.subtasks) ? project.subtasks : [];
  const completedTasks = subtasks.filter((subtask) => subtask?.completed).length;

  return {
    id: getEntityId(project),
    title: project?.title || "Untitled project",
    description: project?.description || "No project brief provided.",
    status: statusLabels[project?.status] || project?.status || "Pending",
    priority: project?.priority || "medium",
    startDate: project?.startDate || project?.createdAt,
    dueDate: project?.dueDate,
    createdAt: project?.createdAt,
    requestedBy: project?.requestedBy,
    requestedByName: project?.requestedByName || "",
    subtasks,
    completedTasks,
    progress: subtasks.length ? Math.round((completedTasks / subtasks.length) * 100) : 0,
  };
};

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = `${words[0]?.charAt(0) || ""}${words[1]?.charAt(0) || ""}`;
  return initials.toUpperCase() || "CL";
};

const normalizeClient = (client, projects = []) => ({
  id: client._id || client.id,
  initials: getInitials(client.contactPerson),
  name: client.contactPerson || "",
  avatar: client.avatar || "",
  status: client.isActive ? "Active" : "Inactive",
  isActive: client.isActive !== false,
  isOnline: client.isOnline === true,
  hasLoginAccount: client.hasLoginAccount === true || client.source === "user",
  lastSeen: client.lastSeen || "",
  company: client.companyName || "",
  email: client.email || "",
  country: client.country || "",
  phone: client.phone || "",
  service: client.service || "",
  address: client.address || "",
  notes: client.notes || "",
  projects,
});

const projectBelongsToClient = (project, client) => {
  const requestedById = getEntityId(project.requestedBy);
  const clientId = String(client._id || client.id || "");
  const requestedByEmail = normalizeText(project.requestedBy?.email);
  const clientEmail = normalizeText(client.email);
  const requestedByName = normalizeText(project.requestedByName);
  const clientName = normalizeText(client.contactPerson);
  const companyName = normalizeText(client.companyName);
  const clientLabels = new Set([
    clientName,
    companyName,
    clientEmail,
    normalizeText([client.companyName, client.contactPerson].filter(Boolean).join(" - ")),
  ].filter(Boolean));

  return Boolean(
    (requestedById && clientId && requestedById === clientId) ||
    (requestedByEmail && clientEmail && requestedByEmail === clientEmail) ||
    (requestedByName && clientLabels.has(requestedByName))
  );
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "dashboard") {
    return (
      <svg {...props}>
        <path
          d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "tasks") {
    return (
      <svg {...props}>
        <path
          d="M8 4h8l1 3H7l1-3zM6 7h12v13H6zM9 12l1.5 1.5L14 10M9 17h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "budget") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 3v9l7 4M5.8 18.5 12 12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "client" || name === "employee") {
    return (
      <svg {...props}>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.5 19c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M12.5 18.5c.6-2.4 2.1-3.7 4.4-3.7 2.4 0 3.9 1.3 4.4 3.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...props}>
        <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m15.5 15.5 4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...props}>
        <path
          d="M6 18h12l-1.5-2v-4.2a4.5 4.5 0 0 0-9 0V16L6 18zM10 20h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="5" r="2.5" fill="currentColor" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...props}>
        <path
          d="M5 21V4h10v17M15 9h4v12M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1M3 21h18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...props}>
        <path
          d="M4 6h16v12H4zM4 7l8 6 8-6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...props}>
        <path
          d="M7 4h3l1.3 4-2 1.2a10.4 10.4 0 0 0 5.5 5.5l1.2-2 4 1.3v3a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 5 6.2 2 2 0 0 1 7 4z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "delete") {
    return (
      <svg {...props}>
        <path
          d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "add") {
    return (
      <svg {...props}>
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...props}>
        <path
          d="M9 5H5v14h4M15 8l4 4-4 4M19 12H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return null;
};

const FilterButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-9 min-w-[108px] rounded-xl border px-4 text-xs font-bold shadow-[0_2px_6px_rgba(190,65,158,0.12)] transition ${
      active
        ? "border-transparent bg-linear-to-r from-[#df4bb4] to-[#c72fb2] text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)]"
        : "border-pink-100 bg-white text-neutral-800 hover:bg-pink-50 hover:text-[#c72fb2] dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-200"
    }`}
  >
    {children}
  </button>
);

const ProjectStatus = ({ status }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${statusStyles[status] || statusStyles.Pending}`}>
    {status}
  </span>
);

const ProjectRequestModal = ({ client, onClose }) => {
  useEffect(() => {
    if (!client) return undefined;

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
  }, [client, onClose]);

  if (!client) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="client-project-requests-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-4xl overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-pink-100 px-5 py-5 dark:border-neutral-800 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c72fb2]">Client Projects</p>
            <h2 id="client-project-requests-title" className="mt-1 truncate text-xl font-black text-[#10142d] dark:text-white">
              {client.name}&apos;s Requests
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {client.projects.length} {client.projects.length === 1 ? "project" : "projects"} requested
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-neutral-700 dark:hover:bg-neutral-900"
            aria-label="Close client projects"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="max-h-[calc(92dvh-104px)] space-y-4 overflow-y-auto bg-slate-50/60 p-4 dark:bg-neutral-950 sm:p-6">
          {client.projects.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-pink-200 bg-white px-5 text-center dark:border-neutral-700 dark:bg-neutral-900">
              <div>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-pink-50 text-[#c72fb2] dark:bg-pink-950/30">
                  <Icon name="tasks" className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-black text-[#10142d] dark:text-white">No project requests yet</p>
                <p className="mt-1 text-xs font-bold text-slate-400">Projects assigned to this client will appear here.</p>
              </div>
            </div>
          ) : client.projects.map((project) => (
            <article key={project.id} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-[#141414]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-[#10142d] dark:text-white">{project.title}</h3>
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[9px] font-black capitalize text-slate-500 dark:border-neutral-700">
                      {project.priority} priority
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-neutral-400">
                    {project.description}
                  </p>
                </div>
                <ProjectStatus status={project.status} />
              </div>

              <div className="mt-4 grid gap-4 border-y border-slate-100 py-4 dark:border-neutral-800 sm:grid-cols-[150px_minmax(0,1fr)]">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Due date</p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs font-black text-slate-600 dark:text-neutral-300">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#c72fb2]" fill="none" aria-hidden="true">
                      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {formatProjectDate(project.dueDate)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Progress</p>
                    <p className="text-[10px] font-black text-slate-500">{project.completedTasks} of {project.subtasks.length} tasks</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-linear-to-r from-[#df4bb4] to-[#c72fb2]" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Requested work</p>
                {project.subtasks.length ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {project.subtasks.map((subtask, index) => (
                      <div key={subtask?._id || subtask?.id || `${project.id}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-neutral-900">
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${subtask?.completed ? "bg-emerald-100 text-emerald-600" : "bg-pink-100 text-[#c72fb2]"}`}>
                          {subtask?.completed ? (
                            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" aria-hidden="true">
                              <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : <span className="text-[8px] font-black">{index + 1}</span>}
                        </span>
                        <span className={`truncate text-[11px] font-bold ${subtask?.completed ? "text-slate-400 line-through" : "text-slate-600 dark:text-neutral-300"}`} title={subtask?.title}>
                          {subtask?.title || `Task ${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-slate-400">No requested tasks were added.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

const ClientCard = ({ client, onDelete, onViewProjects }) => {
  const isOnline = client.isOnline;
  const presenceLabel = !client.hasLoginAccount
    ? "No login account"
    : !client.isActive
      ? "Inactive account"
      : isOnline
        ? "Online"
        : "Offline";
  const countryFlag = getCountryFlag(client.country);

  return (
    <article className="flex min-h-[230px] flex-col rounded-2xl border border-pink-100 border-b-2 border-b-[#f7b7e6] bg-white px-5 pb-4 pt-5 shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:shadow-none dark:ring-neutral-800">
      {client.id === 1 && (
        <Icon
          name="bell"
          className="absolute left-3 top-2 h-5 w-5 text-neutral-950"
        />
      )}

      <div className="flex items-start gap-4">
        <InitialsAvatar
          className="h-12 w-12"
          fallback="CL"
          initials={client.initials}
          name={client.name}
          src={client.avatar}
          textClassName="text-base"
        />
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="min-w-0 truncate text-base font-extrabold">
              <Link
                to={`/profile/${client.id}`}
                className="text-neutral-950 transition hover:text-[#c72fb2] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 dark:text-white dark:hover:text-pink-300"
                aria-label={`View ${client.name}'s profile`}
              >
                {client.name}
              </Link>
            </h2>
            {countryFlag && (
              <img
                src={countryFlag}
                alt=""
                aria-label={client.country}
                className="h-4 w-7 shrink-0 rounded-[2px] object-contain"
                title={client.country}
              />
            )}
          </div>
          <span
            className={`mt-2 inline-flex h-6 items-center gap-2 rounded-full px-3 text-[11px] font-bold ${
              isOnline
                ? "bg-[#d8ffe3] text-[#1d9a4f]"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
            title="Current presence"
          >
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-[#20bd5a]" : "bg-neutral-400"}`} />
            {presenceLabel}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-xs font-semibold text-slate-600 dark:text-neutral-300">
        <p className="flex items-center gap-2">
          <Icon name="building" className="h-5 w-5 shrink-0 text-slate-500 dark:text-neutral-400" />
          {client.company}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="mail" className="h-5 w-5 shrink-0 text-slate-500 dark:text-neutral-400" />
          {client.email}
        </p>
        <p className="flex items-center gap-2">
          <Icon name="phone" className="h-5 w-5 shrink-0 text-slate-500 dark:text-neutral-400" />
          {client.phone}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Client Projects</p>
          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[9px] font-black text-[#c72fb2] dark:bg-pink-950/30">
            {client.projects.length} {client.projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {client.projects.length ? (
          <div className="mt-3 space-y-2">
            {client.projects.slice(0, 2).map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onViewProjects(client)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition hover:border-pink-200 hover:bg-pink-50 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-[#10142d] dark:text-white">{project.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{project.description}</span>
                </span>
                <ProjectStatus status={project.status} />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[10px] font-bold text-slate-400 dark:border-neutral-700">
            No project requests yet
          </p>
        )}

        <button
          type="button"
          onClick={() => onViewProjects(client)}
          className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black text-[#c72fb2] transition hover:text-[#a92298]"
        >
          View project requests
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="truncate">{client.service}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDelete(client)}
            className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
            aria-label={`Delete ${client.name}`}
          >
            <Icon name="delete" className="h-6 w-6" />
          </button>
        </div>
      </div>
    </article>
  );
};

const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [clientToDelete, setClientToDelete] = useState(null);
  const [selectedClientProjects, setSelectedClientProjects] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async (showLoading = false) => {
      try {
        if (showLoading) {
          setIsLoading(true);
          setErrorMessage("");
        }
        const [clientData, projectData] = await Promise.all([
          clientAPI.getAllFresh({ limit: 100 }),
          taskAPI.getAll({ view: "projects", limit: 100, refresh: true }),
        ]);
        const projects = projectData.map(normalizeProject);

        if (isMounted) {
          setClients(clientData.map((client) => normalizeClient(
            client,
            projects.filter((project) => projectBelongsToClient(project, client)),
          )));
        }
      } catch (error) {
        if (isMounted && showLoading) {
          setErrorMessage(getApiErrorMessage(error, "Unable to load clients."));
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoading(false);
        }
      }
    };

    loadClients(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadClients(false);
    };
    const intervalId = window.setInterval(refreshWhenVisible, 30000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const visibleClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesFilter =
        selectedFilter === "All" || client.status === selectedFilter;
      const matchesSearch = [
        client.name,
        client.company,
        client.email,
        client.country,
        client.phone,
        client.service,
        ...client.projects.flatMap((project) => [
          project.title,
          project.description,
          project.status,
          ...project.subtasks.map((subtask) => subtask?.title || ""),
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [clients, searchTerm, selectedFilter]);

  const countFor = (filter) => {
    if (filter === "All") {
      return clients.length;
    }

    return clients.filter((client) => client.status === filter).length;
  };

  const deleteClient = async (client) => {
    try {
      setErrorMessage("");
      await clientAPI.delete(client.id);
      setClients((currentClients) =>
        currentClients.filter((currentClient) => currentClient.id !== client.id)
      )
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete client.");
    }
  };

  const exportClients = () => {
    const header = [
      "Client",
      "Status",
      "Company",
      "Email",
      "Country",
      "Phone",
      "Service",
      "Address",
      "Notes",
      "Project Count",
      "Project Requests",
    ];
    const rows = visibleClients.map((client) => [
      client.name,
      client.status,
      client.company,
      client.email,
      client.country,
      client.phone,
      client.service,
      client.address,
      client.notes,
      client.projects.length,
      client.projects.map((project) => project.title).join("; "),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "clients.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
        <div className="-mb-8 -mt-4 min-h-[calc(100dvh-4rem)] bg-[#f8f9fd] px-4 py-4 dark:bg-neutral-950 md:px-5 lg:px-6">
        <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1
                className="text-3xl leading-none text-neutral-950 dark:text-white"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Clients
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-neutral-400">
                Manage and organize your client relationships
              </p>
            </div>
            <div className="flex w-full items-center md:w-auto">
              <button
                type="button"
                onClick={exportClients}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(219,74,181,0.32)] transition hover:brightness-105 md:w-auto"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <path d="M10 3v9m0 0 4-4m-4 4-4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export
              </button>
            </div>
          </header>

          <section className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search clients</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search clients by name, email, company..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-12 text-sm font-medium text-neutral-800 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
              />
              <Icon
                name="search"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <FilterButton
                  key={filter.value}
                  active={selectedFilter === filter.value}
                  onClick={() => setSelectedFilter(filter.value)}
                >
                  {filter.label} ({countFor(filter.value)})
                </FilterButton>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-2">
            {errorMessage && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100 lg:col-span-2">
                {errorMessage}
              </p>
            )}

            {isLoading && (
              <PersonGridSkeleton type="client" rows={4} />
            )}

            {!isLoading && visibleClients.length === 0 && (
              <p className="rounded-md bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-[0_3px_4px_rgba(190,65,158,0.2)] lg:col-span-2">
                No clients found.
              </p>
            )}

            {!isLoading && visibleClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onDelete={setClientToDelete}
                onViewProjects={setSelectedClientProjects}
              />
            ))}
          </section>
          <ProjectRequestModal
            client={selectedClientProjects}
            onClose={() => setSelectedClientProjects(null)}
          />
          <ConfirmDialog
            confirmLabel="Yes , delete"
            icon="delete"
            isOpen={Boolean(clientToDelete)}
            message={`Delete client "${clientToDelete?.name || ""}"?`}
            onCancel={() => setClientToDelete(null)}
            onConfirm={async () => {
              const client = clientToDelete;
              setClientToDelete(null);
              if (client) await deleteClient(client);
            }}
            title="Delete"
          />
        </div>
        </div>
  );
};

export default AdminClients;
