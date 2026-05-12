import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { FeedSkeleton, ProfileSkeleton } from "../components/Skeleton.jsx";
import companyIcon from "../assets/company.png";
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
  <article className="rounded-lg bg-white p-5 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100">
    <div className="flex items-center gap-4">
      <Avatar user={post.author} size="h-10 w-10" />
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
          className="h-9 rounded-lg px-3 text-sm font-semibold text-neutral-700 transition hover:bg-pink-50 hover:text-[#c72fb2]"
        >
          {isCommentsVisible ? "Hide comments" : "View comments"}
        </button>
      )}
    </div>

    {isCommentsVisible && (
      <div className="mt-4 space-y-4">
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
            <div key={commentId} className="space-y-3">
              <div className="flex gap-3">
                <Avatar user={comment.user} size="h-8 w-8" />
                <div className="flex-1 rounded-lg bg-neutral-50 px-4 py-3">
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
                      className="h-8 rounded-md px-2 text-xs font-semibold text-neutral-600 transition hover:bg-pink-50 hover:text-[#c72fb2]"
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
                        className="h-8 rounded-md px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
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
                    <div className="ml-11 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply._id || reply.id} className="flex gap-3">
                          <Avatar user={reply.user} size="h-7 w-7" />
                          <div className="flex-1 rounded-lg bg-white px-4 py-3 ring-1 ring-neutral-100">
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

    <form onSubmit={onSubmitComment} className="mt-4 flex gap-3">
      <Avatar user={currentUser} size="h-8 w-8" />
      <input
        type="text"
        value={commentDraft}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Write a comment..."
        maxLength={500}
        className="h-10 flex-1 rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
      />
      <button
        type="submit"
        className="h-10 rounded-lg bg-[#dc4fb2] px-4 text-sm font-semibold text-white transition hover:brightness-105"
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

  useEffect(() => {
    let isMounted = true;

    const loadProfilePosts = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const [data, profileData] = await Promise.all([
          newsfeedAPI.getAll(),
          userId ? authAPI.getPublicProfile(userId) : Promise.resolve(null),
        ]);

        if (isMounted) {
          setPosts(Array.isArray(data) ? data.map(normalizePost) : []);
          setDirectProfileUser(profileData);
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
  }, [userId]);

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
        <div className="mx-auto max-w-[980px] space-y-5">

        {errorMessage && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {errorMessage}
          </p>
        )}

        {isLoading && (
          <>
            <section className="rounded-lg bg-white p-6 shadow-[0_3px_8px_rgba(190,65,158,0.25)] ring-1 ring-pink-50">
              <ProfileSkeleton />
            </section>
            <FeedSkeleton />
          </>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h1
                      className="text-3xl uppercase leading-none text-neutral-950"
                      style={{ fontFamily: "var(--font-bruno)" }}
                    >
                      {getUserName(profileUser)}
                    </h1>
                    <CountryBadge user={profileUser} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#c72fb2]">
                    {profileUser.role || "user"}
                  </p>
                  {profileUser.companyName && (
                    <p className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold text-neutral-800">
                      <img src={companyIcon} alt="" className="h-5 w-5 object-contain" />
                      {profileUser.companyName}
                    </p>
                  )}
                  {profileUser.email && (
                    <a
                      href={getEmailComposeUrl(profileUser.email)}
                      target="_blank"
                      rel="noreferrer"
                      className="group mt-3 inline-flex w-fit items-center gap-2 text-sm font-medium text-neutral-600 transition duration-200 hover:-translate-y-0.5 hover:text-[#c72fb2] active:translate-y-0 active:scale-95"
                    >
                      <img
                        src={emailIcon}
                        alt=""
                        className="h-5 w-5 object-contain transition duration-200 group-hover:scale-110 group-hover:rotate-[-6deg] group-active:scale-90"
                      />
                      <span className="transition duration-200 group-hover:translate-x-0.5">
                        {profileUser.email}
                      </span>
                    </a>
                  )}
                  {profileUser.phone && (
                    <a
                      href={`tel:${profileUser.phone}`}
                      className="group mt-2 flex w-fit items-center gap-2 text-sm font-medium text-neutral-600 transition duration-200 hover:-translate-y-0.5 hover:text-[#c72fb2] active:translate-y-0 active:scale-95"
                    >
                      <img
                        src={phoneIcon}
                        alt=""
                        className="h-5 w-5 object-contain transition duration-200 group-hover:scale-110 group-hover:rotate-[-6deg] group-active:scale-90"
                      />
                      <span className="transition duration-200 group-hover:translate-x-0.5">
                        {profileUser.phone}
                      </span>
                    </a>
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
