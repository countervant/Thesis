import {
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import MainBars from "./MainBars.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { budgetPlannerAPI, getApiErrorMessage, messageAPI } from "../services/api.js";

const AdminDashboard = lazy(() => import("./Dashboard/Admin/Home.jsx"));
const AdminTasks = lazy(() => import("./Dashboard/Admin/Tasks.jsx"));
const AdminBudget = lazy(() => import("./Dashboard/Admin/Budget.jsx"));
const AdminClients = lazy(() => import("./Dashboard/Admin/Client.jsx"));
const AdminEmployees = lazy(() => import("./Dashboard/Admin/Employee.jsx"));
const AdminAddTask = lazy(() => import("./Dashboard/Admin/Addtask.jsx"));
const AdminAddBudget = lazy(() => import("./Dashboard/Admin/Addbudget.jsx"));
const AdminAddEmployee = lazy(() => import("./Dashboard/Admin/Addemployee.jsx"));
const AdminCalendar = lazy(() => import("./Dashboard/Admin/Calendar.jsx"));
const LeaveRequest = lazy(() => import("./Leaverequest.jsx"));
const ClientDashboard = lazy(() => import("./Dashboard/Client.jsx"));
const ClientProjects = lazy(() => import("./Dashboard/ClientProjects.jsx"));
const Feedback = lazy(() => import("./Dashboard/Feedback.jsx"));
const EmpDashboard = lazy(() => import("./Dashboard/Employee/EmpDashboard.jsx"));
const EmpCalendar = lazy(() => import("./Dashboard/Employee/EmpCalendar.jsx"));
const EmpLeaverequest = lazy(() => import("./Dashboard/Employee/EmpLeaverequest.jsx"));
const EmpTask = lazy(() => import("./Dashboard/Employee/EmpTask.jsx"));
const EmpBudgetPlanner = lazy(() => import("./Dashboard/Employee/EmpBudgetPlanner.jsx"));
const Newsfeed = lazy(() => import("./newsfeed.jsx"));
const Profile = lazy(() => import("./Profile.jsx"));
const Settings = lazy(() => import("./Settings/settings.jsx"));

const DashboardPageFallback = () => (
  <div className="space-y-4" aria-label="Loading page">
    <Skeleton className="h-10 w-64 max-w-full" />
    <Skeleton className="h-48 w-full rounded-2xl" />
    <Skeleton className="h-48 w-full rounded-2xl" />
  </div>
);

const adminPages = new Set([
  "dashboard",
  "newsfeed",
  "feedback",
  "messages",
  "profile",
  "settings",
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
  "leave-request",
  "calendar",
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

const getMessageDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const formatMessageDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dateKey = getMessageDateKey(date);

  if (dateKey === getMessageDateKey(today)) return "Today";
  if (dateKey === getMessageDateKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const getMessageStatus = (message) => {
  if (message?.readAt) return "Seen";
  if (message?.deliveredAt) return "Delivered";
  return "Sent";
};

const getMessageInboxStateKey = (userId) =>
  `clientraMessageInboxState:${userId || "guest"}`;

const readMessageInboxState = (userId) => {
  try {
    const storedState = JSON.parse(
      localStorage.getItem(getMessageInboxStateKey(userId)) || "{}"
    );
    return {
      archivedIds: Array.isArray(storedState.archivedIds) ? storedState.archivedIds : [],
      deletedIds: Array.isArray(storedState.deletedIds) ? storedState.deletedIds : [],
    };
  } catch {
    return { archivedIds: [], deletedIds: [] };
  }
};

const Avatar = ({ className = "h-12 w-12", user }) => (
  <InitialsAvatar
    alt={user ? getDisplayName(user) : ""}
    className={className}
    textClassName={className.includes("h-14") ? "text-xl" : "text-sm"}
    user={user}
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

const MessageInboxSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 rounded-2xl border border-pink-100 bg-white px-3 py-4 pr-12 shadow-[0_6px_22px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-950">
        <Skeleton className="h-12 w-12 rounded-full" />
        <span className="min-w-0 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-44 max-w-full" />
        </span>
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
);

const MessageThreadSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-end gap-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <span className="max-w-[70%] rounded-[22px] bg-slate-100 px-5 py-3 dark:bg-neutral-900">
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="mt-2 h-3 w-16" />
      </span>
    </div>
    <div className="flex justify-end">
      <span className="max-w-[70%] rounded-[22px] bg-pink-50 px-5 py-3 dark:bg-neutral-900">
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="ml-auto mt-2 h-3 w-14" />
      </span>
    </div>
    <div className="flex items-end gap-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <span className="max-w-[70%] rounded-[22px] bg-slate-100 px-5 py-3 dark:bg-neutral-900">
        <Skeleton className="h-4 w-44 max-w-full" />
        <Skeleton className="mt-2 h-3 w-16" />
      </span>
    </div>
  </div>
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
  const [editingMessageId, setEditingMessageId] = useState("");
  const [busyMessageId, setBusyMessageId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [openMenuMessageId, setOpenMenuMessageId] = useState("");
  const [mobileActionMessage, setMobileActionMessage] = useState(null);
  const [openInboxMenuId, setOpenInboxMenuId] = useState("");
  const [inboxFilter, setInboxFilter] = useState("all");
  const [inboxState, setInboxState] = useState(() =>
    readMessageInboxState(currentUserId)
  );
  const [newMessageSearch, setNewMessageSearch] = useState("");
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const threadEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const activeUserIdRef = useRef("");
  const usersRef = useRef([]);
  const threadRefreshPromiseRef = useRef(null);
  const threadRefreshTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);

  useEffect(() => () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
  }, []);

  const updateInboxState = (updater) => {
    setInboxState((currentState) => {
      const nextState = updater(currentState);
      localStorage.setItem(getMessageInboxStateKey(currentUserId), JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleArchiveConversation = (participantId) => {
    updateInboxState((currentState) => ({
      archivedIds: Array.from(new Set([...currentState.archivedIds, participantId])),
      deletedIds: currentState.deletedIds.filter((id) => id !== participantId),
    }));
    if (participantId === activeUserId && inboxFilter !== "archived") {
      setActiveUserId("");
      setActiveParticipant(null);
      setMessages([]);
      setIsMobileThreadOpen(false);
    }
    setOpenInboxMenuId("");
  };

  const handleUnarchiveConversation = (participantId) => {
    updateInboxState((currentState) => ({
      ...currentState,
      archivedIds: currentState.archivedIds.filter((id) => id !== participantId),
    }));
    setOpenInboxMenuId("");
  };

  const handleDeleteConversation = (participantId) => {
    updateInboxState((currentState) => ({
      archivedIds: currentState.archivedIds.filter((id) => id !== participantId),
      deletedIds: Array.from(new Set([...currentState.deletedIds, participantId])),
    }));
    if (participantId === activeUserId) {
      setActiveUserId("");
      setActiveParticipant(null);
      setMessages([]);
      setIsMobileThreadOpen(false);
    }
    setOpenInboxMenuId("");
  };

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

    return [
      ...threadItems,
      ...(normalizedSearch ? newConversationItems : []),
    ].filter((item) => {
      const participantId = getEntityId(item.participant);
      const isArchived = inboxState.archivedIds.includes(participantId);
      const isDeleted = inboxState.deletedIds.includes(participantId);
      if (isDeleted) return false;
      if (inboxFilter === "archived" && !isArchived) return false;
      if (inboxFilter !== "archived" && isArchived) return false;
      if (inboxFilter === "unread" && !item.unreadCount) return false;
      if (!normalizedSearch) return item.hasThread || inboxFilter === "archived";

      const participant = item.participant;
      return [getDisplayName(participant), participant?.email, participant?.role]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [inboxFilter, inboxState, searchTerm, threads, users]);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    let isMounted = true;

    const loadInbox = async () => {
      try {
        setIsLoadingInbox(true);
        setErrorMessage("");
        const [threadResult, userResult] = await Promise.allSettled([
          messageAPI.getThreads(),
          messageAPI.getUsers({ limit: 100 }),
        ]);
        const nextThreads =
          threadResult.status === "fulfilled" && Array.isArray(threadResult.value)
            ? threadResult.value
            : [];
        const nextUsers =
          userResult.status === "fulfilled" && Array.isArray(userResult.value)
            ? userResult.value
            : [];

        if (!isMounted) return;

        setThreads(nextThreads);
        setUsers(nextUsers);
        usersRef.current = nextUsers;

        if (threadResult.status === "rejected" && userResult.status === "rejected") {
          setErrorMessage(
            getApiErrorMessage(threadResult.reason, "Unable to load messages.")
          );
        }

        const firstParticipant = nextThreads?.[0]?.participant || null;
        if (firstParticipant) {
          setActiveUserId((currentId) => currentId || getEntityId(firstParticipant));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            getApiErrorMessage(error, "Unable to load messages.")
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
  }, [currentUserId]);

  useEffect(() => {
    if (!activeUserId) {
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
          const searchedParticipant = usersRef.current.find(
            (item) => getEntityId(item) === activeUserId
          );

          if (searchedParticipant) {
            setActiveParticipant(searchedParticipant);
            setMessages([]);
            setErrorMessage("");
          } else {
            setErrorMessage(
              getApiErrorMessage(error, "Unable to load conversation.")
            );
          }
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

  useEffect(() => {
    if (!activeUserId || isRealtimeConnected) return undefined;

    let isMounted = true;
    const refreshActiveThread = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const thread = await messageAPI.getThread(activeUserId);
        if (!isMounted) return;

        setActiveParticipant(thread.participant);
        setMessages((currentMessages) => {
          const nextMessages = Array.isArray(thread.messages) ? thread.messages : [];
          const currentLastId = getEntityId(currentMessages.at(-1));
          const nextLastId = getEntityId(nextMessages.at(-1));

          return currentMessages.length === nextMessages.length &&
            currentLastId === nextLastId
            ? currentMessages
            : nextMessages;
        });
      } catch {
        // EventSource reconnects automatically; this slower poll is only a fallback.
      }
    };

    const intervalId = window.setInterval(refreshActiveThread, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeUserId, isRealtimeConnected]);

  const handleSelectConversation = (participant) => {
    setActiveUserId(getEntityId(participant));
    setActiveParticipant(participant);
    setIsMobileThreadOpen(true);
    setDraft("");
    setEditingMessageId("");
  };

  const handleStartNewMessage = () => {
    setIsNewMessageOpen(true);
  };

  const refreshThreads = useCallback(async () => {
    if (threadRefreshTimerRef.current) {
      window.clearTimeout(threadRefreshTimerRef.current);
      threadRefreshTimerRef.current = null;
    }

    if (threadRefreshPromiseRef.current) {
      return threadRefreshPromiseRef.current;
    }

    const request = messageAPI
      .getThreadsFresh()
      .then((nextThreads) => {
        setThreads(
          Array.isArray(nextThreads)
            ? nextThreads.map((thread) =>
                getEntityId(thread.participant) === activeUserIdRef.current
                  ? { ...thread, unreadCount: 0 }
                  : thread
              )
            : []
        );
      })
      .catch(() => {
        // Keep the current inbox visible; realtime or fallback refresh will retry.
      });

    threadRefreshPromiseRef.current = request;
    try {
      await request;
    } finally {
      if (threadRefreshPromiseRef.current === request) {
        threadRefreshPromiseRef.current = null;
      }
    }
  }, []);

  const scheduleThreadRefresh = useCallback(() => {
    if (threadRefreshTimerRef.current) {
      window.clearTimeout(threadRefreshTimerRef.current);
    }

    threadRefreshTimerRef.current = window.setTimeout(() => {
      threadRefreshTimerRef.current = null;
      refreshThreads();
    }, 150);
  }, [refreshThreads]);

  useEffect(() => {
    const closeMessages = messageAPI.subscribe({
      onOpen: () => setIsRealtimeConnected(true),
      onMessage: (event) => {
        const action = event?.action || "created";
        const message = event?.message || event;
        const senderId = getEntityId(message.sender);
        const recipientId = getEntityId(message.recipient);
        const conversationUserId =
          senderId === currentUserId ? recipientId : senderId;

        if (conversationUserId === activeUserIdRef.current) {
          setMessages((currentMessages) => {
            if (action === "deleted") {
              return currentMessages.filter(
                (item) => getEntityId(item) !== getEntityId(message)
              );
            }

            if (action === "updated") {
              return currentMessages.map((item) =>
                getEntityId(item) === getEntityId(message) ? message : item
              );
            }

            if (action === "delivered") {
              return currentMessages.map((item) =>
                getEntityId(item) === getEntityId(message) ? { ...item, ...message } : item
              );
            }

            if (
              currentMessages.some(
                (item) => getEntityId(item) === getEntityId(message)
              )
            ) {
              return currentMessages;
            }

            return [...currentMessages, message];
          });
        }

        if (action === "read") {
          setMessages((currentMessages) =>
            currentMessages.map((item) =>
              getEntityId(item.sender) === currentUserId &&
              getEntityId(item.recipient) === event.readerId
                ? { ...item, readAt: event.readAt, deliveredAt: item.deliveredAt || event.readAt }
                : item
            )
          );
        }

        scheduleThreadRefresh();
      },
      onError: () => setIsRealtimeConnected(false),
    });

    return () => {
      if (threadRefreshTimerRef.current) {
        window.clearTimeout(threadRefreshTimerRef.current);
        threadRefreshTimerRef.current = null;
      }
      closeMessages();
    };
  }, [currentUserId, scheduleThreadRefresh]);

  useEffect(() => {
    let isMounted = true;

    const refreshParticipantPresence = async () => {
      if (document.visibilityState !== "visible") return;

      const [threadResult, userResult] = await Promise.allSettled([
        isRealtimeConnected ? Promise.resolve(null) : messageAPI.getThreadsFresh(),
        messageAPI.getUsersFresh({ limit: 100 }),
      ]);
      if (!isMounted) return;

      if (threadResult.status === "fulfilled" && Array.isArray(threadResult.value)) {
        setThreads(
          threadResult.value.map((thread) =>
            getEntityId(thread.participant) === activeUserIdRef.current
              ? { ...thread, unreadCount: 0 }
              : thread
          )
        );
      }
      if (userResult.status === "fulfilled") {
        setUsers(userResult.value);
        usersRef.current = userResult.value;
      }
    };

    const intervalId = window.setInterval(refreshParticipantPresence, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshParticipantPresence();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRealtimeConnected]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !activeUserId || isSending) return;

    try {
      setIsSending(true);
      setErrorMessage("");
      const savedMessage = await messageAPI.send(activeUserId, text);
      setMessages((currentMessages) => {
        if (
          currentMessages.some(
            (item) => getEntityId(item) === getEntityId(savedMessage)
          )
        ) {
          return currentMessages;
        }

        return [...currentMessages, savedMessage];
      });
      setDraft("");
      await refreshThreads();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartEditMessage = (message) => {
    setEditingMessageId(getEntityId(message));
    setDraft(message.text || "");
    window.setTimeout(() => messageInputRef.current?.focus(), 0);
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId("");
    setDraft("");
  };

  const handleUpdateMessage = async (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!editingMessageId || !text || busyMessageId) return;

    try {
      setBusyMessageId(editingMessageId);
      setErrorMessage("");
      const updatedMessage = await messageAPI.update(editingMessageId, text);
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          getEntityId(message) === getEntityId(updatedMessage)
            ? updatedMessage
            : message
        )
      );
      setEditingMessageId("");
      setDraft("");
      await refreshThreads();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to edit message.");
    } finally {
      setBusyMessageId("");
    }
  };

  const handleDeleteMessage = async (message) => {
    const messageId = getEntityId(message);
    if (!messageId || busyMessageId) return;

    try {
      setBusyMessageId(messageId);
      setErrorMessage("");
      await messageAPI.delete(messageId);
      setMessages((currentMessages) =>
        currentMessages.filter((item) => getEntityId(item) !== messageId)
      );
      if (editingMessageId === messageId) {
        setEditingMessageId("");
        setDraft("");
      }
      await refreshThreads();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete message.");
    } finally {
      setBusyMessageId("");
    }
  };

  const cancelMessageLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  };

  const startMessageLongPress = (event, message, isMine, isEditing) => {
    if (!isMine || isEditing || event.pointerType === "mouse") return;
    cancelMessageLongPress();
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      setMobileActionMessage(message);
      longPressTimerRef.current = null;
      if (navigator.vibrate) navigator.vibrate(30);
    }, 550);
  };

  const moveMessageLongPress = (event) => {
    const start = longPressStartRef.current;
    if (!start) return;
    if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) {
      cancelMessageLongPress();
    }
  };

  const toggleSelectedRecipient = (recipientId) => {
    setSelectedRecipientIds((currentIds) =>
      currentIds.includes(recipientId)
        ? currentIds.filter((id) => id !== recipientId)
        : [...currentIds, recipientId]
    );
  };

  const selectRecipientsByRole = (role) => {
    setSelectedRecipientIds(
      users
        .filter((item) => item.role === role)
        .map((item) => getEntityId(item))
    );
  };

  const handleSendBulkMessage = async (event) => {
    event.preventDefault();
    const text = bulkDraft.trim();
    if (!text || selectedRecipientIds.length === 0 || isSending) return;

    try {
      setIsSending(true);
      setErrorMessage("");
      const result = await messageAPI.send(selectedRecipientIds, text);
      const createdMessages = Array.isArray(result?.messages) ? result.messages : [];
      setBulkDraft("");
      setSelectedRecipientIds([]);
      setIsNewMessageOpen(false);
      if (createdMessages[0]) {
        const firstRecipientId = getEntityId(createdMessages[0].recipient);
        const participant = users.find((item) => getEntityId(item) === firstRecipientId);
        if (participant) handleSelectConversation(participant);
      }
      await refreshThreads();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const activeName = activeParticipant ? getDisplayName(activeParticipant) : "";
  const latestOutgoingId = useMemo(
    () =>
      [...messages]
        .reverse()
        .map((message) =>
          getEntityId(message.sender) === currentUserId ? getEntityId(message) : ""
        )
        .find(Boolean),
    [currentUserId, messages]
  );
  const modalUsers = useMemo(() => {
    const term = newMessageSearch.trim().toLowerCase();
    if (!term) return users;

    return users.filter((participant) =>
      [
        getDisplayName(participant),
        participant.email,
        participant.role,
        participant.companyName,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [newMessageSearch, users]);
  const mobileContactUsers = useMemo(
    () =>
      users
        .filter((participant) => participant.isOnline || participant.online)
        .slice(0, 10),
    [users]
  );
  const unreadThreadCount = useMemo(
    () => threads.reduce((total, thread) => total + (thread.unreadCount || 0), 0),
    [threads]
  );

  return (
  <section className="messages-workspace relative -mb-0 -mt-4 flex select-none overflow-hidden border-y border-slate-100 bg-white text-[#172033] caret-transparent dark:border-[#DA70D6]/70 dark:bg-neutral-950 dark:text-white">
    <aside className={`${isMobileThreadOpen ? "hidden" : "flex"} absolute inset-0 z-10 w-full shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-5 dark:border-[#DA70D6]/60 dark:bg-neutral-950 md:static md:flex md:w-[310px] md:px-5 md:py-7 lg:w-[350px]`}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title text-3xl leading-none md:text-2xl">Messages</h1>
        <button
          type="button"
          onClick={handleStartNewMessage}
          className="grid h-10 w-10 place-items-center rounded-full text-[#ff3faf] transition hover:bg-pink-50 dark:text-[#f472d0] dark:hover:bg-neutral-900"
          aria-label="New message"
          title="New message"
        >
          <ComposeIcon className="h-6 w-6" />
        </button>
      </div>

      <label className="mt-5 flex h-11 items-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-4 text-slate-400 shadow-sm dark:border-[#DA70D6]/80 dark:bg-neutral-900 md:mt-6">
        <span className="sr-only">Search inbox</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.9" />
          <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search messages..."
          className="min-w-0 flex-1 select-text border-0 bg-transparent text-xs font-bold text-slate-700 caret-[#ff3faf] outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white"
        />
      </label>

      {mobileContactUsers.length > 0 && (
        <div className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 md:hidden">
          {mobileContactUsers.map((participant) => {
            const participantId = getEntityId(participant);
            const isOnline = Boolean(participant.isOnline || participant.online);
            return (
              <button
                key={participantId}
                type="button"
                onClick={() => handleSelectConversation(participant)}
                className="w-[72px] shrink-0 text-center"
              >
                <span className="relative mx-auto block w-fit">
                  <Avatar className="h-16 w-16 ring-2 ring-pink-200 dark:ring-neutral-700" user={participant} />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-950" />
                  )}
                </span>
                <span className="mt-2 block truncate text-xs font-bold text-slate-700 dark:text-neutral-200">
                  {getDisplayName(participant).split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black md:mt-5 md:gap-3">
        <button
          type="button"
          onClick={() => setInboxFilter("all")}
          className={`rounded-full px-3 py-2.5 md:rounded-2xl md:px-4 md:py-3 ${
            inboxFilter === "all"
              ? "bg-pink-50 text-[#ff3faf]"
              : "bg-slate-50 text-slate-600 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setInboxFilter("unread")}
          className={`rounded-full px-3 py-2.5 md:rounded-2xl md:px-4 md:py-3 ${
            inboxFilter === "unread"
              ? "bg-pink-50 text-[#ff3faf]"
              : "bg-slate-50 text-slate-600 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          Unread
          {unreadThreadCount > 0 && (
            <span className="ml-1 rounded-full bg-[#ff3faf] px-1.5 py-0.5 text-[10px] text-white">
              {unreadThreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setInboxFilter("archived")}
          className={`rounded-full px-3 py-2.5 md:rounded-2xl md:px-4 md:py-3 ${
            inboxFilter === "archived"
              ? "bg-pink-50 text-[#ff3faf]"
              : "bg-slate-50 text-slate-600 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          Archived
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-0 overflow-y-auto md:mt-6 md:space-y-3 md:pr-1">
        {isLoadingInbox && (
          <MessageInboxSkeleton rows={5} />
        )}

        {!isLoadingInbox && conversationItems.length === 0 && (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500 dark:bg-neutral-900 dark:text-neutral-300">
            No conversations yet.
          </p>
        )}

        {conversationItems.map((item) => {
          const participant = item.participant;
          const participantId = getEntityId(participant);
          const isActive = participantId === activeUserId;
          const preview = item.lastMessage?.text || "Start a conversation";
          const isArchived = inboxState.archivedIds.includes(participantId);
          const isOnline = Boolean(participant?.isOnline || participant?.online);

          return (
          <button
            key={participantId}
            type="button"
            onClick={() => handleSelectConversation(participant)}
            className={`relative flex w-full items-center gap-3 border px-1 py-3.5 pr-11 text-left transition md:gap-4 md:rounded-2xl md:px-3 md:py-4 md:pr-12 ${
              isActive
                ? "border-transparent bg-transparent md:border-pink-200 md:bg-pink-50 md:shadow-[0_10px_28px_rgba(236,72,153,0.12)] md:dark:border-[#DA70D6] md:dark:bg-neutral-900"
                : "border-transparent bg-transparent hover:bg-pink-50/70 dark:hover:bg-neutral-900 md:border-pink-100 md:bg-white md:shadow-[0_6px_22px_rgba(15,23,42,0.06)] md:dark:border-[#DA70D6]/80 md:dark:bg-neutral-950"
            }`}
          >
            <span className="relative shrink-0">
              <Avatar className="h-14 w-14 md:h-12 md:w-12" user={participant} />
              {isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-950" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-base leading-tight md:text-sm ${
                  isActive || item.unreadCount ? "font-extrabold" : "font-medium"
                }`}
              >
                {getDisplayName(participant)}
              </span>
              <span
                className={`mt-1.5 block truncate text-sm leading-tight text-slate-500 md:mt-1 md:text-xs ${
                  item.unreadCount ? "font-bold" : "font-medium"
                }`}
              >
                {preview}
              </span>
            </span>
            <span className="mr-4 flex w-12 shrink-0 flex-col items-end gap-2 self-stretch pt-1 md:mr-5 md:w-11">
              <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">
                {formatMessageTime(item.lastMessage?.createdAt) || ""}
              </span>
              {item.unreadCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3faf] px-1.5 text-[10px] font-bold text-white">
                  {item.unreadCount > 9 ? "9+" : item.unreadCount}
                </span>
              )}
            </span>
            <span className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenInboxMenuId((currentId) =>
                    currentId === participantId ? "" : participantId
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpenInboxMenuId((currentId) =>
                      currentId === participantId ? "" : participantId
                    );
                  }
                }}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-white hover:text-[#ff3faf] dark:hover:bg-neutral-800"
                aria-label="Conversation options"
                aria-haspopup="menu"
                aria-expanded={openInboxMenuId === participantId}
              >
                <span className="flex flex-col items-center gap-0.5" aria-hidden="true">
                  <span className="h-1 w-1 rounded-full bg-current" />
                  <span className="h-1 w-1 rounded-full bg-current" />
                  <span className="h-1 w-1 rounded-full bg-current" />
                </span>
              </span>
              {openInboxMenuId === participantId && (
                <span
                  className="absolute right-0 top-9 z-30 w-32 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 text-xs font-black shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
                  role="menu"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span
                    role="menuitem"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isArchived) {
                        handleUnarchiveConversation(participantId);
                      } else {
                        handleArchiveConversation(participantId);
                      }
                    }}
                    className="block cursor-pointer px-3 py-2 text-left text-slate-700 hover:bg-pink-50 hover:text-[#ff3faf] dark:text-white dark:hover:bg-neutral-800"
                  >
                    {isArchived ? "Unarchive" : "Archive"}
                  </span>
                  <span
                    role="menuitem"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteConversation(participantId);
                    }}
                    className="block cursor-pointer px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-neutral-800"
                  >
                    Delete
                  </span>
                </span>
              )}
            </span>
          </button>
          );
        })}
      </div>
    </aside>

    <div className={`${isMobileThreadOpen ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-white dark:bg-neutral-950 md:flex`}>
      <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileThreadOpen(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-pink-50 hover:text-[#ff3faf] dark:text-white dark:hover:bg-neutral-900"
            aria-label="Back to conversations"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {activeParticipant && <Avatar className="h-10 w-10 shrink-0" user={activeParticipant} />}
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{activeName || "Conversation"}</p>
            <p className="truncate text-xs font-semibold capitalize text-slate-500 dark:text-neutral-400">
              {activeParticipant?.isOnline || activeParticipant?.online
                ? "Online"
                : activeParticipant?.role || "Offline"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleStartNewMessage}
          className="grid h-11 w-11 place-items-center rounded-full text-[#ff3faf] transition hover:bg-pink-50 dark:text-[#f472d0] dark:hover:bg-neutral-900"
          aria-label="New message"
          title="New message"
        >
          <ComposeIcon className="h-6 w-6" />
        </button>
      </div>

      {activeParticipant && (
        <div className="hidden items-center gap-3 border-b border-slate-100 bg-white px-8 py-5 dark:border-neutral-800 dark:bg-neutral-950 md:flex">
          <span className="relative shrink-0">
            <Avatar className="h-12 w-12" user={activeParticipant} />
            {(activeParticipant.isOnline || activeParticipant.online) && (
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-950"
                aria-label="Online"
                title="Online"
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{activeName}</p>
            <p className="flex items-center gap-1.5 truncate text-xs font-semibold capitalize text-slate-500 dark:text-neutral-400">
              {(activeParticipant.isOnline || activeParticipant.online) && (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              )}
              {activeParticipant.isOnline || activeParticipant.online
                ? "Online"
                : activeParticipant.role || "Offline"}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="mx-4 mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200 md:mx-8">
          {errorMessage}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5 dark:bg-neutral-950 md:px-8">
        <div className="w-full space-y-3">
          {isLoadingThread && (
            <MessageThreadSkeleton />
          )}

          {!isLoadingThread && !activeUserId && (
            <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:bg-neutral-900 dark:text-neutral-300">
              Select a person to start messaging.
            </p>
          )}

          {!isLoadingThread && activeUserId && messages.length === 0 && (
            <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:bg-neutral-900 dark:text-neutral-300">
              No messages yet.
            </p>
          )}

          {messages.map((message, index) => {
            const isMine = getEntityId(message.sender) === currentUserId;
            const messageId = getEntityId(message);
            const isEditing = editingMessageId === messageId;
            const messageDateKey = getMessageDateKey(message.createdAt);
            const previousMessageDateKey = getMessageDateKey(messages[index - 1]?.createdAt);
            const showDateDivider = messageDateKey && messageDateKey !== previousMessageDateKey;

            return (
              <Fragment key={message._id || `${message.createdAt}-${message.text}`}>
              {showDateDivider && (
                <p className="py-1 text-center text-xs font-black text-slate-400">
                  {formatMessageDate(message.createdAt)}
                </p>
              )}
              <div
                className={`group/message flex items-end gap-2 md:gap-3 ${isMine ? "justify-end" : "pl-0 md:pl-10"}`}
              >
                {!isMine && (
                  <Avatar className="h-9 w-9 shrink-0" user={activeParticipant} />
                )}
                {isMine && !isEditing && (
                  <div className="relative mt-1 hidden min-h-10 self-start items-center opacity-0 transition md:flex md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuMessageId((currentId) =>
                          currentId === messageId ? "" : messageId
                        )
                      }
                      disabled={Boolean(busyMessageId)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                      aria-label="Message options"
                    >
                      <span className="flex flex-col items-center gap-0.5" aria-hidden="true">
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                      </span>
                    </button>
                    {openMenuMessageId === messageId && (
                      <div className="absolute right-11 top-1/2 z-10 w-28 -translate-y-1/2 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 text-left text-xs font-bold shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuMessageId("");
                            handleStartEditMessage(message);
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuMessageId("");
                            handleDeleteMessage(message);
                          }}
                          className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-neutral-800"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex max-w-[82%] flex-col ${isMine ? "items-end" : "items-start"} md:max-w-[560px]`}>
                  <div
                    className={`relative mb-4 touch-manipulation rounded-[22px] px-4 py-3 text-sm font-semibold shadow-sm md:px-5 ${
                      isMine
                        ? "bg-pink-100 text-[#172033] dark:bg-neutral-800 dark:text-white md:bg-pink-50"
                        : "bg-slate-100 text-[#172033] dark:bg-neutral-800 dark:text-white"
                    }`}
                    onPointerDown={(event) => startMessageLongPress(event, message, isMine, isEditing)}
                    onPointerMove={moveMessageLongPress}
                    onPointerUp={cancelMessageLongPress}
                    onPointerCancel={cancelMessageLongPress}
                    onPointerLeave={cancelMessageLongPress}
                    onContextMenu={(event) => {
                      if (!isMine || isEditing) return;
                      event.preventDefault();
                      if (window.matchMedia("(max-width: 767px)").matches) {
                        setMobileActionMessage(message);
                      }
                    }}
                  >
                    <>
                      <p className="select-none break-words caret-[#ff3faf] md:select-text">{message.text}</p>
                        <p
                          className={`absolute top-full mt-1 whitespace-nowrap text-[10px] font-bold ${
                            isMine ? "right-0 text-slate-400" : "left-0 text-slate-400 dark:text-neutral-400"
                          }`}
                        >
                          {formatMessageTime(message.createdAt)}
                          {message.editedAt ? " · edited" : ""}
                        </p>
                    </>
                  </div>
                  {isMine && !isEditing && (
                    <div className="mt-1 flex items-center gap-2 pr-2 text-[11px] font-bold text-slate-400 dark:text-neutral-400">
                      {messageId === latestOutgoingId && (
                        <span>{getMessageStatus(message)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </Fragment>
            );
          })}
          <div ref={threadEndRef} />
        </div>
      </div>

      <form onSubmit={editingMessageId ? handleUpdateMessage : handleSendMessage} className="shrink-0 border-t border-slate-100 bg-white px-2 py-2.5 dark:border-neutral-800 dark:bg-neutral-950 md:px-8 md:py-4">
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-[#c72fb2] dark:bg-neutral-900 dark:text-pink-300">
            <span className="min-w-0 truncate">Editing message</span>
            <button type="button" onClick={handleCancelEditMessage} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm hover:bg-pink-100 dark:hover:bg-neutral-800" aria-label="Cancel editing">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
        <div className="flex w-full items-center gap-1.5 rounded-full border border-slate-100 bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-neutral-900 md:gap-3 md:px-4 md:py-2">
          <button
            type="button"
            disabled={!activeUserId || isSending}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-slate-50 hover:text-[#ff3faf] disabled:opacity-40 dark:text-white dark:hover:bg-neutral-800 min-[390px]:grid"
            aria-label="Attach file"
            title="Attach file"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="m8.5 12.5 5.9-5.9a3.2 3.2 0 0 1 4.5 4.5l-7.5 7.5a5 5 0 0 1-7.1-7.1l7.7-7.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Message</span>
            <input
              ref={messageInputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={editingMessageId ? "Edit your message..." : "Type your message..."}
              maxLength={1000}
              disabled={!activeUserId || isSending}
              className="h-10 w-full select-text rounded-full border-0 bg-transparent px-2 pr-9 text-sm font-semibold text-slate-700 caret-[#ff3faf] outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white md:pr-11"
            />
            <button
              type="button"
              onClick={() => setDraft((currentDraft) => `${currentDraft} :)`)}
              disabled={!activeUserId || isSending}
              className="absolute right-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-600 transition hover:bg-slate-50 hover:text-[#ff3faf] dark:text-white dark:hover:bg-neutral-800 min-[390px]:grid md:right-1"
              aria-label="Choose emoji"
              title="Choose emoji"
            >
              <SmileIcon className="h-5 w-5" />
            </button>
          </label>
          <button
            type="submit"
            disabled={!draft.trim() || !activeUserId || isSending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ff3faf] text-white shadow-[0_10px_22px_rgba(255,63,175,0.28)] transition hover:bg-[#e9369f] disabled:cursor-not-allowed disabled:opacity-40 md:h-11 md:w-11"
            aria-label={editingMessageId ? "Save edited message" : "Send message"}
            title={editingMessageId ? "Save edited message" : "Send message"}
          >
            {editingMessageId ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
    {mobileActionMessage && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/45 p-3 md:hidden"
        onClick={() => setMobileActionMessage(null)}
      >
        <div
          className="w-full rounded-3xl bg-white p-2 shadow-2xl dark:bg-neutral-900"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-neutral-400">
            Message options
          </p>
          <button
            type="button"
            onClick={() => {
              handleStartEditMessage(mobileActionMessage);
              setMobileActionMessage(null);
            }}
            className="flex h-12 w-full items-center rounded-2xl px-4 text-left text-sm font-black transition hover:bg-pink-50 hover:text-[#c72fb2] dark:text-white dark:hover:bg-neutral-800"
          >
            Edit message
          </button>
          <button
            type="button"
            onClick={() => {
              const message = mobileActionMessage;
              setMobileActionMessage(null);
              handleDeleteMessage(message);
            }}
            className="flex h-12 w-full items-center rounded-2xl px-4 text-left text-sm font-black text-red-500 transition hover:bg-red-50 dark:hover:bg-neutral-800"
          >
            Delete message
          </button>
          <button
            type="button"
            onClick={() => setMobileActionMessage(null)}
            className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 dark:bg-neutral-800 dark:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
    {isNewMessageOpen && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-3 py-4 sm:px-4">
        <form
          onSubmit={handleSendBulkMessage}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-2xl dark:bg-neutral-950 sm:p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold">New Message</h2>
            <button
              type="button"
              onClick={() => setIsNewMessageOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
              aria-label="Close new message"
            >
              x
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <button type="button" onClick={() => setSelectedRecipientIds(users.map((item) => getEntityId(item)))} className="rounded-full bg-neutral-100 px-3 py-2 dark:bg-neutral-900">Select All</button>
            <button type="button" onClick={() => selectRecipientsByRole("client")} className="rounded-full bg-neutral-100 px-3 py-2 dark:bg-neutral-900">Select All Clients</button>
            <button type="button" onClick={() => selectRecipientsByRole("employee")} className="rounded-full bg-neutral-100 px-3 py-2 dark:bg-neutral-900">Select All Employees</button>
            <button type="button" onClick={() => setSelectedRecipientIds([])} className="rounded-full bg-neutral-100 px-3 py-2 dark:bg-neutral-900">Clear</button>
          </div>
          <input
            type="search"
            value={newMessageSearch}
            onChange={(event) => setNewMessageSearch(event.target.value)}
            placeholder="Search users"
            className="mt-4 h-10 w-full select-text rounded-lg border border-neutral-300 bg-transparent px-4 text-sm caret-[#ff3faf] outline-none focus:border-[#dc4fb2] focus:ring-2 focus:ring-[#dc4fb2]/25 dark:border-neutral-800"
          />
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
            {modalUsers.map((participant) => {
              const participantId = getEntityId(participant);
              const selected = selectedRecipientIds.includes(participantId);
              return (
                <label key={participantId} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelectedRecipient(participantId)}
                    className="h-4 w-4"
                  />
                  <Avatar className="h-10 w-10" user={participant} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{getDisplayName(participant)}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      {[participant.email, participant.role, participant.companyName].filter(Boolean).join(" - ")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <textarea
            value={bulkDraft}
            onChange={(event) => setBulkDraft(event.target.value)}
            maxLength={1000}
            placeholder="Type a message"
            className="mt-4 h-28 w-full select-text resize-none rounded-lg border border-neutral-300 bg-transparent p-3 text-sm caret-[#ff3faf] outline-none focus:border-[#dc4fb2] focus:ring-2 focus:ring-[#dc4fb2]/25 dark:border-neutral-800"
          />
          <div className="mt-4 flex flex-col-reverse gap-2 min-[390px]:flex-row min-[390px]:justify-end sm:gap-3">
            <button type="button" onClick={() => setIsNewMessageOpen(false)} className="h-10 rounded-lg border border-neutral-300 px-5 text-sm font-bold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!bulkDraft.trim() || selectedRecipientIds.length === 0 || isSending}
              className="h-10 rounded-lg bg-[#dc4fb2] px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    )}
  </section>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeRole = location.pathname.split("/").filter(Boolean)[0];
  const role = ["admin", "client", "employee"].includes(routeRole)
    ? routeRole
    : String(user?.role || "client").toLowerCase();
  const requestedAdminPage = searchParams.get("page");
  const adminPage =
    role === "admin" && adminPages.has(requestedAdminPage)
      ? requestedAdminPage
      : "dashboard";
  const localPages = new Set([
    "dashboard", "projects", "newsfeed", "feedback", "messages", "profile", "settings",
    "tasks", "add-task", "edit-task", "calendar", "budget", "add-budget", "edit-budget", "leave-request",
  ]);
  const requestedLocalPage = searchParams.get("page") || location.state?.page;
  const localPage = localPages.has(requestedLocalPage) ? requestedLocalPage : "dashboard";
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

  const handleLocalNavigate = (page, options = {}) => {
    if (!localPages.has(page)) return;

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
    if (role === "admin") {
      handleAdminNavigate("tasks", { replace: true });
    } else {
      handleLocalNavigate("tasks", { replace: true });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    if (role === "admin") {
      handleAdminNavigate("edit-task");
    } else {
      handleLocalNavigate("edit-task");
    }
  };

  const handleBudgetSaved = () => {
    setBudgetRefreshKey((currentKey) => currentKey + 1);
    setEditingBudgetEntry(null);
    if (role === "admin") {
      handleAdminNavigate("budget", { replace: true });
    } else {
      handleLocalNavigate("budget", { replace: true });
    }
  };

  const handleAddBudgetEntry = () => {
    setEditingBudgetEntry(null);
    if (role === "admin") {
      handleAdminNavigate("add-budget");
    } else {
      handleLocalNavigate("add-budget");
    }
  };

  const handleEditBudgetEntry = (entry) => {
    setEditingBudgetEntry(entry);
    if (role === "admin") {
      handleAdminNavigate("edit-budget");
    } else {
      handleLocalNavigate("edit-budget");
    }
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
              key={adminPage === "edit-task" ? editingTask?.id || "edit-task" : "new-task"}
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
              key={adminPage === "edit-budget" ? editingBudgetEntry?.id || "edit-budget" : "new-budget"}
              entry={adminPage === "edit-budget" ? editingBudgetEntry : null}
              onBudgetSaved={handleBudgetSaved}
              onNavigate={handleAdminNavigate}
            />
          )}
        </>
      );
    } else if (adminPage === "newsfeed") {
      adminContent = <Newsfeed />;
    } else if (adminPage === "feedback") {
      adminContent = <Feedback />;
    } else if (adminPage === "messages") {
      adminContent = <MessagesPanel />;
    } else if (adminPage === "profile") {
      adminContent = <Profile embedded />;
    } else if (adminPage === "settings") {
      adminContent = <Settings embedded />;
    } else if (adminPage === "client") {
      adminContent = <AdminClients />;
    } else if (adminPage === "leave-request") {
      adminContent = <LeaveRequest />;
    } else if (adminPage === "calendar") {
      adminContent = <AdminCalendar />;
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
              key={adminPage === "edit-employee" ? editingEmployee?.id || "edit-employee" : "new-employee"}
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
          <Suspense fallback={<DashboardPageFallback />}>{adminContent}</Suspense>
        </MainBars>
        <ConfirmDialog
          confirmLabel="Log out"
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
    role === "employee" && localPage === "dashboard" ? (
      <EmpDashboard />
    ) : role === "client" && localPage === "dashboard" ? (
      <ClientDashboard />
    ) : role === "client" && localPage === "projects" ? (
      <ClientProjects />
    ) : role === "employee" && localPage === "tasks" ? (
      <EmpTask />
    ) : role === "employee" && localPage === "calendar" ? (
      <EmpCalendar />
    ) : role === "employee" && ["budget", "add-budget", "edit-budget"].includes(localPage) ? (
      <>
        <EmpBudgetPlanner
          onAddEntry={handleAddBudgetEntry}
          onEditEntry={handleEditBudgetEntry}
          refreshKey={budgetRefreshKey}
        />
        {(localPage === "add-budget" || localPage === "edit-budget") && (
          <AdminAddBudget
            key={localPage === "edit-budget" ? editingBudgetEntry?.id || "edit-budget" : "new-budget"}
            dataAPI={budgetPlannerAPI}
            entry={localPage === "edit-budget" ? editingBudgetEntry : null}
            onBudgetSaved={handleBudgetSaved}
            onNavigate={handleLocalNavigate}
          />
        )}
      </>
    ) : role === "employee" && localPage === "leave-request" ? (
      <EmpLeaverequest />
    ) : localPage === "newsfeed" ? (
      <Newsfeed />
    ) : role === "employee" && localPage === "feedback" ? (
      <Feedback />
    ) : role === "client" && ["tasks", "add-task", "edit-task"].includes(localPage) ? (
      <>
        <AdminTasks
          onEditTask={handleEditTask}
          onNavigate={handleLocalNavigate}
          refreshKey={taskRefreshKey}
        />
        {(localPage === "add-task" || localPage === "edit-task") && (
          <AdminAddTask
            key={localPage === "edit-task" ? editingTask?.id || "edit-task" : "new-task"}
            onNavigate={handleLocalNavigate}
            onTaskCreated={handleTaskCreated}
            task={localPage === "edit-task" ? editingTask : null}
          />
        )}
      </>
    ) : localPage === "messages" ? (
      <MessagesPanel />
    ) : localPage === "profile" ? (
      <Profile embedded />
    ) : localPage === "settings" ? (
      <Settings embedded />
    ) : (
      <div className="-mb-10 -mt-8 min-h-[calc(100dvh-4rem)] bg-[#f1f1f1] px-4 py-5 dark:bg-neutral-950 md:px-6 lg:px-8">
        <section className="rounded-lg bg-white px-8 py-8 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
          <h1
            className="page-title text-3xl leading-none text-neutral-950"
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
        activePage={
          ["add-task", "edit-task"].includes(localPage)
            ? "tasks"
            : ["add-budget", "edit-budget"].includes(localPage)
              ? "budget"
              : localPage
        }
        onLogout={handleLogout}
        onNavigate={handleLocalNavigate}
      >
        <Suspense fallback={<DashboardPageFallback />}>{regularContent}</Suspense>
      </MainBars>
      <ConfirmDialog
        confirmLabel="Log out"
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
