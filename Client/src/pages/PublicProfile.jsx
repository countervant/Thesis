import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import defaultProfile from "../assets/default-profile.png";
import { useAuth } from "../context/AuthContext.jsx";
import { newsfeedAPI } from "../services/api.js";
import MainBars from "./MainBars.jsx";

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getUserName = (user) => {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unknown user";
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizePost = (post) => ({
  id: post?._id || post?.id || "",
  author: post?.author,
  comments: Array.isArray(post?.comments) ? post.comments : [],
  content: post?.content || "",
  createdAt: post?.createdAt,
  hearts: Array.isArray(post?.hearts) ? post.hearts : [],
  media: post?.media || { type: "", url: "", name: "" },
});

const collectUsers = (posts) => {
  const users = new Map();
  const addUser = (candidate) => {
    const id = getEntityId(candidate);
    if (id && !users.has(id)) users.set(id, candidate);
  };

  posts.forEach((post) => {
    addUser(post.author);
    post.comments.forEach((comment) => {
      addUser(comment.user);
      comment.replies?.forEach((reply) => addUser(reply.user));
    });
  });

  return users;
};

const Avatar = ({ user, size = "h-24 w-24" }) => (
  <img
    src={user?.avatar || defaultProfile}
    alt=""
    onError={(event) => {
      event.currentTarget.src = defaultProfile;
    }}
    className={`${size} shrink-0 rounded-full object-cover`}
  />
);

const HeartIcon = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M12 20.5S4.5 16.1 3 10.4C2.1 7 4.1 4.3 7.2 4.3c1.8 0 3.4 1 4.3 2.5.9-1.5 2.5-2.5 4.3-2.5 3.1 0 5.1 2.7 4.2 6.1-1.5 5.7-9 10.1-9 10.1z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const PostPreview = ({ isCommentsVisible, onToggleComments, post }) => (
  <article className="rounded-lg bg-white p-5 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
    <div className="flex items-center gap-4">
      <Avatar user={post.author} size="h-10 w-10" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-sm font-bold text-neutral-950">
          {getUserName(post.author)}
        </h3>
        <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#c72fb2]">
          {post.author?.role || "user"}
        </span>
        <span className="text-xs font-medium text-neutral-500">
          {formatDateTime(post.createdAt)}
        </span>
      </div>
    </div>

    <div className="mt-3 pl-14">
      {post.content && (
        <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-800">
          {post.content}
        </p>
      )}

      {post.media?.url && (
        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
          {post.media.type === "image" ? (
            <img
              src={post.media.url}
              alt={post.media.name || "Post media"}
              className="max-h-[520px] w-full bg-neutral-50 object-contain"
            />
          ) : (
            <video
              src={post.media.url}
              controls
              className="max-h-[520px] w-full bg-black"
            />
          )}
        </div>
      )}
    </div>

    <div className="mt-4 flex items-center gap-3 border-y border-neutral-100 py-3">
      <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-50 px-3 text-sm font-semibold text-neutral-700">
        <HeartIcon />
        <span>{post.hearts.length}</span>
      </span>
      <span className="text-sm font-medium text-neutral-500">
        {post.comments.length} comments
      </span>
      {post.comments.length > 0 && (
        <button
          type="button"
          onClick={onToggleComments}
          className="h-9 rounded-lg px-3 text-sm font-semibold text-neutral-700 transition hover:bg-pink-50 hover:text-[#c72fb2]"
        >
          {isCommentsVisible ? "Hide comments" : "View comments"}
        </button>
      )}
    </div>

    {isCommentsVisible && (
      <div className="mt-4 space-y-4">
        {post.comments.map((comment) => (
          <div key={comment._id || comment.id} className="flex gap-3">
            <Avatar user={comment.user} size="h-8 w-8" />
            <div className="flex-1 rounded-lg bg-neutral-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-neutral-900">
                  {getUserName(comment.user)}
                </p>
                <span className="text-[11px] font-medium text-neutral-500">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-800">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
    )}

    <div className="mt-4 flex gap-3">
      <Avatar user={null} size="h-8 w-8" />
      <div className="h-10 flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-400">
        Write a comment...
      </div>
      <button
        type="button"
        disabled
        className="h-10 rounded-lg bg-[#dc4fb2] px-4 text-sm font-semibold text-white opacity-80"
      >
        Comment
      </button>
    </div>
  </article>
);

const PublicProfile = () => {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const { logout, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [visibleComments, setVisibleComments] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfilePosts = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await newsfeedAPI.getAll();

        if (isMounted) {
          setPosts(Array.isArray(data) ? data.map(normalizePost) : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.response?.data?.message || "Unable to load profile.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfilePosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const { profileUser, userPosts } = useMemo(() => {
    const users = collectUsers(posts);
    const foundUser = users.get(userId) || null;
    const authoredPosts = posts.filter((post) => getEntityId(post.author) === userId);

    return {
      profileUser: foundUser || authoredPosts[0]?.author || null,
      userPosts: authoredPosts,
    };
  }, [posts, userId]);

  const toggleComments = (postId) => {
    setVisibleComments((currentVisibility) => ({
      ...currentVisibility,
      [postId]: !currentVisibility[postId],
    }));
  };

  const handleNavigate = (page) => {
    const role = user?.role || "client";

    if (role === "admin") {
      navigate(page === "dashboard" ? "/admin/dashboard" : `/admin/dashboard?page=${page}`);
      return;
    }

    navigate(`/${role}/dashboard`, { state: { page } });
  };

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <MainBars
        activePage="newsfeed"
        hideSideNav
        onLogout={() => setIsLogoutDialogOpen(true)}
        onNavigate={handleNavigate}
      >
        <div className="mx-auto max-w-[980px] space-y-5">

        {errorMessage && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {errorMessage}
          </p>
        )}

        {isLoading && (
          <p className="rounded-lg bg-white px-5 py-4 text-sm font-medium text-neutral-700 shadow-[0_2px_6px_rgba(219,39,119,0.18)]">
            Loading profile...
          </p>
        )}

        {!isLoading && !profileUser && (
          <p className="rounded-lg bg-white px-5 py-8 text-center text-sm font-medium text-neutral-600 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50">
            Profile not found.
          </p>
        )}

        {!isLoading && profileUser && (
          <>
            <section className="rounded-lg bg-white p-6 shadow-[0_3px_8px_rgba(190,65,158,0.25)] ring-1 ring-pink-50">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar user={profileUser} />
                <div className="min-w-0">
                  <h1
                    className="text-3xl uppercase leading-none text-neutral-950"
                    style={{ fontFamily: "var(--font-bruno)" }}
                  >
                    {getUserName(profileUser)}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-[#c72fb2]">
                    {profileUser.role || "user"}
                  </p>
                  {profileUser.email && (
                    <p className="mt-1 text-sm font-medium text-neutral-600">
                      {profileUser.email}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold text-neutral-950">
                Newsfeed Posts
              </h2>
              {userPosts.length === 0 ? (
                <p className="rounded-lg bg-white px-5 py-8 text-center text-sm font-medium text-neutral-600 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50">
                  No newsfeed posts yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <PostPreview
                      key={post.id}
                      isCommentsVisible={visibleComments[post.id] === true}
                      onToggleComments={() => toggleComments(post.id)}
                      post={post}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
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

export default PublicProfile;
