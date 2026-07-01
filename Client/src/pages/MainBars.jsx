import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import budgetIcon from "../assets/budget.png";
import calendarIcon from "../assets/calendar.png";
import clientIcon from "../assets/client.png";
import CLIENTRA2 from "../assets/CLIENTRA2.png";
import dashboardIcon from "../assets/dashboard.png";
import employeeIcon from "../assets/employee.png";
import heartIcon from "../assets/heart.png";
import leaveRequestIcon from "../assets/leaverequest.png";
import messagesIcon from "../assets/messages.png";
import menuIcon from "../assets/menu.png";
import newsfeedIcon from "../assets/newsfeed.png";
import notificationIcon from "../assets/notification.png";
import logoutIcon from "../assets/logout.png";
import profileIcon from "../assets/profile.png";
import sidebarIcon from "../assets/sidebar.png";
import settingsIcon from "../assets/settings.png";
import taskIcon from "../assets/task.png";
import themeIcon from "../assets/theme.png";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { NotificationSkeleton } from "../components/Skeleton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage, messageAPI, newsfeedAPI, taskAPI } from "../services/api.js";

const notificationTargetKey = "clientraNotificationTarget";
const notificationReadKeyPrefix = "clientraReadNotifications";
const notificationHiddenKeyPrefix = "clientraHiddenNotifications";
const themeStorageKey = "clientraTheme";

const sideNavSections = [
  {
    title: "Main",
    items: [{ id: "dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Feedback",
    items: [{ id: "newsfeed", label: "Newsfeed", icon: "newsfeed" }],
  },
  {
    title: "Management",
    items: [
      { id: "tasks", label: "Tasks", icon: "tasks" },
      { id: "calendar", label: "Calendar", icon: "calendar" },
      { id: "budget", label: "Budget", icon: "budget" },
      { id: "client", label: "Client", icon: "client" },
      { id: "employee", label: "Employee", icon: "employee" },
      { id: "leave-request", label: "Leave Requests", icon: "leave-request" },
    ],
  },
  {
    title: "System",
    items: [{ id: "settings", label: "Settings", icon: "settings" }],
  },
];

const navIcons = {
  budget: budgetIcon,
  calendar: calendarIcon,
  client: clientIcon,
  dashboard: dashboardIcon,
  employee: employeeIcon,
  "leave-request": leaveRequestIcon,
  messages: messagesIcon,
  newsfeed: newsfeedIcon,
  settings: settingsIcon,
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

const getNotificationHiddenKey = (userId) =>
  `${notificationHiddenKeyPrefix}:${userId || "guest"}`;

const readStoredNotificationIds = (userId) => {
  try {
    const storedIds = JSON.parse(localStorage.getItem(getNotificationReadKey(userId)) || "[]");
    return Array.isArray(storedIds) ? storedIds : [];
  } catch {
    return [];
  }
};

const readHiddenNotificationIds = (userId) => {
  try {
    const storedIds = JSON.parse(localStorage.getItem(getNotificationHiddenKey(userId)) || "[]");
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

  if (name === "calendar") {
    return (
      <svg {...props}>
        <rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "leave-request") {
    return (
      <svg {...props}>
        <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M8 8h8M8 12h5M8 16h3M16 14l1.5 1.5L21 12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
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
    <InitialsAvatar alt="User" className="h-8 w-8" textClassName="text-xs" user={user} />
  );
};

const AccountMenuIcon = ({ src }) => (
  <img
    src={src}
    alt=""
    className="h-5 w-5 shrink-0 object-contain dark:brightness-0 dark:invert"
    aria-hidden="true"
  />
);

const MainBars = ({ activePage, children, onLogout, onNavigate }) => {
  const isMessagesPage = activePage === "messages";
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const visibleSideNavSections =
    user?.role === "employee"
      ? sideNavSections
          .map((section) =>
            section.title === "Management"
              ? {
                  ...section,
                  items: section.items.filter((item) =>
                    ["tasks", "calendar", "leave-request"].includes(item.id)
                  ),
                }
              : section
          )
          .filter((section) => section.items.length > 0)
      : sideNavSections;
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem(themeStorageKey) === "dark"
  );
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [hiddenNotificationIds, setHiddenNotificationIds] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [isNotificationOptionsOpen, setIsNotificationOptionsOpen] = useState(false);
  const [openNotificationMenuId, setOpenNotificationMenuId] = useState("");
  const [notificationDeleteAction, setNotificationDeleteAction] = useState(null);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [newsfeedSearch, setNewsfeedSearch] = useState("");
  const accountMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const userId = getEntityId(user);
  const readNotificationSet = new Set(readNotificationIds);
  const hiddenNotificationSet = new Set(hiddenNotificationIds);
  const visibleNotifications =
    notificationFilter === "unread"
      ? notifications.filter(
          (notification) =>
            !readNotificationSet.has(notification.id) &&
            !hiddenNotificationSet.has(notification.id)
        )
      : notifications.filter((notification) => !hiddenNotificationSet.has(notification.id));
  const unreadCount = notifications.filter(
    (notification) =>
      !readNotificationSet.has(notification.id) &&
      !hiddenNotificationSet.has(notification.id)
  ).length;
  const mobileNavItems =
    user?.role === "employee"
      ? [
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "tasks", label: "Tasks", icon: "tasks" },
          { id: "calendar", label: "Calendar", icon: "calendar" },
          { id: "leave-request", label: "Leave", icon: "leave-request" },
          { id: "settings", label: "Settings", icon: "settings" },
        ]
      : [
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "tasks", label: "Tasks", icon: "tasks" },
          { id: "calendar", label: "Calendar", icon: "calendar" },
          { id: "employee", label: "Employee", icon: "employee" },
          { id: "settings", label: "Settings", icon: "settings" },
        ];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem(themeStorageKey, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const handleNewsfeedSearchSet = (event) => {
      setNewsfeedSearch(event.detail?.value || "");
    };

    window.addEventListener("clientra:newsfeed-search-set", handleNewsfeedSearchSet);
    return () =>
      window.removeEventListener("clientra:newsfeed-search-set", handleNewsfeedSearchSet);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("clientra:newsfeed-search", {
        detail: { value: activePage === "newsfeed" ? newsfeedSearch : "" },
      })
    );
  }, [activePage, newsfeedSearch]);

  useEffect(() => {
    if (!token || !userId) {
      setUnreadMessageCount(0);
      return undefined;
    }

    let isMounted = true;

    const loadUnreadMessages = async () => {
      try {
        const count = await messageAPI.getUnreadCount();
        if (isMounted) {
          setUnreadMessageCount(count);
        }
      } catch {
        if (isMounted) {
          setUnreadMessageCount(0);
        }
      }
    };

    loadUnreadMessages();

    const closeMessages = messageAPI.subscribe({
      onMessage: loadUnreadMessages,
      onError: () => {},
    });
    const intervalId = setInterval(loadUnreadMessages, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      closeMessages();
    };
  }, [token, userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationOpen(false);
        setOpenNotificationMenuId("");
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
          newsfeedAPI.getActivity(),
          user?.role === "employee" ? taskAPI.getAll() : Promise.resolve([]),
        ]);

        const nextNotifications = [
          ...buildNewsfeedNotifications(Array.isArray(posts) ? posts : [], userId),
          ...buildTaskNotifications(Array.isArray(tasks) ? tasks : [], user),
        ].sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));

        if (isMounted) {
          setNotifications(nextNotifications);
          setReadNotificationIds(readStoredNotificationIds(userId));
          setHiddenNotificationIds(readHiddenNotificationIds(userId));
        }
      } catch (error) {
        if (isMounted) {
          setNotificationError(
            getApiErrorMessage(error, "Unable to load notifications.")
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

  const removeAllNotifications = () => {
    const nextHiddenIds = Array.from(
      new Set([
        ...hiddenNotificationIds,
        ...notifications.map((notification) => notification.id),
      ])
    );
    setHiddenNotificationIds(nextHiddenIds);
    localStorage.setItem(getNotificationHiddenKey(userId), JSON.stringify(nextHiddenIds));
    setIsNotificationOptionsOpen(false);
    setOpenNotificationMenuId("");
  };

  const requestRemoveAllNotifications = () => {
    setNotificationDeleteAction({
      confirmLabel: "Yes, remove all",
      message: "Are you sure you want to remove all notifications?",
      onConfirm: removeAllNotifications,
      title: "Remove Notifications",
    });
    setIsNotificationOptionsOpen(false);
  };

  const deleteNotification = (notificationId) => {
    const nextHiddenIds = Array.from(new Set([...hiddenNotificationIds, notificationId]));
    setHiddenNotificationIds(nextHiddenIds);
    localStorage.setItem(getNotificationHiddenKey(userId), JSON.stringify(nextHiddenIds));
    setOpenNotificationMenuId("");
  };

  const requestDeleteNotification = (event, notificationId) => {
    event.stopPropagation();
    setNotificationDeleteAction({
      confirmLabel: "Yes, delete",
      message: "Are you sure you want to delete this notification?",
      onConfirm: () => deleteNotification(notificationId),
      title: "Delete Notification",
    });
    setOpenNotificationMenuId("");
  };

  const closeNotificationDeleteDialog = () => setNotificationDeleteAction(null);

  const confirmNotificationDeleteAction = () => {
    const action = notificationDeleteAction;
    if (!action) return;
    setNotificationDeleteAction(null);
    action.onConfirm();
  };

  const handleProfileClick = () => {
    setIsAccountMenuOpen(false);
    if (onNavigate) {
      onNavigate("profile");
      return;
    }
    navigate("/profile");
  };

  const handleSettingsClick = () => {
    setIsAccountMenuOpen(false);
    if (onNavigate) {
      onNavigate("settings");
      return;
    }
    navigate(`/${user?.role || "client"}/dashboard`, { state: { page: "settings" } });
  };

  const handleThemeClick = () => {
    setIsDarkMode((currentMode) => !currentMode);
  };

  const handleLogoutClick = () => {
    setIsAccountMenuOpen(false);
    onLogout?.();
  };

  const handleSideNavNavigate = (page) => {
    onNavigate?.(page);
    if (window.innerWidth < 768) {
      setIsSidebarExpanded(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded((isExpanded) => {
      const nextIsExpanded = !isExpanded;
      if (!nextIsExpanded) {
        setIsAccountMenuOpen(false);
      }
      return nextIsExpanded;
    });
  };

  const expandSidebar = () => {
    if (!isSidebarExpanded) {
      setIsSidebarExpanded(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9ff] text-neutral-950 dark:bg-neutral-950 dark:text-white md:bg-[#f8f9fd]">
      <header
        className={`fixed right-0 top-0 z-30 flex h-[92px] items-center justify-between gap-3 bg-[#fbf9ff]/95 px-6 transition-[left] duration-300 ease-in-out dark:bg-neutral-950 md:h-14 md:gap-4 md:border-b md:border-neutral-200 md:bg-[#f8f9fd] md:px-4 dark:md:border-neutral-800 dark:md:bg-neutral-950 ${
          isSidebarExpanded ? "left-0 md:left-[220px]" : "left-0 md:left-[68px]"
        }`}
      >
        <div className="flex items-center gap-5 md:hidden">
          <button
            type="button"
            onClick={toggleSidebar}
            className="grid h-11 w-11 place-items-center text-neutral-950 dark:text-white"
            aria-label="Open menu"
          >
            <img src={menuIcon} alt="" className="h-7 w-7 object-contain dark:brightness-0 dark:invert" aria-hidden="true" />
          </button>
        </div>

        {activePage === "newsfeed" ? (
          <label
            className={`relative hidden w-full flex-1 md:block ${
              isSidebarExpanded ? "ml-0 max-w-[380px]" : "ml-10 max-w-[440px]"
            }`}
          >
            <span className="sr-only">Search newsfeed</span>
            <svg
              viewBox="0 0 24 24"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={newsfeedSearch}
              onChange={(event) => setNewsfeedSearch(event.target.value)}
              placeholder="Search users..."
              className="h-9 w-full rounded-xl border border-pink-100 bg-white pl-11 pr-4 text-sm font-semibold text-neutral-800 shadow-[0_4px_18px_rgba(190,65,158,0.08)] outline-none transition placeholder:text-slate-400 focus:border-[#dc4fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            />
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2.5 md:gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate?.("messages")}
            className={`relative grid h-10 w-10 place-items-center rounded-xl border transition hover:border-pink-200 hover:text-[#c72fb2] ${
              activePage === "messages"
                ? "border-pink-200 bg-pink-50 text-[#c72fb2] dark:border-[#DA70D6]/40 dark:bg-neutral-900 dark:text-[#f472d0]"
                : "border-slate-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            }`}
            aria-label="Messages"
            title="Messages"
          >
            <img
              src={messagesIcon}
              alt=""
              className={`h-5 w-5 object-contain ${
                activePage === "messages" ? "top-nav-icon-active" : ""
              }`}
              aria-hidden="true"
            />
            {unreadMessageCount > 0 && (
              <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#dc4fb2] px-1 text-[8px] font-bold leading-none text-white">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </span>
            )}
          </button>

          <div ref={notificationMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen((isOpen) => !isOpen)}
              className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-100 bg-white text-neutral-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:border-pink-200 hover:text-[#c72fb2] dark:border-neutral-800 dark:bg-neutral-900 dark:text-white md:h-10 md:w-10 md:rounded-xl md:shadow-none"
              aria-label="Notifications"
              aria-expanded={isNotificationOpen}
              aria-haspopup="dialog"
              title="Notifications"
            >
              <img
                src={notificationIcon}
                alt=""
                className="h-5 w-5 object-contain"
                aria-hidden="true"
              />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#dc4fb2] px-1 text-[8px] font-bold leading-none text-white">
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
                          <button
                            type="button"
                            onClick={requestRemoveAllNotifications}
                            className="block w-full px-4 py-2 text-left font-semibold text-red-600 transition hover:bg-red-50"
                            role="menuitem"
                          >
                            Delete all notifications
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
                    <div className="mx-2">
                      <NotificationSkeleton rows={4} />
                    </div>
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
                          <span className="relative -mr-1 shrink-0">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenNotificationMenuId((currentId) =>
                                  currentId === notification.id ? "" : notification.id
                                );
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setOpenNotificationMenuId((currentId) =>
                                    currentId === notification.id ? "" : notification.id
                                  );
                                }
                              }}
                              className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
                              aria-label="Notification actions"
                              aria-haspopup="menu"
                              aria-expanded={openNotificationMenuId === notification.id}
                            >
                              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                                <circle cx="4" cy="10" r="1.6" fill="currentColor" />
                                <circle cx="10" cy="10" r="1.6" fill="currentColor" />
                                <circle cx="16" cy="10" r="1.6" fill="currentColor" />
                              </svg>
                            </span>

                            {openNotificationMenuId === notification.id && (
                              <span
                                className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-2 text-sm shadow-lg"
                                role="menu"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <span
                                  role="menuitem"
                                  tabIndex={0}
                                  onClick={(event) =>
                                    requestDeleteNotification(event, notification.id)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      requestDeleteNotification(event, notification.id);
                                    }
                                  }}
                                  className="block w-full cursor-pointer px-4 py-2 text-left font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  Delete notification
                                </span>
                              </span>
                            )}
                          </span>
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
              className="flex h-12 min-w-0 items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-2 text-left text-neutral-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:border-pink-200 hover:text-[#c72fb2] dark:border-neutral-800 dark:bg-neutral-900 dark:text-white md:h-10 md:min-w-[190px] md:rounded-xl md:border-slate-200 md:px-2.5 md:shadow-none"
              aria-label="Account menu"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
            >
              <UserAvatar user={user} />
              <span className="hidden min-w-0 flex-1 md:block">
                <span className="block truncate text-sm font-extrabold text-[#10172a] dark:text-white">
                  {getUserName(user)}
                </span>
                <span className="block text-xs font-semibold capitalize text-slate-500">
                  {user?.role || "User"}
                </span>
              </span>
              <svg
                viewBox="0 0 20 20"
                className={`hidden h-4 w-4 shrink-0 transition-transform md:block ${
                  isAccountMenuOpen ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden="true"
              >
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
                className="absolute right-0 top-12 z-40 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white px-2 py-2 text-neutral-950 shadow-[0_14px_34px_rgba(0,0,0,0.18)] dark:bg-neutral-900 dark:text-white dark:shadow-[0_14px_34px_rgba(0,0,0,0.5)]"
                role="menu"
              >
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-semibold leading-none transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  <AccountMenuIcon src={profileIcon} />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={handleThemeClick}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-semibold leading-none transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  role="menuitemcheckbox"
                  aria-checked={isDarkMode}
                >
                  <AccountMenuIcon src={themeIcon} />
                  <span className="flex-1">Theme</span>
                  <span
                    className={`flex h-5 w-10 shrink-0 items-center rounded-full p-1 transition ${
                      isDarkMode ? "bg-[#dc4fb2]" : "bg-neutral-300"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        isDarkMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSettingsClick}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-semibold leading-none transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  <AccountMenuIcon src={settingsIcon} />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-semibold leading-none transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  <AccountMenuIcon src={logoutIcon} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {isSidebarExpanded && (
        <button
          type="button"
          onClick={() => setIsSidebarExpanded(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
          aria-label="Close navigation menu"
        />
      )}

      <aside
        onClick={expandSidebar}
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-visible border-r border-neutral-300 bg-[#f8f9fd] shadow-2xl transition-[transform,width] duration-300 ease-in-out dark:border-neutral-800 dark:bg-neutral-950 md:translate-x-0 md:shadow-none ${
          isSidebarExpanded ? "w-[260px] translate-x-0 md:w-[220px]" : "w-[260px] -translate-x-full md:w-[68px]"
        }`}
      >
        <div className="relative flex h-14 items-center px-2.5">
          <button
            type="button"
            onClick={() => handleSideNavNavigate("dashboard")}
            className={`flex min-w-0 items-center transition-all duration-300 ${
              isSidebarExpanded ? "w-full justify-start gap-2 pr-8" : "w-full justify-center"
            }`}
            aria-label="Clientra dashboard"
          >
            <img src={CLIENTRA2} alt="Clientra" className="h-9 w-9 shrink-0 object-contain" />
            <span
              className={`min-w-0 overflow-hidden whitespace-nowrap text-left text-neutral-950 transition-all duration-300 dark:text-white ${
                isSidebarExpanded ? "max-w-[140px] translate-x-0 opacity-100" : "max-w-0 translate-x-2 opacity-0"
              }`}
            >
              <span
                className="block text-base uppercase leading-none tracking-wide"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Clientra
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold leading-none text-slate-600 dark:text-slate-400">
                Business Management
              </span>
            </span>
          </button>
        </div>

        <nav className={`flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-2.5 py-4 transition-[align-items] duration-300 ${
          isSidebarExpanded ? "items-stretch" : "items-center"
        }`}>
          {visibleSideNavSections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className={`w-full ${isSidebarExpanded ? "mb-4" : "mb-2.5 last:mb-0"}`}
            >
              <p
                className={`mb-1.5 overflow-hidden whitespace-nowrap px-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 transition-all duration-300 ${
                  isSidebarExpanded ? "max-h-5 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {section.title}
              </p>
              <div className={`flex flex-col ${isSidebarExpanded ? "gap-1.5" : "gap-2"}`}>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSideNavNavigate(item.id)}
                    className={`flex h-11 items-center rounded-xl text-[13px] font-bold transition-all duration-300 ease-in-out active:scale-95 ${
                      isSidebarExpanded
                        ? "w-full justify-start gap-2.5 px-3"
                        : "mx-auto w-11 justify-center gap-0 px-0"
                    } ${
                      activePage === item.id
                        ? "bg-linear-to-b from-[#df4bb4] to-[#c72fb2] text-white shadow-[0_4px_8px_rgba(219,74,181,0.35)]"
                        : "text-neutral-900 hover:bg-pink-50 hover:text-[#c72fb2] dark:text-white dark:hover:bg-[#c72fb2] dark:hover:text-white dark:hover:shadow-none"
                    }`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-5 w-5 shrink-0 ${
                        activePage === item.id ? "brightness-0 invert" : "dark:brightness-0 dark:invert"
                      }`}
                    />
                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                      isSidebarExpanded ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 translate-x-2 opacity-0"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              {!isSidebarExpanded && sectionIndex < visibleSideNavSections.length - 1 && (
                <div className="mx-auto mt-2.5 h-px w-9 bg-neutral-300 dark:bg-neutral-800" />
              )}
            </div>
          ))}
        </nav>

        <div className="relative px-2.5 pb-4">
          <div
            className={`flex h-11 items-center rounded-xl border border-slate-200 bg-white text-neutral-900 transition-all duration-300 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 dark:text-white ${
              isSidebarExpanded
                ? "w-full justify-start gap-2.5 px-2.5"
                : "w-11 justify-center gap-0 px-0"
            }`}
            aria-label="Account preview"
          >
            <UserAvatar user={user} />
            <span className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
              isSidebarExpanded ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 translate-x-2 opacity-0"
            }`}>
              <span className="block max-w-32 truncate text-sm font-extrabold text-[#10172a] dark:text-white">
                {getUserName(user)}
              </span>
              <span className="block text-xs font-semibold capitalize text-slate-500">
                {user?.role || "User"}
              </span>
            </span>
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={toggleSidebar}
        className={`fixed top-7 z-50 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-neutral-900 transition-[left,background-color,color] duration-300 ease-in-out hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 md:grid ${
          isSidebarExpanded ? "left-[186px]" : "left-[78px]"
        }`}
        aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={isSidebarExpanded}
      >
        <img
          src={sidebarIcon}
          alt=""
          className="h-4 w-4 object-contain dark:brightness-0 dark:invert"
          aria-hidden="true"
        />
      </button>

      <main
        className={`px-4 pt-[102px] transition-[margin] duration-300 ease-in-out md:px-5 md:pt-[70px] lg:px-6 ${
          isMessagesPage ? "pb-0" : "pb-28 md:pb-8"
        } ${
          isSidebarExpanded ? "md:ml-[220px]" : "md:ml-[68px]"
        }`}
      >
        <div style={{ zoom: isMessagesPage ? 1 : 0.9 }}>
          {children}
        </div>
      </main>
      <nav className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-2 pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-300 dark:border-[#86003C] dark:bg-[#1A1A1D]/95 dark:shadow-[0_-10px_30px_rgba(0,0,0,0.35)] md:hidden ${
        isSidebarExpanded ? "translate-y-full" : "translate-y-0"
      }`}>
        <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5">
          {mobileNavItems.map((item) => {
            const isActive = activePage === item.id || (activePage === "add-task" && item.id === "tasks");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-black transition ${
                  isActive
                    ? "bg-pink-50 text-[#e11d9c] dark:bg-[#c72fb2] dark:text-white"
                    : "text-slate-500 hover:bg-pink-50 hover:text-[#c72fb2] dark:text-white dark:hover:bg-[#c72fb2] dark:hover:text-white"
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-6 w-6 object-contain dark:brightness-0 dark:invert dark:grayscale-0 dark:opacity-100 ${
                    isActive ? "" : "opacity-70 grayscale"
                  }`}
                />
                <span className="max-w-full truncate px-0.5 leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <ConfirmDialog
        confirmLabel={notificationDeleteAction?.confirmLabel}
        icon="delete"
        isOpen={Boolean(notificationDeleteAction)}
        message={notificationDeleteAction?.message}
        onCancel={closeNotificationDeleteDialog}
        onConfirm={confirmNotificationDeleteAction}
        title={notificationDeleteAction?.title}
      />
    </div>
  );
};

export default MainBars;
