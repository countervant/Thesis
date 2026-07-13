import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { FeedSkeleton, ProfileSkeleton } from "../components/Skeleton.jsx";
import companyIcon from "../assets/company.png";
import defaultCoverPhoto from "../assets/defaultcoverphoto.png";
import emailIcon from "../assets/email.png";
import heartIcon from "../assets/heart.png";
import phoneIcon from "../assets/phonenumber.png";
import redHeartIcon from "../assets/redheart.png";
import { useAuth } from "../context/AuthContext.jsx";
import { authAPI, newsfeedAPI } from "../services/api.js";
import { getCountryFlag } from "../utils/countries.js";
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

const getEmailComposeUrl = (email) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

const getUserCountry = (user) => user?.country?.trim() || "";

const CountryBadge = ({ user }) => {
  const country = getUserCountry(user);
  const flag = getCountryFlag(country);

  if (!country || !flag) return null;

  return (
    <img
      src={flag}
      alt=""
      aria-label={country}
      className="h-4 w-6 shrink-0 rounded-[2px] object-contain"
      title={country}
    />
  );
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

const formatJoinedDate = (value) => {
  if (!value) return "May 8, 2026";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "May 8, 2026";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeComment = (comment) => ({
  ...comment,
  id: comment?._id || comment?.id || "",
  hearts: Array.isArray(comment?.hearts) ? comment.hearts : [],
  replies: Array.isArray(comment?.replies) ? comment.replies : [],
});

const normalizePost = (post) => ({
  id: post?._id || post?.id || "",
  author: post?.author,
  comments: Array.isArray(post?.comments)
    ? post.comments.map(normalizeComment)
    : [],
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

const toggleUserHeart = (hearts, user) => {
  const userId = getEntityId(user);
  const safeHearts = Array.isArray(hearts) ? hearts : [];
  const hasHearted = safeHearts.some((heart) => getEntityId(heart) === userId);

  if (hasHearted) {
    return safeHearts.filter((heart) => getEntityId(heart) !== userId);
  }

  return [...safeHearts, user];
};

const Avatar = ({ user, size = "h-24 w-24" }) => (
  <InitialsAvatar
    user={user}
    className={size}
    textClassName={size.includes("h-24") ? "text-3xl" : "text-xs"}
  />
);

const ProfileInfoIcon = ({ name }) => {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-4 w-4",
    "aria-hidden": "true",
  };

  if (name === "person") return <svg {...props}><circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c.9-4 3.2-6 7-6s6.1 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "mail") return <svg {...props}><path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (name === "phone") return <svg {...props}><path d="M7 4l3 3-2 2c1.2 2.4 2.8 4 5.2 5.2l2-2 3 3-1.5 3c-.4.8-1.2 1.2-2.1 1C9.6 18.3 5.7 14.4 4.8 9.4c-.2-.9.2-1.7 1-2.1L7 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "location") return <svg {...props}><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" /></svg>;
  if (name === "calendar") return <svg {...props}><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "briefcase") return <svg {...props}><path d="M9 6V4h6v2M4 7h16v12H4zM4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "id") return <svg {...props}><path d="M5 7h14v10H5zM8 11h3M8 14h5M15 11h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "heart") return <svg {...props}><path d="M12 20s-7-4.2-8.5-9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 4c-1.5 4.8-8.5 9-8.5 9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (name === "folder") return <svg {...props}><path d="M4 7h6l2 2h8v10H4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (name === "comment") return <svg {...props}><path d="M5 6h14v10H9l-4 3V6z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "chart") return <svg {...props}><path d="M5 19h14M8 16V9M12 16V5M16 16v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
};

const HeartIcon = ({ filled = false }) => (
  <img
    src={filled ? redHeartIcon : heartIcon}
    alt=""
    className={`h-5 w-5 object-contain transition ${
      filled
        ? "opacity-100"
        : "opacity-80 dark:brightness-0 dark:invert dark:opacity-90"
    }`}
  />
);

const PostPreview = ({
  commentDraft,
  currentUser,
  hasHearted,
  isCommentsVisible,
  onCommentChange,
  onDeleteComment,
  onReplyChange,
  onSubmitComment,
  onSubmitReply,
  onToggleCommentHeart,
  onToggleComments,
  onToggleHeart,
  onToggleReplies,
  post,
  replyDrafts,
  visibleReplies,
}) => (
  <article className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
    <div className="flex items-center gap-3">
      <Avatar user={post.author} size="h-9 w-9" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-sm font-bold text-neutral-950">
          {getUserName(post.author)}
        </h3>
        <CountryBadge user={post.author} />
        <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#c72fb2]">
          {post.author?.role || "user"}
        </span>
        <span className="text-xs font-medium text-neutral-500">
          {formatDateTime(post.createdAt)}
        </span>
      </div>
    </div>

    <div className="mt-3 pl-12">
      {post.content && (
        <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-800">
          {post.content}
        </p>
      )}

      {post.media?.url && (
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
          {post.media.type === "image" ? (
            <img
              src={post.media.url}
              alt={post.media.name || "Post media"}
              className="max-h-[440px] w-full bg-neutral-50 object-contain"
            />
          ) : (
            <video
              src={post.media.url}
              controls
              className="max-h-[440px] w-full bg-black"
            />
          )}
        </div>
      )}
    </div>

    <div className="mt-3 flex items-center gap-3 border-y border-neutral-100 py-2.5">
      <button
        type="button"
        onClick={onToggleHeart}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-neutral-700 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
        aria-label={hasHearted ? "Remove heart" : "Heart post"}
      >
        <HeartIcon filled={hasHearted} />
        <span className="text-neutral-700 dark:text-neutral-300">{post.hearts.length}</span>
      </button>
      <span className="text-sm font-medium text-neutral-500">
        {post.comments.length} comments
      </span>
      {post.comments.length > 0 && (
        <button
          type="button"
          onClick={onToggleComments}
          className="h-9 rounded-lg px-3 text-sm font-semibold text-neutral-700 transition hover:bg-pink-50 hover:text-[#c72fb2] dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
        >
          {isCommentsVisible ? "Hide comments" : "View comments"}
        </button>
      )}
    </div>

    {isCommentsVisible && (
      <div className="mt-3 space-y-3">
        {post.comments.map((comment) => {
          const commentId = comment._id || comment.id;
          const canDeleteComment =
            currentUser?.role === "admin" ||
            getEntityId(comment.user) === getEntityId(currentUser);
          const hasHeartedComment = comment.hearts.some(
            (heart) => getEntityId(heart) === getEntityId(currentUser)
          );
          const areRepliesVisible = visibleReplies[commentId] === true;

          return (
            <div key={commentId} className="space-y-2.5">
              <div className="flex gap-3">
                <Avatar user={comment.user} size="h-8 w-8" />
                <div className="flex-1 rounded-lg bg-neutral-50 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-neutral-900">
                      {getUserName(comment.user)}
                    </p>
                    <CountryBadge user={comment.user} />
                    <span className="text-[11px] font-medium text-neutral-500">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-800">{comment.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleCommentHeart(commentId)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-1 text-xs font-semibold text-neutral-600 transition hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                      aria-label={
                        hasHeartedComment
                          ? "Remove heart from comment"
                          : "Heart comment"
                      }
                    >
                      <HeartIcon filled={hasHeartedComment} />
                      <span className="text-neutral-600 dark:text-neutral-300">{comment.hearts.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleReplies(commentId)}
                      className="h-8 rounded-md px-2 text-xs font-semibold text-neutral-600 transition hover:bg-pink-50 hover:text-[#c72fb2] dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                    >
                      {areRepliesVisible
                        ? "Hide replies"
                        : comment.replies.length > 0
                          ? `View replies (${comment.replies.length})`
                          : "Reply"}
                    </button>
                    {canDeleteComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(commentId)}
                        className="h-8 rounded-md px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:!bg-red-500/20 dark:hover:text-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {areRepliesVisible && (
                <>
                  {comment.replies.length > 0 && (
                    <div className="ml-11 space-y-2.5">
                      {comment.replies.map((reply) => (
                        <div key={reply._id || reply.id} className="flex gap-3">
                          <Avatar user={reply.user} size="h-7 w-7" />
                          <div className="flex-1 rounded-lg bg-white px-3.5 py-2.5 ring-1 ring-neutral-100">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold text-neutral-900">
                                {getUserName(reply.user)}
                              </p>
                              <CountryBadge user={reply.user} />
                              <span className="text-[11px] font-medium text-neutral-500">
                                {formatDateTime(reply.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-neutral-800">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(event) => onSubmitReply(event, commentId)}
                    className="ml-11 flex gap-3"
                  >
                    <Avatar user={currentUser} size="h-7 w-7" />
                    <input
                      type="text"
                      value={replyDrafts[commentId] || ""}
                      onChange={(event) => onReplyChange(commentId, event.target.value)}
                      placeholder="Reply to this comment..."
                      maxLength={500}
                      className="h-9 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                    />
                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-[#dc4fb2] px-3 text-xs font-semibold text-white transition hover:brightness-105"
                    >
                      Reply
                    </button>
                  </form>
                </>
                )}
            </div>
          );
        })}
      </div>
    )}

    <form onSubmit={onSubmitComment} className="mt-3 flex gap-3">
      <Avatar user={currentUser} size="h-8 w-8" />
      <input
        type="text"
        value={commentDraft}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Write a comment..."
        maxLength={500}
        className="h-9 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
      />
      <button
        type="submit"
        className="h-9 rounded-lg bg-[#dc4fb2] px-3 text-xs font-semibold text-white transition hover:brightness-105"
      >
        Comment
      </button>
    </form>
  </article>
);

const PublicProfile = () => {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const { logout, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [directProfileUser, setDirectProfileUser] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [visibleReplies, setVisibleReplies] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState("Newsfeed");

  const loadProfilePosts = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setIsLoading(true);
      setErrorMessage("");
      const [data, profileData] = await Promise.all([
        newsfeedAPI.getAll(),
        userId ? authAPI.getPublicProfile(userId) : Promise.resolve(null),
      ]);

      setPosts(Array.isArray(data) ? data.map(normalizePost) : []);
      setDirectProfileUser(profileData);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to load profile.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    loadProfilePosts().finally(() => {
      if (!isMounted) return;
    });

    return () => {
      isMounted = false;
    };
  }, [loadProfilePosts]);

  useEffect(() => {
    const handleNewsfeedUpdate = () => {
      loadProfilePosts({ showLoading: false });
    };

    window.addEventListener("clientra:newsfeed-updated", handleNewsfeedUpdate);
    return () => window.removeEventListener("clientra:newsfeed-updated", handleNewsfeedUpdate);
  }, [loadProfilePosts]);

  useEffect(() => {
    const postsMissingMedia = posts.filter(
      (post) => post.media?.type && !post.media?.url
    );

    if (postsMissingMedia.length === 0) return undefined;

    let isMounted = true;

    const loadMissingMedia = async () => {
      for (const post of postsMissingMedia) {
        try {
          const media = await newsfeedAPI.getMedia(post.id);

          if (!isMounted) return;

          setPosts((currentPosts) =>
            currentPosts.map((currentPost) =>
              currentPost.id === post.id
                ? {
                    ...currentPost,
                    media: {
                      type: media?.type || "",
                      url: media?.url || "",
                      name: media?.name || "",
                    },
                  }
                : currentPost
            )
          );
        } catch {
          if (!isMounted) return;

          setPosts((currentPosts) =>
            currentPosts.map((currentPost) =>
              currentPost.id === post.id
                ? { ...currentPost, media: { type: "", url: "", name: "" } }
                : currentPost
            )
          );
        }
      }
    };

    loadMissingMedia();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  const { profileUser, userPosts } = useMemo(() => {
    const users = collectUsers(posts);
    const foundUser = users.get(userId) || null;
    const authoredPosts = posts.filter((post) => getEntityId(post.author) === userId);
    const postProfileUser = foundUser || authoredPosts[0]?.author || null;

    return {
      profileUser:
        directProfileUser && postProfileUser
          ? { ...postProfileUser, ...directProfileUser }
          : directProfileUser || postProfileUser,
      userPosts: authoredPosts,
    };
  }, [directProfileUser, posts, userId]);
  const totalLikes = userPosts.reduce((total, post) => total + post.hearts.length, 0);
  const totalComments = userPosts.reduce((total, post) => total + post.comments.length, 0);
  const activeProjects = Math.max(
    0,
    new Set(userPosts.map((post) => post.media?.name || post.content?.slice(0, 18)).filter(Boolean)).size
  );

  const toggleComments = (postId) => {
    setVisibleComments((currentVisibility) => ({
      ...currentVisibility,
      [postId]: !currentVisibility[postId],
    }));
  };

  const replacePost = (updatedPost) => {
    const normalizedPost = normalizePost(updatedPost);
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === normalizedPost.id ? normalizedPost : post
      )
    );
  };

  const handleCommentChange = (postId, value) => {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: value,
    }));
  };

  const handleReplyChange = (commentId, value) => {
    setReplyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [commentId]: value,
    }));
  };

  const toggleReplies = (commentId) => {
    setVisibleReplies((currentVisibility) => ({
      ...currentVisibility,
      [commentId]: !currentVisibility[commentId],
    }));
  };

  const handleToggleHeart = async (postId) => {
    let previousPosts = [];

    try {
      setErrorMessage("");
      setPosts((currentPosts) => {
        previousPosts = currentPosts;
        return currentPosts.map((post) =>
          post.id === postId
            ? { ...post, hearts: toggleUserHeart(post.hearts, user) }
            : post
        );
      });
      newsfeedAPI.updateCachedPost(postId, (post) => ({
        ...post,
        hearts: toggleUserHeart(post.hearts, user),
      }));

      const updatedPost = await newsfeedAPI.toggleHeart(postId);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
      newsfeedAPI.clearCachedPosts();
      setErrorMessage(error.response?.data?.message || "Unable to update heart.");
    }
  };

  const handleToggleCommentHeart = async (postId, commentId) => {
    let previousPosts = [];

    try {
      setErrorMessage("");
      setPosts((currentPosts) => {
        previousPosts = currentPosts;
        return currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map((comment) =>
                  (comment.id || comment._id) === commentId
                    ? { ...comment, hearts: toggleUserHeart(comment.hearts, user) }
                    : comment
                ),
              }
            : post
        );
      });
      newsfeedAPI.updateCachedPost(postId, (post) => ({
        ...post,
        comments: Array.isArray(post.comments)
          ? post.comments.map((comment) =>
              (comment.id || comment._id) === commentId
                ? { ...comment, hearts: toggleUserHeart(comment.hearts, user) }
                : comment
            )
          : [],
      }));

      const updatedPost = await newsfeedAPI.toggleCommentHeart(postId, commentId);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
      newsfeedAPI.clearCachedPosts();
      setErrorMessage(error.response?.data?.message || "Unable to update comment heart.");
    }
  };

  const handleAddComment = async (event, postId) => {
    event.preventDefault();
    const text = commentDrafts[postId]?.trim();

    if (!text) {
      setErrorMessage("Comment is required.");
      return;
    }

    const optimisticComment = normalizeComment({
      id: `temp-comment-${Date.now()}`,
      text,
      user,
      hearts: [],
      replies: [],
      createdAt: new Date().toISOString(),
    });
    let previousPosts = [];

    try {
      setErrorMessage("");
      setPosts((currentPosts) => {
        previousPosts = currentPosts;
        return currentPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, optimisticComment] }
            : post
        );
      });
      newsfeedAPI.updateCachedPost(postId, (post) => ({
        ...post,
        comments: [...(post.comments || []), optimisticComment],
      }));
      handleCommentChange(postId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));

      const updatedPost = await newsfeedAPI.comment(postId, text);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
      newsfeedAPI.updateCachedPost(postId, (post) => ({
        ...post,
        comments: (post.comments || []).filter(
          (comment) => (comment.id || comment._id) !== optimisticComment.id
        ),
      }));
      handleCommentChange(postId, text);
      setErrorMessage(error.response?.data?.message || "Unable to add comment.");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      setErrorMessage("");
      const updatedPost = await newsfeedAPI.deleteComment(postId, commentId);
      replacePost(updatedPost);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete comment.");
    }
  };

  const handleAddReply = async (event, postId, commentId) => {
    event.preventDefault();
    const text = replyDrafts[commentId]?.trim();

    if (!text) {
      setErrorMessage("Reply is required.");
      return;
    }

    try {
      setErrorMessage("");
      const updatedPost = await newsfeedAPI.reply(postId, commentId, text);
      replacePost(updatedPost);
      handleReplyChange(commentId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));
      setVisibleReplies((currentVisibility) => ({
        ...currentVisibility,
        [commentId]: true,
      }));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to add reply.");
    }
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
        <div className="w-full space-y-4">

        {errorMessage && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {errorMessage}
          </p>
        )}

        {isLoading && (
          <>
            <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
              <ProfileSkeleton />
            </section>
            <FeedSkeleton />
          </>
        )}

        {!isLoading && !profileUser && (
          <p className="rounded-2xl border border-pink-100 bg-white px-4 py-6 text-center text-sm font-medium text-neutral-600 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
            Profile not found.
          </p>
        )}

        {!isLoading && profileUser && (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <section className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
                <div className="h-28 bg-pink-50">
                  <img
                    src={profileUser.coverPhoto || defaultCoverPhoto}
                    alt=""
                    className="h-full w-full object-cover"
                    aria-hidden="true"
                  />
                </div>
                <div className="px-4 pb-4 text-center">
                  <div className="relative -mt-11 inline-block">
                    <Avatar user={profileUser} size="h-20 w-20" />
                    <span className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <h1 className="text-xl font-black leading-tight text-[#10142d]">
                      {getUserName(profileUser)}
                    </h1>
                    <CountryBadge user={profileUser} />
                  </div>
                  <span className="mt-2 inline-flex rounded-full bg-pink-50 px-3 py-1 text-[11px] font-black uppercase text-[#c72fb2]">
                    {profileUser.role || "user"}
                  </span>
                  <p className="mt-4 text-sm font-black text-[#10142d]">
                    {profileUser.position || profileUser.companyName || "System Administrator"}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-[210px] text-xs font-medium leading-5 text-slate-500">
                    Managing the system and ensuring everything runs smoothly.
                  </p>

                  <div className="mt-4 space-y-3 border-y border-pink-50 py-4 text-left text-xs font-semibold text-slate-600">
                    <p className="flex items-center gap-3">
                      <img src={companyIcon} alt="" className="h-4 w-4 object-contain" />
                      {profileUser.companyName || "Clientra"}
                    </p>
                    {profileUser.email && (
                      <a
                        href={getEmailComposeUrl(profileUser.email)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 transition hover:text-[#c72fb2]"
                      >
                        <img src={emailIcon} alt="" className="h-4 w-4 object-contain" />
                        {profileUser.email}
                      </a>
                    )}
                    {profileUser.phone && (
                      <a
                        href={`tel:${profileUser.phone}`}
                        className="flex items-center gap-3 transition hover:text-[#c72fb2]"
                      >
                        <img src={phoneIcon} alt="" className="h-4 w-4 object-contain" />
                        {profileUser.phone}
                      </a>
                    )}
                  </div>

                  <div className="mt-4 border-b border-pink-50 pb-4 text-left text-xs font-semibold text-slate-600">
                    <p className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-md border border-slate-200 text-xs text-slate-500">
                        +
                      </span>
                      <span>
                        <span className="block text-slate-500">Joined</span>
                        <span className="font-black text-[#10142d]">
                          {formatJoinedDate(profileUser.createdAt)}
                        </span>
                      </span>
                    </p>
                  </div>

                  {getEntityId(profileUser) === getEntityId(user) && (
                    <button
                      type="button"
                      onClick={() => handleNavigate("profile")}
                      className="mt-4 h-9 w-full rounded-lg border border-[#c72fb2] text-xs font-black text-[#c72fb2] transition hover:bg-pink-50 dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
                <h2 className="mb-3 text-sm font-black text-[#10142d]">
                  Profile Overview
                </h2>
                {[
                  ["Posts", userPosts.length],
                  [
                    "Likes Received",
                    userPosts.reduce((total, post) => total + post.hearts.length, 0),
                  ],
                  [
                    "Comments",
                    userPosts.reduce((total, post) => total + post.comments.length, 0),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-pink-50 py-2.5 last:border-b-0"
                  >
                    <span className="text-sm font-semibold text-slate-600">
                      {label}
                    </span>
                    <span className="text-sm font-black text-[#10142d]">{value}</span>
                  </div>
                ))}
              </section>
            </aside>

            <section className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
              <div className="flex border-b border-pink-50 px-5">
                {["Newsfeed", "About"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveProfileTab(tab)}
                    className={`h-12 px-5 text-sm font-black ${
                      activeProfileTab === tab
                        ? "border-b-2 border-[#c72fb2] text-[#c72fb2]"
                        : "text-slate-500 hover:text-[#c72fb2]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeProfileTab === "Newsfeed" ? (
                  <>
                    <h2 className="mb-4 text-base font-black text-[#10142d]">
                      Newsfeed Posts
                    </h2>
                    {userPosts.length === 0 ? (
                      <p className="rounded-2xl border border-pink-100 bg-white px-4 py-6 text-center text-sm font-medium text-neutral-600 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-100/70">
                        No newsfeed posts yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {userPosts.map((post) => {
                          const hasHearted = post.hearts.some(
                            (heart) => getEntityId(heart) === getEntityId(user)
                          );

                          return (
                            <PostPreview
                              key={post.id}
                              commentDraft={commentDrafts[post.id] || ""}
                              currentUser={user}
                              hasHearted={hasHearted}
                              isCommentsVisible={visibleComments[post.id] === true}
                              onCommentChange={(value) => handleCommentChange(post.id, value)}
                              onDeleteComment={(commentId) =>
                                setCommentToDelete({ postId: post.id, commentId })
                              }
                              onReplyChange={handleReplyChange}
                              onSubmitComment={(event) => handleAddComment(event, post.id)}
                              onSubmitReply={(event, commentId) =>
                                handleAddReply(event, post.id, commentId)
                              }
                              onToggleCommentHeart={(commentId) =>
                                handleToggleCommentHeart(post.id, commentId)
                              }
                              onToggleComments={() => toggleComments(post.id)}
                              onToggleHeart={() => handleToggleHeart(post.id)}
                              onToggleReplies={toggleReplies}
                              post={post}
                              replyDrafts={replyDrafts}
                              visibleReplies={visibleReplies}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                      <h2 className="mb-4 text-sm font-black text-[#10142d]">
                        Personal Information
                      </h2>
                      {[
                        ["Full Name", getUserName(profileUser)],
                        ["Email", profileUser.email || "No email provided"],
                        ["Phone", profileUser.phone || "No phone provided"],
                        ["Address", getUserCountry(profileUser) || "Manila, Philippines"],
                        ["Birthday", "February 14, 2001"],
                        ["Gender", "Male"],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[92px_minmax(0,1fr)] items-center border-b border-pink-50 py-2.5 last:border-b-0 sm:grid-cols-[130px_minmax(0,1fr)]">
                          <span className="text-xs font-black text-[#243154]">{label}</span>
                          <span className="truncate text-xs font-bold text-[#10142d]">{value}</span>
                        </div>
                      ))}
                    </section>

                    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                      <h2 className="mb-4 text-sm font-black text-[#10142d]">
                        Work Information
                      </h2>
                      {[
                        ["Employee ID", getEntityId(profileUser).slice(-8).toUpperCase() || "EMP-000123"],
                        ["Department", profileUser.companyName || "IT Department"],
                        ["Position", profileUser.position || "System Administrator"],
                        ["Join Date", formatJoinedDate(profileUser.createdAt)],
                        ["Work Status", "Full-time"],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[98px_minmax(0,1fr)] items-center border-b border-pink-50 py-2.5 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)]">
                          <span className="text-xs font-black text-[#243154]">{label}</span>
                          {label === "Work Status" ? (
                            <span className="w-fit rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-500">
                              {value}
                            </span>
                          ) : (
                            <span className="truncate text-xs font-bold text-[#10142d]">{value}</span>
                          )}
                        </div>
                      ))}
                    </section>

                    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                      <h2 className="mb-4 text-sm font-black text-[#10142d]">
                        Skills & Expertise
                      </h2>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          "UI/UX Design",
                          "React",
                          "JavaScript",
                          "System Management",
                          "Database Management",
                          "Problem Solving",
                          "Communication",
                          "Leadership",
                          "Teamwork",
                        ].map((skill) => (
                          <span key={skill} className="rounded-full bg-pink-50 px-4 py-2 text-[11px] font-black text-[#c72fb2]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                      <h2 className="mb-4 text-sm font-black text-[#10142d]">
                        Profile Statistics
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["Posts", userPosts.length, "Total posts made"],
                          ["Likes Received", totalLikes, "Total likes received"],
                          ["Projects", activeProjects, "Active projects"],
                          ["Comments", totalComments, "Total comments"],
                        ].map(([label, value, description]) => (
                          <div key={label} className="rounded-xl bg-linear-to-br from-pink-50 to-pink-50/70 p-3">
                            <span>
                              <span className="block text-xl font-black text-[#10142d]">{value}</span>
                              <span className="block text-xs font-black text-[#10142d]">{label}</span>
                              <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{description}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </section>
          </div>
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
      <ConfirmDialog
        confirmLabel="Yes , delete"
        icon="delete"
        isOpen={Boolean(commentToDelete)}
        message="Are you sure you want to delete this comment?"
        onCancel={() => setCommentToDelete(null)}
        onConfirm={async () => {
          const comment = commentToDelete;
          setCommentToDelete(null);
          if (comment) await handleDeleteComment(comment.postId, comment.commentId);
        }}
        title="Delete Comment"
      />
    </>
  );
};

export default PublicProfile;
