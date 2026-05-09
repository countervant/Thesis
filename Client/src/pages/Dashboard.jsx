import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AdminDashboard from "./Dashboard/Admin/Home.jsx";
import AdminTasks from "./Dashboard/Admin/Tasks.jsx";
import AdminBudget from "./Dashboard/Admin/Budget.jsx";
import AdminClients from "./Dashboard/Admin/Client.jsx";
import AdminEmployees from "./Dashboard/Admin/Employee.jsx";
import AdminAddTask from "./Dashboard/Admin/Addtask.jsx";
import AdminAddBudget from "./Dashboard/Admin/Addbudget.jsx";
import AdminAddEmployee from "./Dashboard/Admin/Addemployee.jsx";
import Newsfeed from "./newsfeed.jsx";
import MainBars from "./MainBars.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import defaultProfile from "../assets/default-profile.png";
import { messageAPI } from "../services/api.js";

const adminPages = new Set([
  "dashboard",
  "newsfeed",
  "messages",
  "tasks",
  "add-task",
  "edit-task",
  "budget",
  "add-budget",
  "edit-budget",
  "client",
  "employee",
  "add-employee",
  "edit-employee",
]);

const getEntityId = (entity) => entity?._id || entity?.id || entity || "";

const getDisplayName = (profile) => {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  return name || profile?.companyName || profile?.email || "Unknown User";
};

const formatMessageTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const Avatar = ({ className = "h-12 w-12", user }) => (
  <img
    src={user?.avatar || defaultProfile}
    alt={user ? getDisplayName(user) : ""}
    onError={(event) => {
      event.currentTarget.src = defaultProfile;
    }}
    className={`${className} rounded-full bg-slate-200 object-cover`}
  />
);

const ComposeIcon = ({ className = "h-8 w-8" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M11 4H5.8C4.8 4 4 4.8 4 5.8v12.4c0 1 .8 1.8 1.8 1.8h12.4c1 0 1.8-.8 1.8-1.8V13"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m18.3 3.6 2.1 2.1-9.2 9.2-3.4.8.8-3.4 9.7-8.7Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SmileIcon = ({ className = "h-7 w-7" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8.7 14.1c.8 1.2 1.9 1.8 3.3 1.8s2.5-.6 3.3-1.8M9 10h.1M15 10h.1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const SendIcon = ({ className = "h-9 w-9" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    aria-hidden="true"
  >
    <path
      d="m21 3-8.7 18-2.1-8.2L3 9.7 21 3Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MessagesPanel = () => {
  const { user } = useAuth();
  const currentUserId = getEntityId(user);
  const [users, setUsers] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [activeParticipant, setActiveParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const threadEndRef = useRef(null);

  const conversationItems = useMemo(() => {
    const threadItems = threads
      .filter((thread) => thread.participant)
      .map((thread) => ({
        participant: thread.participant,
        lastMessage: thread.lastMessage,
        unreadCount: thread.unreadCount || 0,
        hasThread: true,
      }));
    const threadIds = new Set(
      threadItems.map((item) => getEntityId(item.participant))
    );
    const newConversationItems = users
      .filter((item) => !threadIds.has(getEntityId(item)))
      .map((participant) => ({
        participant,
        lastMessage: null,
        unreadCount: 0,
        hasThread: false,
      }));
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...threadItems, ...newConversationItems].filter((item) => {
      if (!normalizedSearch) return true;

      const participant = item.participant;
      return [getDisplayName(participant), participant?.email, participant?.role]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [searchTerm, threads, users]);

  useEffect(() => {
    let isMounted = true;

    const loadInbox = async () => {
      try {
        setIsLoadingInbox(true);
        setErrorMessage("");
        const [nextThreads, nextUsers] = await Promise.all([
          messageAPI.getThreads(),
          messageAPI.getUsers(),
        ]);

        if (!isMounted) return;

        setThreads(Array.isArray(nextThreads) ? nextThreads : []);
        setUsers(Array.isArray(nextUsers) ? nextUsers : []);

        const firstParticipant =
          nextThreads?.[0]?.participant || nextUsers?.[0] || null;
        if (!activeUserId && firstParticipant) {
          setActiveUserId(getEntityId(firstParticipant));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || "Unable to load messages."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingInbox(false);
        }
      }
    };

    loadInbox();

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) {
      setMessages([]);
      setActiveParticipant(null);
      return;
    }

    let isMounted = true;

    const loadThread = async () => {
      try {
        setIsLoadingThread(true);
        setErrorMessage("");
        const thread = await messageAPI.getThread(activeUserId);

        if (!isMounted) return;

        setActiveParticipant(thread.participant);
        setMessages(Array.isArray(thread.messages) ? thread.messages : []);
        setThreads((currentThreads) =>
          currentThreads.map((item) =>
            getEntityId(item.participant) === activeUserId
              ? { ...item, unreadCount: 0 }
              : item
          )
        );
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || "Unable to load conversation."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingThread(false);
        }
      }
    };

    loadThread();

    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeUserId]);

  const handleSelectConversation = (participant) => {
    setActiveUserId(getEntityId(participant));
    setActiveParticipant(participant);
    setDraft("");
  };

  const handleStartNewMessage = () => {
    const firstUser = users[0];
    if (firstUser) {
      handleSelectConversation(firstUser);
    }
  };

  const refreshThreads = async () => {
    const nextThreads = await messageAPI.getThreads();
    setThreads(Array.isArray(nextThreads) ? nextThreads : []);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !activeUserId || isSending) return;

    try {
      setIsSending(true);
      setErrorMessage("");
      const savedMessage = await messageAPI.send(activeUserId, text);
      setMessages((currentMessages) => [...currentMessages, savedMessage]);
      setDraft("");
      await refreshThreads();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const activeName = activeParticipant ? getDisplayName(activeParticipant) : "";

  return (
  <section className="-mx-4 -mb-10 -mt-8 flex h-[calc(100vh-4rem)] overflow-hidden border-y border-neutral-300 bg-[#f1f1f1] text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 md:-mx-6 lg:-mx-8">
    <aside className="hidden w-[310px] shrink-0 border-r border-neutral-300 bg-[#f5f5f5] px-4 py-8 dark:border-neutral-800 dark:bg-neutral-950 sm:block lg:w-[330px]">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold leading-none">Messages</h1>
        <button
          type="button"
          onClick={handleStartNewMessage}
          className="grid h-11 w-11 place-items-center rounded-full text-neutral-950 transition hover:bg-white hover:text-[#dc4fb2] dark:text-white dark:hover:bg-neutral-900"
          aria-label="New message"
          title="New message"
        >
          <ComposeIcon />
        </button>
      </div>

      <label className="mt-6 block">
        <span className="sr-only">Search messages</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search"
          className="h-11 w-full rounded-full border border-neutral-300 bg-white px-5 text-sm font-medium outline-none focus:border-[#dc4fb2] focus:ring-2 focus:ring-[#dc4fb2]/25 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
        />
      </label>

      <div className="mt-7 space-y-3 overflow-y-auto pr-1">
        {isLoadingInbox && (
          <p className="rounded-lg bg-white px-4 py-4 text-sm font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
            Loading messages...
          </p>
        )}

        {!isLoadingInbox && conversationItems.length === 0 && (
          <p className="rounded-lg bg-white px-4 py-6 text-sm font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
            No people found.
          </p>
        )}

        {conversationItems.map((item) => {
          const participant = item.participant;
          const participantId = getEntityId(participant);
          const isActive = participantId === activeUserId;
          const preview = item.lastMessage?.text || "Start a conversation";

          return (
          <button
            key={participantId}
            type="button"
            onClick={() => handleSelectConversation(participant)}
            className={`flex w-full items-center gap-4 rounded-xl px-2 py-2 text-left transition ${
              isActive
                ? "bg-white shadow-sm dark:bg-neutral-900"
                : "hover:bg-white dark:hover:bg-neutral-900"
            }`}
          >
            <Avatar className="h-14 w-14 shrink-0" user={participant} />
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-lg leading-tight ${
                  isActive || item.unreadCount ? "font-extrabold" : "font-medium"
                }`}
              >
                {getDisplayName(participant)}
              </span>
              <span
                className={`block truncate text-sm leading-tight ${
                  item.unreadCount ? "font-bold" : "font-medium"
                }`}
              >
                {preview}
              </span>
            </span>
            {item.unreadCount > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#dc4fb2] px-2 text-xs font-bold text-white">
                {item.unreadCount > 9 ? "9+" : item.unreadCount}
              </span>
            )}
          </button>
          );
        })}
      </div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col bg-[#f1f1f1] dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-300 bg-[#f5f5f5] px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950 sm:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-none">Messages</h1>
          {activeName && (
            <p className="mt-1 truncate text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {activeName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleStartNewMessage}
          className="grid h-11 w-11 place-items-center rounded-full text-neutral-950 transition hover:bg-white hover:text-[#dc4fb2] dark:text-white dark:hover:bg-neutral-900"
          aria-label="New message"
          title="New message"
        >
          <ComposeIcon />
        </button>
      </div>

      {conversationItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-neutral-300 bg-[#f5f5f5] px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 sm:hidden">
          {conversationItems.map((item) => {
            const participant = item.participant;
            const participantId = getEntityId(participant);

            return (
              <button
                key={participantId}
                type="button"
                onClick={() => handleSelectConversation(participant)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                  participantId === activeUserId
                    ? "bg-[#dc4fb2] text-white"
                    : "bg-white text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                }`}
              >
                {getDisplayName(participant)}
              </button>
            );
          })}
        </div>
      )}

      {activeParticipant && (
        <div className="hidden items-center gap-3 border-b border-neutral-300 bg-[#f5f5f5] px-7 py-4 dark:border-neutral-800 dark:bg-neutral-950 sm:flex">
          <Avatar className="h-11 w-11" user={activeParticipant} />
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{activeName}</p>
            <p className="truncate text-xs font-semibold capitalize text-neutral-500 dark:text-neutral-400">
              {activeParticipant.role}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200 sm:mx-7">
          {errorMessage}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="space-y-5">
          {isLoadingThread && (
            <p className="rounded-lg bg-white px-4 py-4 text-sm font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              Loading conversation...
            </p>
          )}

          {!isLoadingThread && !activeUserId && (
            <p className="rounded-lg bg-white px-4 py-8 text-center text-sm font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              Select a person to start messaging.
            </p>
          )}

          {!isLoadingThread && activeUserId && messages.length === 0 && (
            <p className="rounded-lg bg-white px-4 py-8 text-center text-sm font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              No messages yet.
            </p>
          )}

          {messages.map((message) => {
            const isMine = getEntityId(message.sender) === currentUserId;

            return (
              <div
                key={message._id || `${message.createdAt}-${message.text}`}
                className={`flex items-end gap-3 ${isMine ? "justify-end" : ""}`}
              >
                {!isMine && (
                  <Avatar className="h-11 w-11 shrink-0" user={activeParticipant} />
                )}
                <div
                  className={`max-w-[76%] rounded-3xl px-5 py-3 text-sm font-medium sm:max-w-[560px] ${
                    isMine
                      ? "bg-[#dc4fb2] text-black"
                      : "bg-neutral-300 text-neutral-950 dark:bg-neutral-800 dark:text-white"
                  }`}
                >
                  <p className="break-words">{message.text}</p>
                  <p
                    className={`mt-1 text-[10px] font-bold ${
                      isMine ? "text-black/60" : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
                {isMine && <Avatar className="h-11 w-11 shrink-0" user={user} />}
              </div>
            );
          })}
          <div ref={threadEndRef} />
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center gap-3 px-4 pb-5 sm:px-9">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Message</span>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Aa"
            maxLength={1000}
            disabled={!activeUserId || isSending}
            className="h-14 w-full rounded-full border-0 bg-neutral-300 px-7 pr-14 text-xl font-medium text-neutral-800 outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-[#dc4fb2] dark:bg-neutral-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setDraft((currentDraft) => `${currentDraft} 🙂`)}
            disabled={!activeUserId || isSending}
            className="absolute right-4 top-1/2 grid -translate-y-1/2 place-items-center text-neutral-950 transition hover:text-[#dc4fb2] dark:text-white"
            aria-label="Choose emoji"
            title="Choose emoji"
          >
            <SmileIcon />
          </button>
        </label>
        <button
          type="submit"
          disabled={!draft.trim() || !activeUserId || isSending}
          className="grid h-12 w-12 shrink-0 place-items-center text-neutral-950 transition hover:text-[#dc4fb2] disabled:cursor-not-allowed disabled:opacity-40 dark:text-white"
          aria-label="Send message"
          title="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  </section>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = user?.role;
  const requestedAdminPage = searchParams.get("page");
  const adminPage =
    role === "admin" && adminPages.has(requestedAdminPage)
      ? requestedAdminPage
      : "dashboard";
  const initialLocalPage = ["dashboard", "newsfeed", "messages", "tasks"].includes(
    location.state?.page
  )
    ? location.state.page
    : "dashboard";
  const [localPage, setLocalPage] = useState(initialLocalPage);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingBudgetEntry, setEditingBudgetEntry] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [employeeRefreshKey, setEmployeeRefreshKey] = useState(0);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  const handleAdminNavigate = (page, options = {}) => {
    if (!adminPages.has(page)) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (page === "dashboard") {
      nextParams.delete("page");
    } else {
      nextParams.set("page", page);
    }

    setSearchParams(nextParams, { replace: options.replace === true });
  };

  const handleTaskCreated = () => {
    setTaskRefreshKey((currentKey) => currentKey + 1);
    setEditingTask(null);
    handleAdminNavigate("tasks", { replace: true });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    handleAdminNavigate("edit-task");
  };

  const handleBudgetSaved = () => {
    setBudgetRefreshKey((currentKey) => currentKey + 1);
    setEditingBudgetEntry(null);
    handleAdminNavigate("budget", { replace: true });
  };

  const handleAddBudgetEntry = () => {
    setEditingBudgetEntry(null);
    handleAdminNavigate("add-budget");
  };

  const handleEditBudgetEntry = (entry) => {
    setEditingBudgetEntry(entry);
    handleAdminNavigate("edit-budget");
  };

  const handleEmployeeSaved = () => {
    setEmployeeRefreshKey((currentKey) => currentKey + 1);
    setEditingEmployee(null);
    handleAdminNavigate("employee", { replace: true });
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    handleAdminNavigate("add-employee");
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    handleAdminNavigate("edit-employee");
  };

  if (role === "admin") {
    const shellActivePage =
      adminPage === "add-task" || adminPage === "edit-task"
        ? "tasks"
        : adminPage === "add-budget" || adminPage === "edit-budget"
          ? "budget"
        : adminPage === "add-employee" || adminPage === "edit-employee"
          ? "employee"
          : adminPage;

    let adminContent = (
      <AdminDashboard activePage={adminPage} />
    );

    if (adminPage === "tasks" || adminPage === "add-task" || adminPage === "edit-task") {
      adminContent = (
        <>
          <AdminTasks
            onEditTask={handleEditTask}
            onNavigate={handleAdminNavigate}
            refreshKey={taskRefreshKey}
          />
          {(adminPage === "add-task" || adminPage === "edit-task") && (
            <AdminAddTask
              onNavigate={handleAdminNavigate}
              onTaskCreated={handleTaskCreated}
              task={adminPage === "edit-task" ? editingTask : null}
            />
          )}
        </>
      );
    } else if (
      adminPage === "budget" ||
      adminPage === "add-budget" ||
      adminPage === "edit-budget"
    ) {
      adminContent = (
        <>
          <AdminBudget
            onAddEntry={handleAddBudgetEntry}
            onEditEntry={handleEditBudgetEntry}
            refreshKey={budgetRefreshKey}
          />
          {(adminPage === "add-budget" || adminPage === "edit-budget") && (
            <AdminAddBudget
              entry={adminPage === "edit-budget" ? editingBudgetEntry : null}
              onBudgetSaved={handleBudgetSaved}
              onNavigate={handleAdminNavigate}
            />
          )}
        </>
      );
    } else if (adminPage === "newsfeed") {
      adminContent = <Newsfeed />;
    } else if (adminPage === "messages") {
      adminContent = <MessagesPanel />;
    } else if (adminPage === "client") {
      adminContent = <AdminClients />;
    } else if (
      adminPage === "employee" ||
      adminPage === "add-employee" ||
      adminPage === "edit-employee"
    ) {
      adminContent = (
        <>
          <AdminEmployees
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            refreshKey={employeeRefreshKey}
          />
          {(adminPage === "add-employee" || adminPage === "edit-employee") && (
            <AdminAddEmployee
              employee={adminPage === "edit-employee" ? editingEmployee : null}
              onEmployeeSaved={handleEmployeeSaved}
              onNavigate={handleAdminNavigate}
            />
          )}
        </>
      );
    }

    return (
      <>
        <MainBars
          activePage={shellActivePage}
          onLogout={handleLogout}
          onNavigate={handleAdminNavigate}
        >
          {adminContent}
        </MainBars>
        <ConfirmDialog
          confirmLabel="Yes , log out"
          icon="logout"
          isOpen={isLogoutDialogOpen}
          message="Are you sure you want to log out?"
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={confirmLogout}
          title="Logout"
        />
      </>
    );
  }

  const regularContent =
    localPage === "newsfeed" ? (
      <Newsfeed />
    ) : localPage === "tasks" ? (
      <AdminTasks />
    ) : localPage === "messages" ? (
      <MessagesPanel />
    ) : (
      <div className="mx-auto max-w-[1500px]">
        <section className="rounded-lg bg-white px-8 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
          <h1
            className="text-3xl uppercase leading-none text-neutral-950"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            Dashboard
          </h1>
          <p className="mt-3 text-sm font-medium text-neutral-600">
            You are logged in as <strong>{role}</strong>.
          </p>

          {role === "employee" && (
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
              <h2 className="font-semibold text-blue-800">Employee Portal</h2>
              <p className="mt-2 text-sm text-blue-600">
                Access your assigned tasks, manage client interactions, and update records.
              </p>
            </div>
          )}

          {role === "client" && (
            <div className="mt-6 rounded-lg border border-green-100 bg-green-50 px-5 py-4">
              <h2 className="font-semibold text-green-800">Client Portal</h2>
              <p className="mt-2 text-sm text-green-600">
                View your account information, submit requests, and track your service status.
              </p>
            </div>
          )}
        </section>
      </div>
    );

  return (
    <>
      <MainBars
        activePage={localPage}
        onLogout={handleLogout}
        onNavigate={setLocalPage}
      >
        {regularContent}
      </MainBars>
      <ConfirmDialog
        confirmLabel="Yes , log out"
        icon="logout"
        isOpen={isLogoutDialogOpen}
        message="Are you sure you want to log out?"
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
        title="Logout"
      />
    </>
  );
};

export default Dashboard;
