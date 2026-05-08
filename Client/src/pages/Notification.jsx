import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import notificationIcon from "../assets/notification.png";
import taskIcon from "../assets/task.png";
import heartIcon from "../assets/heart.png";
import messagesIcon from "../assets/messages.png";
import MainBars from "./MainBars.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { newsfeedAPI, taskAPI } from "../services/api.js";

const dashboardPathByRole = {
  admin: "/admin/dashboard",
  client: "/client/dashboard",
  employee: "/employee/dashboard",
};

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getUserName = (user) => {
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  return `${firstName} ${lastName}`.trim() || user?.email || "Someone";
};

const formatDateTime = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const trimText = (text, fallback) => {
  const value = String(text || "").trim();
  if (!value) return fallback;
  return value.length > 90 ? `${value.slice(0, 87)}...` : value;
};

const buildNewsfeedNotifications = (posts, currentUserId) => {
  const notifications = [];

  posts.forEach((post) => {
    const postId = post?._id || post?.id || "";
    const authorId = getEntityId(post?.author);
    const isOwnPost = authorId === currentUserId;
    const postPreview = trimText(post?.content, "your newsfeed post");

    if (isOwnPost && Array.isArray(post?.hearts)) {
      const heartedBy = post.hearts.filter((actor) => getEntityId(actor) !== currentUserId);

      heartedBy.slice(0, 3).forEach((actor) => {
        notifications.push({
          id: `heart-${postId}-${getEntityId(actor)}`,
          icon: heartIcon,
          title: `${getUserName(actor)} hearted your post`,
          message: postPreview,
          date: post?.updatedAt || post?.createdAt,
          target: "newsfeed",
        });
      });
    }

    (post?.comments || []).forEach((comment) => {
      const commentId = comment?._id || comment?.id || "";
      const commentAuthorId = getEntityId(comment?.user);
      const isOwnComment = commentAuthorId === currentUserId;

      if (isOwnPost && !isOwnComment) {
        notifications.push({
          id: `comment-${postId}-${commentId}`,
          icon: messagesIcon,
          title: `${getUserName(comment.user)} commented on your post`,
          message: trimText(comment?.text, postPreview),
          date: comment?.createdAt,
          target: "newsfeed",
        });
      }

      (comment?.replies || []).forEach((reply) => {
        const replyAuthorId = getEntityId(reply?.user);
        const shouldNotify = replyAuthorId !== currentUserId && (isOwnPost || isOwnComment);

        if (shouldNotify) {
          notifications.push({
            id: `reply-${postId}-${commentId}-${reply?._id || reply?.id}`,
            icon: messagesIcon,
            title: `${getUserName(reply.user)} replied ${isOwnComment ? "to your comment" : "on your post"}`,
            message: trimText(reply?.text, "New reply on newsfeed"),
            date: reply?.createdAt,
            target: "newsfeed",
          });
        }
      });
    });
  });

  return notifications;
};

const buildTaskNotifications = (tasks, user) => {
  const currentUserId = getEntityId(user);

  if (user?.role !== "employee") {
    return [];
  }

  return tasks
    .filter((task) => getEntityId(task?.assignedTo) === currentUserId)
    .map((task) => ({
      id: `task-${task?._id || task?.id}`,
      icon: taskIcon,
      title: "New task assigned to you",
      message: trimText(task?.title, "You have a new task"),
      date: task?.createdAt,
      target: "tasks",
    }));
};

const Notification = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const currentUserId = useMemo(() => getEntityId(user), [user]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [posts, tasks] = await Promise.all([
          newsfeedAPI.getAll(),
          taskAPI.getAll(),
        ]);

        const nextNotifications = [
          ...buildNewsfeedNotifications(Array.isArray(posts) ? posts : [], currentUserId),
          ...buildTaskNotifications(Array.isArray(tasks) ? tasks : [], user),
        ].sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));

        if (isMounted) {
          setNotifications(nextNotifications);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.response?.data?.message || "Unable to load notifications.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, user]);

  const handleNavigate = (page) => {
    const dashboardPath = dashboardPathByRole[user?.role] || "/client/dashboard";

    if (user?.role === "admin") {
      navigate(page === "dashboard" ? dashboardPath : `${dashboardPath}?page=${page}`);
      return;
    }

    navigate(dashboardPath, { state: { page } });
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  const openNotification = (notification) => {
    handleNavigate(notification.target || "newsfeed");
  };

  return (
    <>
      <MainBars
        activePage="notification"
        onLogout={() => setIsLogoutDialogOpen(true)}
        onNavigate={handleNavigate}
      >
        <div className="mx-auto max-w-[1100px]">
          <section className="rounded-lg bg-white px-6 py-6 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
            <div className="flex items-center gap-3">
              <img src={notificationIcon} alt="" className="h-9 w-9 object-contain" />
              <div>
                <h1
                  className="text-3xl uppercase leading-none text-neutral-950"
                  style={{ fontFamily: "var(--font-bruno)" }}
                >
                  Notifications
                </h1>
                <p className="mt-1 text-sm font-medium text-neutral-600">
                  Newsfeed activity and employee task updates.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {isLoading && (
                <div className="rounded-lg border border-pink-100 bg-pink-50 px-4 py-4 text-sm font-medium text-pink-700">
                  Loading notifications...
                </div>
              )}

              {!isLoading && notifications.length === 0 && !errorMessage && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm font-medium text-neutral-600">
                  No notifications yet.
                </div>
              )}

              {!isLoading &&
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className="flex w-full items-start gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-pink-200 hover:bg-pink-50"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white ring-1 ring-pink-100">
                      <img
                        src={notification.icon}
                        alt=""
                        className="h-6 w-6 object-contain"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-neutral-950">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-sm text-neutral-700">
                        {notification.message}
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-neutral-500">
                        {formatDateTime(notification.date)}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          </section>
        </div>
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

export default Notification;
