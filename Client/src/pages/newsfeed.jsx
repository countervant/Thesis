import { useEffect, useMemo, useState } from "react";
import defaultProfile from "../assets/default-profile.png";
import { useAuth } from "../context/AuthContext.jsx";
import { newsfeedAPI } from "../services/api.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

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

const normalizeComment = (comment) => ({
  ...comment,
  id: comment?._id || comment?.id || "",
  hearts: Array.isArray(comment?.hearts) ? comment.hearts : [],
  replies: Array.isArray(comment?.replies) ? comment.replies : [],
});

const normalizePost = (post) => ({
  id: post?._id || post?.id || "",
  content: post?.content || "",
  media: post?.media || { type: "", url: "", name: "" },
  author: post?.author,
  hearts: Array.isArray(post?.hearts) ? post.hearts : [],
  comments: Array.isArray(post?.comments)
    ? post.comments.map(normalizeComment)
    : [],
  createdAt: post?.createdAt,
});

const Avatar = ({ user, size = "h-10 w-10" }) => (
  <img
    src={user?.avatar || defaultProfile}
    alt=""
    onError={(event) => {
      event.currentTarget.src = defaultProfile;
    }}
    className={`${size} shrink-0 rounded-full object-cover`}
  />
);

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M12 20.5S4.5 16.1 3 10.4C2.1 7 4.1 4.3 7.2 4.3c1.8 0 3.4 1 4.3 2.5.9-1.5 2.5-2.5 4.3-2.5 3.1 0 5.1 2.7 4.2 6.1-1.5 5.7-9 10.1-9 10.1z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const Newsfeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [visibleReplies, setVisibleReplies] = useState({});
  const [openPostMenuId, setOpenPostMenuId] = useState("");
  const [postToDelete, setPostToDelete] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const canPost = user?.role === "admin" || user?.role === "client";
  const userId = getEntityId(user);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await newsfeedAPI.getAll();

        if (isMounted) {
          setPosts(Array.isArray(data) ? data.map(normalizePost) : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.response?.data?.message || "Unable to load newsfeed.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasAnyPosts = useMemo(() => posts.length > 0, [posts]);

  const replacePost = (updatedPost) => {
    const normalizedPost = normalizePost(updatedPost);
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === normalizedPost.id ? normalizedPost : post
      )
    );
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const mediaType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : "";

    if (!mediaType) {
      setErrorMessage("Please choose an image or video file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Media must be 8MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPostMedia({
        type: mediaType,
        url: String(reader.result || ""),
        name: file.name,
      });
      setErrorMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();

    if (!postContent.trim() && !postMedia?.url) {
      setErrorMessage("Post content or media is required.");
      return;
    }

    try {
      setIsPosting(true);
      setErrorMessage("");
      const createdPost = await newsfeedAPI.create({
        content: postContent.trim(),
        media: postMedia,
      });
      setPosts((currentPosts) => [normalizePost(createdPost), ...currentPosts]);
      setPostContent("");
      setPostMedia(null);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to create post.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleHeart = async (postId) => {
    try {
      setErrorMessage("");
      const updatedPost = await newsfeedAPI.toggleHeart(postId);
      replacePost(updatedPost);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update heart.");
    }
  };

  const handleDeletePost = async (post) => {
    try {
      setErrorMessage("");
      setOpenPostMenuId("");
      await newsfeedAPI.delete(post.id);
      setPosts((currentPosts) =>
        currentPosts.filter((currentPost) => currentPost.id !== post.id)
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to delete post.");
    }
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

  const toggleComments = (postId) => {
    setVisibleComments((currentVisibility) => ({
      ...currentVisibility,
      [postId]: !currentVisibility[postId],
    }));
  };

  const toggleReplies = (commentId) => {
    setVisibleReplies((currentVisibility) => ({
      ...currentVisibility,
      [commentId]: !currentVisibility[commentId],
    }));
  };

  const handleAddComment = async (event, postId) => {
    event.preventDefault();
    const text = commentDrafts[postId]?.trim();

    if (!text) {
      setErrorMessage("Comment is required.");
      return;
    }

    try {
      setErrorMessage("");
      const updatedPost = await newsfeedAPI.comment(postId, text);
      replacePost(updatedPost);
      handleCommentChange(postId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to add comment.");
    }
  };

  const handleToggleCommentHeart = async (postId, commentId) => {
    try {
      setErrorMessage("");
      const updatedPost = await newsfeedAPI.toggleCommentHeart(postId, commentId);
      replacePost(updatedPost);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update comment heart.");
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

  return (
    <div className="mx-auto max-w-[980px] space-y-5">
      <header>
        <h1
          className="text-3xl uppercase leading-none text-neutral-950"
          style={{ fontFamily: "var(--font-bruno)" }}
        >
          Clientra Newsfeed 
        </h1>
        <p className="mt-2 text-xs font-medium text-neutral-600">
          Share updates, react to posts, and discuss with the team.
        </p>
      </header>

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {errorMessage}
        </p>
      )}

      {canPost && (
        <form
          onSubmit={handleCreatePost}
          className="rounded-lg bg-white p-5 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100"
        >
          <div className="flex gap-4">
            <Avatar user={user} />
            <textarea
              value={postContent}
              onChange={(event) => setPostContent(event.target.value)}
              placeholder="Write a newsfeed post..."
              maxLength={1200}
              rows={4}
              className="min-h-28 flex-1 resize-none rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-neutral-500">
                {postContent.length}/1200
              </span>
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 transition hover:bg-pink-50 hover:text-[#c72fb2]">
                Add Media
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              {postMedia && (
                <button
                  type="button"
                  onClick={() => setPostMedia(null)}
                  className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Remove Media
                </button>
              )}
              <button
                type="submit"
                disabled={isPosting}
                className="h-10 rounded-lg bg-linear-to-r from-[#8424d2] to-[#e347b3] px-6 text-sm font-semibold text-white shadow-[0_3px_8px_rgba(126,34,206,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPosting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
          {postMedia && (
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
              {postMedia.type === "image" ? (
                <img src={postMedia.url} alt={postMedia.name} className="max-h-[360px] w-full object-contain bg-neutral-50" />
              ) : (
                <video src={postMedia.url} controls className="max-h-[360px] w-full bg-black" />
              )}
            </div>
          )}
        </form>
      )}

      {!canPost && (
        <p className="rounded-lg bg-white px-5 py-4 text-sm font-medium text-neutral-600 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50">
          You can read, heart, and comment on newsfeed posts.
        </p>
      )}

      {isLoading && (
        <p className="rounded-lg bg-white px-5 py-4 text-sm font-medium text-neutral-700 shadow-[0_2px_6px_rgba(219,39,119,0.18)]">
          Loading newsfeed...
        </p>
      )}

      {!isLoading && !hasAnyPosts && (
        <p className="rounded-lg bg-white px-5 py-8 text-center text-sm font-medium text-neutral-600 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50">
          No posts yet.
        </p>
      )}

      {!isLoading &&
        posts.map((post) => {
          const hasHearted = post.hearts.some((heart) => getEntityId(heart) === userId);
          const areCommentsVisible = visibleComments[post.id] === true;
          const canDeletePost =
            user?.role === "admin" || getEntityId(post.author) === userId;
          const isPostMenuOpen = openPostMenuId === post.id;

          return (
            <article
              key={post.id}
              className="rounded-lg bg-white p-5 shadow-[0_2px_6px_rgba(219,39,119,0.25)] ring-1 ring-pink-100"
            >
              <div className="relative flex gap-4">
                {canDeletePost && (
                  <div className="absolute right-0 top-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPostMenuId((currentId) =>
                          currentId === post.id ? "" : post.id
                        )
                      }
                      className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
                      aria-label="Post options"
                      aria-expanded={isPostMenuOpen}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <circle cx="12" cy="5" r="1.8" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                        <circle cx="12" cy="19" r="1.8" fill="currentColor" />
                      </svg>
                    </button>

                    {isPostMenuOpen && (
                      <div className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-2 text-sm shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenPostMenuId("");
                            setPostToDelete(post);
                          }}
                          className="block w-full px-4 py-2 text-left font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete post
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <Avatar user={post.author} />
                <div className="min-w-0 flex-1 pr-10">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="text-sm font-bold text-neutral-950">
                      {getUserName(post.author)}
                    </h2>
                    <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#c72fb2]">
                      {post.author?.role || "user"}
                    </span>
                    <span className="text-xs font-medium text-neutral-500">
                      {formatDateTime(post.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-800">
                    {post.content}
                  </p>
                  {post.media?.url && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
                      {post.media.type === "image" ? (
                        <img
                          src={post.media.url}
                          alt={post.media.name || "Post media"}
                          className="max-h-[520px] w-full object-contain bg-neutral-50"
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
              </div>

              <div className="mt-4 flex items-center gap-3 border-y border-neutral-100 py-3">
                <button
                  type="button"
                  onClick={() => handleToggleHeart(post.id)}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                    hasHearted
                      ? "bg-pink-100 text-[#c72fb2]"
                      : "bg-neutral-50 text-neutral-700 hover:bg-pink-50 hover:text-[#c72fb2]"
                  }`}
                  aria-label={hasHearted ? "Remove heart" : "Heart post"}
                >
                  <HeartIcon filled={hasHearted} />
                  <span>{post.hearts.length}</span>
                </button>
                <span className="text-sm font-medium text-neutral-500">
                  {post.comments.length} comments
                </span>
                {post.comments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleComments(post.id)}
                    className="h-9 rounded-lg px-3 text-sm font-semibold text-neutral-700 transition hover:bg-pink-50 hover:text-[#c72fb2]"
                  >
                    {areCommentsVisible ? "Hide comments" : "View comments"}
                  </button>
                )}
              </div>

              {areCommentsVisible && (
                <div className="mt-4 space-y-4">
                  {post.comments.map((comment) => {
                    const commentId = comment.id || comment._id;
                    const areRepliesVisible = visibleReplies[commentId] === true;
                    const hasHeartedComment = comment.hearts.some(
                      (heart) => getEntityId(heart) === userId
                    );

                    return (
                      <div key={commentId} className="space-y-3">
                        <div className="flex gap-3">
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
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleCommentHeart(post.id, commentId)}
                                className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold transition ${
                                  hasHeartedComment
                                    ? "bg-pink-100 text-[#c72fb2]"
                                    : "text-neutral-600 hover:bg-pink-50 hover:text-[#c72fb2]"
                                }`}
                                aria-label={
                                  hasHeartedComment
                                    ? "Remove heart from comment"
                                    : "Heart comment"
                                }
                              >
                                <HeartIcon filled={hasHeartedComment} />
                                <span>{comment.hearts.length}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleReplies(commentId)}
                                className="h-8 rounded-md px-2 text-xs font-semibold text-neutral-600 transition hover:bg-pink-50 hover:text-[#c72fb2]"
                              >
                                {areRepliesVisible
                                  ? "Hide replies"
                                  : comment.replies.length > 0
                                    ? `View replies (${comment.replies.length})`
                                    : "Reply"}
                              </button>
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
                              onSubmit={(event) => handleAddReply(event, post.id, commentId)}
                              className="ml-11 flex gap-3"
                            >
                              <Avatar user={user} size="h-7 w-7" />
                              <input
                                type="text"
                                value={replyDrafts[commentId] || ""}
                                onChange={(event) =>
                                  handleReplyChange(commentId, event.target.value)
                                }
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

              <form
                onSubmit={(event) => handleAddComment(event, post.id)}
                className="mt-4 flex gap-3"
              >
                <Avatar user={user} size="h-8 w-8" />
                <input
                  type="text"
                  value={commentDrafts[post.id] || ""}
                  onChange={(event) => handleCommentChange(post.id, event.target.value)}
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
        })}
      <ConfirmDialog
        confirmLabel="Yes , delete"
        icon="delete"
        isOpen={Boolean(postToDelete)}
        message="Delete this post?"
        onCancel={() => setPostToDelete(null)}
        onConfirm={async () => {
          const post = postToDelete;
          setPostToDelete(null);
          if (post) await handleDeletePost(post);
        }}
        title="Delete"
      />
    </div>
  );
};

export default Newsfeed;
