import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import budgetIcon from "../assets/budget.png";
import clientIcon from "../assets/client.png";
import CLIENTRA2 from "../assets/CLIENTRA2.png";
import dashboardIcon from "../assets/dashboard.png";
import defaultProfile from "../assets/default-profile.png";
import employeeIcon from "../assets/employee.png";
import heartIcon from "../assets/heart.png";
import messagesIcon from "../assets/messages.png";
import newsfeedIcon from "../assets/newsfeed.png";
import notificationIcon from "../assets/notification.png";
import taskIcon from "../assets/task.png";
import { useAuth } from "../context/AuthContext.jsx";
import { newsfeedAPI, taskAPI } from "../services/api.js";

const notificationTargetKey = "clientraNotificationTarget";
const notificationReadKeyPrefix = "clientraReadNotifications";

const sideNavItems = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "newsfeed", label: "Newsfeed", icon: "newsfeed" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "budget", label: "Budget", icon: "budget" },
  { id: "client", label: "Client", icon: "client" },
  { id: "employee", label: "Employee", icon: "employee" },
  { id: "messages", label: "Messages", icon: "messages" },
];

const navIcons = {
  budget: budgetIcon,
  client: clientIcon,
  dashboard: dashboardIcon,
  employee: employeeIcon,
  messages: messagesIcon,
  newsfeed: newsfeedIcon,
  tasks: taskIcon,
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getUserName = (profile) => {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  return name || profile?.email || "Someone";
};

const trimNotificationText = (text, fallback) => {
  const value = String(text || "").trim();
  if (!value) return fallback;
  return value.length > 74 ? `${value.slice(0, 71)}...` : value;
};

const formatNotificationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getNotificationReadKey = (userId) =>
  `${notificationReadKeyPrefix}:${userId || "guest"}`;

const readStoredNotificationIds = (userId) => {
  try {
    const storedIds = JSON.parse(localStorage.getItem(getNotificationReadKey(userId)) || "[]");
    return Array.isArray(storedIds) ? storedIds : [];
  } catch {
    return [];
  }
};

const buildNewsfeedNotifications = (posts, currentUserId) => {
  const notifications = [];

  posts.forEach((post) => {
    const postId = post?._id || post?.id || "";
    const isOwnPost = getEntityId(post?.author) === currentUserId;
    const preview = trimNotificationText(post?.content, "your newsfeed post");

    if (isOwnPost && Array.isArray(post?.hearts)) {
      post.hearts
        .filter((actor) => getEntityId(actor) !== currentUserId)
        .slice(0, 4)
        .forEach((actor) => {
          notifications.push({
            id: `heart-${postId}-${getEntityId(actor)}`,
            icon: heartIcon,
            actor,
            title: `${getUserName(actor)} hearted your post`,
            message: preview,
            date: post?.updatedAt || post?.createdAt,
            target: { page: "newsfeed", postId },
          });
        });
    }

    (post?.comments || []).forEach((comment) => {
      const commentId = comment?._id || comment?.id || "";
      const isOwnComment = getEntityId(comment?.user) === currentUserId;

      if (isOwnPost && !isOwnComment) {
        notifications.push({
          id: `comment-${postId}-${commentId}`,
          icon: messagesIcon,
          actor: comment.user,
          title: `${getUserName(comment.user)} commented on your post`,
          message: trimNotificationText(comment?.text, preview),
          date: comment?.createdAt,
          target: { page: "newsfeed", postId, commentId },
        });
      }

      (comment?.replies || []).forEach((reply) => {
        const replyId = reply?._id || reply?.id || "";
        const isReplyAuthor = getEntityId(reply?.user) === currentUserId;

        if (!isReplyAuthor && (isOwnPost || isOwnComment)) {
          notifications.push({
            id: `reply-${postId}-${commentId}-${replyId}`,
            icon: messagesIcon,
            actor: reply.user,
            title: `${getUserName(reply.user)} replied ${isOwnComment ? "to your comment" : "on your post"}`,
            message: trimNotificationText(reply?.text, "New reply on newsfeed"),
            date: reply?.createdAt,
            target: { page: "newsfeed", postId, commentId, replyId },
          });
        }
      });
    });
  });

  return notifications;
};

const buildTaskNotifications = (tasks, user) => {
  const userId = getEntityId(user);

  if (user?.role !== "employee") {
    return [];
  }

  return tasks
    .filter((task) => getEntityId(task?.assignedTo) === userId)
    .map((task) => ({
      id: `task-${task?._id || task?.id}`,
      icon: taskIcon,
      actor: task?.createdBy || user,
      title: "New task assigned to you",
      message: trimNotificationText(task?.title, "You have a new task"),
      date: task?.createdAt,
      target: { page: "tasks", taskId: task?._id || task?.id },
    }));
};

const Icon = ({ name, className = "h-6 w-6" }) => {
  if (navIcons[name]) {
    return (
      <img
        src={navIcons[name]}
        alt=""
        className={`${className} object-contain`}
        aria-hidden="true"
      />
    );
  }

  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "grid") {
    return (
      <svg {...props}>
        <path
          d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (name === "monitor") {
    return (
      <svg {...props}>
        <path
          d="M5 5h14v10H5zM9 20h6M12 15v5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...props}>
        <path
          d="M5 6h14v10H9l-4 3V6z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
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
};

const UserAvatar = ({ user }) => {
  return (
    <img
      src={user?.avatar || defaultProfile}
      alt="User"
      onError={(event) => {
        event.currentTarget.src = defaultProfile;
      }}
      className="h-8 w-8 rounded-full object-cover"
    />
  );
};

const MainBars = ({ activePage, children, onLogout, onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [isNotificationOptionsOpen, setIsNotificationOptionsOpen] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const accountMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const userId = getEntityId(user);
  const readNotificationSet = new Set(readNotificationIds);
  const visibleNotifications =
    notificationFilter === "unread"
      ? notifications.filter((notification) => !readNotificationSet.has(notification.id))
      : notifications;
  const unreadCount = notifications.filter(
    (notification) => !readNotificationSet.has(notification.id)
  ).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isNotificationOpen) return;

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setIsNotificationLoading(true);
        setNotificationError("");
        const [posts, tasks] = await Promise.all([
          newsfeedAPI.getAll(),
          user?.role === "employee" ? taskAPI.getAll() : Promise.resolve([]),
        ]);

        const nextNotifications = [
          ...buildNewsfeedNotifications(Array.isArray(posts) ? posts : [], userId),
          ...buildTaskNotifications(Array.isArray(tasks) ? tasks : [], user),
        ].sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));

        if (isMounted) {
          setNotifications(nextNotifications);
          setReadNotificationIds(readStoredNotificationIds(userId));
        }
      } catch (error) {
        if (isMounted) {
          setNotificationError(
            error.response?.data?.message || "Unable to load notifications."
          );
        }
      } finally {
        if (isMounted) {
          setIsNotificationLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [isNotificationOpen, user, userId]);

  const handleOpenNotification = (notification) => {
    const nextReadIds = Array.from(new Set([...readNotificationIds, notification.id]));
    setReadNotificationIds(nextReadIds);
    localStorage.setItem(getNotificationReadKey(userId), JSON.stringify(nextReadIds));
    sessionStorage.setItem(notificationTargetKey, JSON.stringify(notification.target));
    window.dispatchEvent(new Event("clientra:notification-target"));
    setIsNotificationOpen(false);
    onNavigate?.(notification.target.page);
  };

  const handleMarkAllNotificationsRead = () => {
    const nextReadIds = Array.from(
      new Set([...readNotificationIds, ...notifications.map((notification) => notification.id)])
    );
    setReadNotificationIds(nextReadIds);
    localStorage.setItem(getNotificationReadKey(userId), JSON.stringify(nextReadIds));
    setIsNotificationOptionsOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <header className="fixed inset-x-0 top-0 z-30 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-neutral-300 bg-[#f5f5f5] px-4">
        <button
          type="button"
          onClick={() => onNavigate?.("dashboard")}
          className="flex items-center gap-2 justify-self-start"
        >
          <img src={CLIENTRA2} alt="Clientra" className="h-10 w-10 object-contain" />
          <span
            className="text-2xl uppercase text-neutral-950"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            Clientra
          </span>
        </button>

        <div aria-hidden="true" />

        <div className="flex items-center gap-3 justify-self-end">
          <div ref={notificationMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen((isOpen) => !isOpen)}
              className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-neutral-900 shadow-sm transition hover:border-pink-200 hover:text-[#c72fb2]"
              aria-label="Notifications"
              aria-expanded={isNotificationOpen}
              aria-haspopup="dialog"
              title="Notifications"
            >
              <img
                src={notificationIcon}
                alt=""
                className="h-6 w-6 object-contain"
                aria-hidden="true"
              />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#dc4fb2] px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <section className="absolute right-0 top-14 z-40 w-[390px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl">
                <div className="flex items-center justify-between px-5 pt-5">
                  <h2 className="text-2xl font-bold text-neutral-950">Notifications</h2>
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setIsNotificationOptionsOpen((isOpen) => !isOpen)
                        }
                        className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
                        aria-label="Notification options"
                        aria-expanded={isNotificationOptionsOpen}
                        aria-haspopup="menu"
                      >
                        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                          <circle cx="4" cy="10" r="1.6" fill="currentColor" />
                          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
                          <circle cx="16" cy="10" r="1.6" fill="currentColor" />
                        </svg>
                      </button>

                      {isNotificationOptionsOpen && (
                        <div
                          className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-2 text-sm shadow-lg"
                          role="menu"
                        >
                          <button
                            type="button"
                            onClick={handleMarkAllNotificationsRead}
                            className="block w-full px-4 py-2 text-left font-semibold text-neutral-800 transition hover:bg-pink-50 hover:text-[#c72fb2]"
                            role="menuitem"
                          >
                            Mark all as read
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
                      aria-label="Close notifications"
                    >
                      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                        <path
                          d="m5 5 10 10M15 5 5 15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setNotificationFilter("all")}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      notificationFilter === "all"
                        ? "bg-blue-100 text-blue-700"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationFilter("unread")}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      notificationFilter === "unread"
                        ? "bg-blue-100 text-blue-700"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    Unread
                    {unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </button>
                </div>

                <div className="max-h-[520px] overflow-y-auto px-3 pb-4">
                  {isNotificationLoading && (
                    <p className="mx-2 rounded-lg bg-pink-50 px-4 py-4 text-sm font-semibold text-[#c72fb2]">
                      Loading notifications...
                    </p>
                  )}

                  {notificationError && (
                    <p className="mx-2 rounded-lg bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
                      {notificationError}
                    </p>
                  )}

                  {!isNotificationLoading && visibleNotifications.length === 0 && !notificationError && (
                    <p className="mx-2 rounded-lg bg-neutral-50 px-4 py-8 text-center text-sm font-semibold text-neutral-600">
                      {notificationFilter === "unread"
                        ? "No unread notifications."
                        : "No notifications yet."}
                    </p>
                  )}

                  {!isNotificationLoading &&
                    visibleNotifications.map((notification) => {
                      const isUnread = !readNotificationSet.has(notification.id);

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleOpenNotification(notification)}
                          className={`flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-pink-50 ${
                            isUnread ? "bg-white" : "opacity-75"
                          }`}
                        >
                          <span className="relative shrink-0">
                            <UserAvatar user={notification.actor} />
                            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm">
                              <img
                                src={notification.icon}
                                alt=""
                                className="h-4 w-4 object-contain"
                              />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-5 text-neutral-800">
                              {notification.title}
                            </span>
                            <span className="mt-0.5 block text-sm leading-5 text-neutral-600">
                              {notification.message}
                            </span>
                            <span className="mt-1 block text-xs font-bold text-blue-600">
                              {formatNotificationTime(notification.date)}
                            </span>
                          </span>
                          {isUnread && (
                            <span className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </section>
            )}
          </div>

          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 text-neutral-900 shadow-sm transition hover:border-pink-200 hover:text-[#c72fb2]"
              aria-label="Account menu"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
            >
              <UserAvatar user={user} />
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path
                  d="m6 8 4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isAccountMenuOpen && (
              <div
                className="absolute right-0 top-14 z-40 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 text-sm text-neutral-800 shadow-lg"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="block w-full px-4 py-2 text-left hover:bg-pink-50 hover:text-[#c72fb2]"
                  role="menuitem"
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left hover:bg-pink-50 hover:text-[#c72fb2]"
                  role="menuitem"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-16 z-20 hidden h-[calc(100vh-4rem)] w-[112px] border-r border-neutral-300 bg-[#f5f5f5] md:block">
        <nav className="flex flex-col items-center gap-2 overflow-y-auto px-2 py-5">
          {sideNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`flex w-20 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-tight transition active:scale-95 ${
                activePage === item.id
                  ? "bg-linear-to-b from-[#df4bb4] to-[#7e22ce] text-white shadow-[0_4px_8px_rgba(126,34,206,0.35)]"
                  : "text-neutral-900 hover:bg-white hover:text-[#c72fb2]"
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <Icon
                name={item.icon}
                className={`h-6 w-6 ${activePage === item.id ? "brightness-0 invert" : ""}`}
              />
              <span className="max-w-full break-words text-center">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="px-4 pb-10 pt-24 md:ml-[112px] md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default MainBars;
