import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Profile from "./Profile.jsx";
import MainBars from "./MainBars.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { messageAPI } from "../services/api.js";

const adminPages = new Set([
  "dashboard",
  "newsfeed",
  "messages",
  "profile",
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

const getMessageStatus = (message) => {
  if (message?.readAt) return "Seen";
  if (message?.deliveredAt) return "Delivered";
  return "Sent";
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
  const [editingText, setEditingText] = useState("");
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
  const [newMessageSearch, setNewMessageSearch] = useState("");
  const threadEndRef = useRef(null);
  const activeUserIdRef = useRef("");

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
      if (!normalizedSearch) return item.hasThread;

      const participant = item.participant;
      return [getDisplayName(participant), participant?.email, participant?.role]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [searchTerm, threads, users]);

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

        if (threadResult.status === "rejected" && userResult.status === "rejected") {
          setErrorMessage(
            threadResult.reason?.response?.data?.message || "Unable to load messages."
          );
        }

        const firstParticipant = nextThreads?.[0]?.participant || null;
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
          const searchedParticipant = users.find(
            (item) => getEntityId(item) === activeUserId
          );

          if (searchedParticipant) {
            setActiveParticipant(searchedParticipant);
            setMessages([]);
            setErrorMessage("");
          } else {
            setErrorMessage(
              error.response?.data?.message || "Unable to load conversation."
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
  }, [activeUserId, users]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeUserId]);

  useEffect(() => {
    if (!activeUserId) return undefined;

    let isMounted = true;

    const refreshActiveThread = async () => {
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
        // Keep the current view stable; the next interval or manual open can recover.
      }
    };

    const intervalId = setInterval(refreshActiveThread, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeUserId]);

  const handleSelectConversation = (participant) => {
    setActiveUserId(getEntityId(participant));
    setActiveParticipant(participant);
    setDraft("");
    setEditingMessageId("");
    setEditingText("");
  };

  const handleStartNewMessage = () => {
    setIsNewMessageOpen(true);
  };

  const refreshThreads = useCallback(async () => {
    try {
      const nextThreads = await messageAPI.getThreads();
      setThreads(
        Array.isArray(nextThreads)
          ? nextThreads.map((thread) =>
              getEntityId(thread.participant) === activeUserId
                ? { ...thread, unreadCount: 0 }
                : thread
            )
          : []
      );
    } catch {
      // Keep the current inbox visible; polling will try again.
    }
  }, [activeUserId]);

  useEffect(() => {
    const closeMessages = messageAPI.subscribe({
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

        refreshThreads();
      },
      onError: () => {},
    });

    return closeMessages;
  }, [currentUserId, refreshThreads]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshThreads();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [refreshThreads]);

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
    setEditingText(message.text || "");
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId("");
    setEditingText("");
  };

  const handleUpdateMessage = async (event) => {
    event.preventDefault();

    const text = editingText.trim();
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
      setEditingText("");
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
        setEditingText("");
      }
      await refreshThreads();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete message.");
    } finally {
      setBusyMessageId("");
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
  const latestOutgoingId = [...messages]
    .reverse()
    .map((message) => (getEntityId(message.sender) === currentUserId ? getEntityId(message) : ""))
    .find(Boolean);
  const modalUsers = users.filter((participant) => {
    const term = newMessageSearch.trim().toLowerCase();
    if (!term) return true;

    return [
      getDisplayName(participant),
      participant.email,
      participant.role,
      participant.companyName,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

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
            const messageId = getEntityId(message);
            const isEditing = editingMessageId === messageId;

            return (
              <div
                key={message._id || `${message.createdAt}-${message.text}`}
                className={`group/message flex items-center gap-2 ${isMine ? "justify-end" : ""}`}
              >
                {!isMine && (
                  <Avatar className="h-11 w-11 shrink-0" user={activeParticipant} />
                )}
                {isMine && !isEditing && (
                  <div className="relative flex h-full min-h-10 items-center opacity-0 transition group-hover/message:opacity-100 group-focus-within/message:opacity-100">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuMessageId((currentId) =>
                          currentId === messageId ? "" : messageId
                        )
                      }
                      disabled={Boolean(busyMessageId)}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-sm transition hover:bg-neutral-200 disabled:opacity-50"
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
                <div className={`flex max-w-[76%] flex-col ${isMine ? "items-end" : "items-start"} sm:max-w-[560px]`}>
                  <div
                    className={`rounded-3xl px-5 py-3 text-sm font-medium ${
                      isMine
                        ? "bg-[#dc4fb2] text-black"
                        : "bg-neutral-300 text-neutral-950 dark:bg-neutral-800 dark:text-white"
                    }`}
                  >
                    {isEditing ? (
                      <form onSubmit={handleUpdateMessage} className="flex min-w-[240px] flex-col gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(event) => setEditingText(event.target.value)}
                          maxLength={1000}
                          autoFocus
                          className="h-10 rounded-full border border-black/20 bg-white px-4 text-sm text-neutral-950 outline-none focus:ring-2 focus:ring-white/80"
                        />
                        <span className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEditMessage}
                            className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!editingText.trim() || busyMessageId === messageId}
                            className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                        </span>
                      </form>
                    ) : (
                      <>
                        <p className="break-words">{message.text}</p>
                        <p
                          className={`mt-1 text-[10px] font-bold ${
                            isMine ? "text-black/60" : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          {formatMessageTime(message.createdAt)}
                          {message.editedAt ? " · edited" : ""}
                        </p>
                      </>
                    )}
                  </div>
                  {isMine && !isEditing && (
                    <div className="mt-1 flex items-center gap-2 pr-2 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                      {messageId === latestOutgoingId && (
                        <span>{getMessageStatus(message)}</span>
                      )}
                    </div>
                  )}
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
            onClick={() => setDraft((currentDraft) => `${currentDraft} :)`)}
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
    {isNewMessageOpen && (
      <div className="fixed inset-0 z-40 grid place-items-center bg-black/45 px-4">
        <form
          onSubmit={handleSendBulkMessage}
          className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl dark:bg-neutral-950"
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
            className="mt-4 h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm outline-none focus:border-[#dc4fb2] focus:ring-2 focus:ring-[#dc4fb2]/25 dark:border-neutral-800"
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
            className="mt-4 h-28 w-full resize-none rounded-lg border border-neutral-300 bg-transparent p-3 text-sm outline-none focus:border-[#dc4fb2] focus:ring-2 focus:ring-[#dc4fb2]/25 dark:border-neutral-800"
          />
          <div className="mt-4 flex justify-end gap-3">
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
  const role = user?.role;
  const requestedAdminPage = searchParams.get("page");
  const adminPage =
    role === "admin" && adminPages.has(requestedAdminPage)
      ? requestedAdminPage
      : "dashboard";
  const initialLocalPage = ["dashboard", "newsfeed", "messages", "profile", "tasks"].includes(
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
    } else if (adminPage === "profile") {
      adminContent = <Profile embedded />;
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
    ) : localPage === "profile" ? (
      <Profile embedded />
    ) : (
      <div className="-mx-4 -mb-10 -mt-8 min-h-[calc(100vh-4rem)] bg-[#f1f1f1] px-4 py-5 dark:bg-neutral-950 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
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
