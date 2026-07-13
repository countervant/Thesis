import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import emojiIcon from "../assets/emoji.png";
import heartIcon from "../assets/heart.png";
import insertImageIcon from "../assets/insertimage.png";
import redHeartIcon from "../assets/redheart.png";
import sendIcon from "../assets/send.png";
import { useAuth } from "../context/AuthContext.jsx";
import { authAPI, newsfeedAPI } from "../services/api.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { FeedSkeleton } from "../components/Skeleton.jsx";
import { getCountryFlag } from "../utils/countries.js";

const notificationTargetKey = "clientraNotificationTarget";

const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "💜", "👍", "🎉", "🥹", "💯"];

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getUserName = (user) => {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unknown user";
};

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
  content: post?.content || "",
  media: post?.media || { type: "", url: "", name: "" },
  author: post?.author,
  hearts: Array.isArray(post?.hearts) ? post.hearts : [],
  comments: Array.isArray(post?.comments)
    ? post.comments.map(normalizeComment)
    : [],
  createdAt: post?.createdAt,
});

const toggleUserHeart = (hearts, user) => {
  const userId = getEntityId(user);
  const safeHearts = Array.isArray(hearts) ? hearts : [];
  const hasHearted = safeHearts.some((heart) => getEntityId(heart) === userId);

  if (hasHearted) {
    return safeHearts.filter((heart) => getEntityId(heart) !== userId);
  }

  return [...safeHearts, user];
};

const extractPostHashtags = (post) => {
  const tags = post.content.match(/#[a-z0-9][a-z0-9_-]*/gi) || [];
  return tags.map((tag) =>
    tag
      .slice(1)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const isOnlineMember = (member) =>
  member?.isOnline === true ||
  member?.online === true ||
  String(member?.presence || "").toLowerCase() === "online";

const canShowInOnlineTeam = (member, currentUserId) => {
  const role = String(member?.role || "").toLowerCase();
  const memberId = getEntityId(member);
  if (memberId && memberId === currentUserId) return true;

  return (
    (role === "admin" || role === "employee") &&
    isOnlineMember(member)
  );
};

const Avatar = ({ user, size = "h-10 w-10" }) => (
  <InitialsAvatar user={user} className={size} />
);

const ProfileButton = ({ children, className = "", user }) => {
  const navigate = useNavigate();
  const userId = getEntityId(user);

  return (
    <button
      type="button"
      onClick={() => {
        if (userId) navigate(`/profile/${userId}`);
      }}
      disabled={!userId}
      className={`${className} disabled:cursor-default`}
    >
      {children}
    </button>
  );
};

const HeartIcon = ({ filled }) => (
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

const Newsfeed = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [visibleReplies, setVisibleReplies] = useState({});
  const [openPostMenuId, setOpenPostMenuId] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [focusedTarget, setFocusedTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [showAllTeamMembers, setShowAllTeamMembers] = useState(false);
  const [onlineTeam, setOnlineTeam] = useState([]);
  // Any authenticated account may create a newsfeed post.
  const canPost = Boolean(user);
  const userId = getEntityId(user);

  useEffect(() => {
    const handleNewsfeedSearch = (event) => {
      setSearchTerm(event.detail?.value || "");
    };

    window.addEventListener("clientra:newsfeed-search", handleNewsfeedSearch);
    return () => window.removeEventListener("clientra:newsfeed-search", handleNewsfeedSearch);
  }, []);

  useEffect(() => {
    if (authLoading) return;

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
  }, [authLoading]);

  useEffect(() => {
    if (authLoading || !userId) return undefined;

    let isMounted = true;
    const loadOnlineTeam = async () => {
      try {
        const members = await authAPI.getOnlineTeam();
        if (isMounted) {
          setOnlineTeam(members.filter((member) => canShowInOnlineTeam(member, userId)));
        }
      } catch {
        if (isMounted) {
          setOnlineTeam((currentMembers) =>
            currentMembers.length > 0 ? currentMembers : [user].filter(Boolean)
          );
        }
      }
    };

    loadOnlineTeam();
    const intervalId = window.setInterval(loadOnlineTeam, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [authLoading, user, userId]);

  useEffect(() => {
    const postsMissingMedia = posts.filter(
      (post) => post.media?.type && !post.media?.url
    );

    if (postsMissingMedia.length === 0) return;

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

  useEffect(() => {
    const focusTarget = () => {
      const rawTarget = sessionStorage.getItem(notificationTargetKey);
      if (!rawTarget) return;

      try {
        const target = JSON.parse(rawTarget);
        if (target?.page !== "newsfeed" || !target?.postId) return;

        setVisibleComments((currentVisibility) => ({
          ...currentVisibility,
          [target.postId]: true,
        }));

        if (target.commentId) {
          setVisibleReplies((currentVisibility) => ({
            ...currentVisibility,
            [target.commentId]: Boolean(target.replyId) || currentVisibility[target.commentId],
          }));
        }

        setFocusedTarget(target);

        window.setTimeout(() => {
          const targetId = target.replyId
            ? `newsfeed-reply-${target.replyId}`
            : target.commentId
              ? `newsfeed-comment-${target.commentId}`
              : `newsfeed-post-${target.postId}`;

          document.getElementById(targetId)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          sessionStorage.removeItem(notificationTargetKey);
        }, 160);
      } catch {
        sessionStorage.removeItem(notificationTargetKey);
      }
    };

    if (!isLoading) {
      focusTarget();
    }

    window.addEventListener("clientra:notification-target", focusTarget);
    return () => window.removeEventListener("clientra:notification-target", focusTarget);
  }, [isLoading, posts]);

  const hasAnyPosts = useMemo(() => posts.length > 0, [posts]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visiblePosts = useMemo(() => {
    if (!normalizedSearch) return posts;

    return posts.filter((post) => {
      const authorName = getUserName(post.author);
      const commentText = post.comments
        .flatMap((comment) => [
          getUserName(comment.user),
          comment.user?.email,
          comment.user?.role,
          ...comment.replies.flatMap((reply) => [
            getUserName(reply.user),
            reply.user?.email,
            reply.user?.role,
          ]),
        ])
        .join(" ");

      return [authorName, post.author?.email, post.author?.role, commentText]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [normalizedSearch, posts]);

  const trendingTopics = useMemo(() => {
    const topicCounts = posts.reduce((counts, post) => {
      extractPostHashtags(post).forEach((topic) => {
        counts.set(topic, (counts.get(topic) || 0) + 1);
      });
      return counts;
    }, new Map());

    return Array.from(topicCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
      .slice(0, 5);
  }, [posts]);

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

  const handleInsertEmoji = (emoji) => {
    setPostContent((currentContent) => `${currentContent}${emoji}`.slice(0, 1200));
    setIsEmojiPickerOpen(false);
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

      const updatedPost = await newsfeedAPI.toggleHeart(postId);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
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
      handleCommentChange(postId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));

      const updatedPost = await newsfeedAPI.comment(postId, text);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
      handleCommentChange(postId, text);
      setErrorMessage(error.response?.data?.message || "Unable to add comment.");
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

      const updatedPost = await newsfeedAPI.toggleCommentHeart(postId, commentId);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
      setErrorMessage(error.response?.data?.message || "Unable to update comment heart.");
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

    const optimisticReply = {
      id: `temp-reply-${Date.now()}`,
      text,
      user,
      createdAt: new Date().toISOString(),
    };
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
                    ? { ...comment, replies: [...comment.replies, optimisticReply] }
                    : comment
                ),
              }
            : post
        );
      });
      handleReplyChange(commentId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));
      setVisibleReplies((currentVisibility) => ({
        ...currentVisibility,
        [commentId]: true,
      }));

      const updatedPost = await newsfeedAPI.reply(postId, commentId, text);
      replacePost(updatedPost);
    } catch (error) {
      setPosts(previousPosts);
      handleReplyChange(commentId, text);
      setErrorMessage(error.response?.data?.message || "Unable to add reply.");
    }
  };

  const displayedTeamMembers = showAllTeamMembers ? onlineTeam : onlineTeam.slice(0, 4);
  const updateNewsfeedSearch = (value) => {
    setSearchTerm(value);
    window.dispatchEvent(
      new CustomEvent("clientra:newsfeed-search-set", {
        detail: { value },
      })
    );
  };

  return (
    <div className="-mx-4 -mb-8 -mt-4 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-4 dark:bg-neutral-950 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto grid max-w-[1600px] gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-4">
          <header>
            <h1
              className="text-3xl uppercase leading-none text-neutral-950"
              style={{ fontFamily: "var(--font-bruno)" }}
            >
              <span className="text-[#dc4fb2]">Clientra</span> Newsfeed
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
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
          className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <Avatar user={user} size="h-9 w-9" />
            <textarea
              value={postContent}
              onChange={(event) => setPostContent(event.target.value)}
              placeholder={`What's on your mind, ${user?.firstName || "there"}?`}
              maxLength={1200}
              rows={1}
              className="min-h-10 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white">
                <img
                  src={insertImageIcon}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
                <span>Photo / Video</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="sr-only"
                />
              </label>
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                  <path d="M7 3h7l4 4v14H7zM14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>File</span>
                <input type="file" onChange={handleMediaChange} className="sr-only" />
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
                  className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                  aria-label="Add emoji"
                  aria-expanded={isEmojiPickerOpen}
                >
                  <img src={emojiIcon} alt="" className="h-5 w-5 object-contain" />
                  <span>Emoji</span>
                </button>
                {isEmojiPickerOpen && (
                  <div className="absolute left-0 top-12 z-10 grid w-44 grid-cols-5 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="grid h-8 w-8 place-items-center rounded-md text-lg transition hover:bg-pink-50 dark:hover:!bg-pink-500/20"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {postMedia && (
                <button
                  type="button"
                  onClick={() => setPostMedia(null)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                >
                  Remove Media
                </button>
              )}
              <button
                type="submit"
                disabled={isPosting}
                className="h-9 rounded-lg bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-6 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
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
          Sign in to create a newsfeed post.
        </p>
      )}

      {isLoading && (
        <FeedSkeleton />
      )}

      {!isLoading && !hasAnyPosts && (
        <p className="rounded-lg bg-white px-5 py-8 text-center text-sm font-medium text-neutral-600 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50">
          No posts yet.
        </p>
      )}

      {!isLoading && hasAnyPosts && visiblePosts.length === 0 && (
        <p className="rounded-lg bg-white px-5 py-8 text-center text-sm font-medium text-neutral-600 shadow-[0_2px_6px_rgba(219,39,119,0.18)] ring-1 ring-pink-50">
          No posts match your search.
        </p>
      )}

      {!isLoading &&
        visiblePosts.map((post) => {
          const hasHearted = post.hearts.some((heart) => getEntityId(heart) === userId);
          const areCommentsVisible = visibleComments[post.id] === true;
          const shouldShowComments = areCommentsVisible;
          const canDeletePost =
            user?.role === "admin" || getEntityId(post.author) === userId;
          const isPostMenuOpen = openPostMenuId === post.id;

          return (
            <article
              key={post.id}
              id={`newsfeed-post-${post.id}`}
              className={`rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition ${
                focusedTarget?.postId === post.id
                  ? "ring-2 ring-pink-200"
                  : ""
              }`}
            >
              <div className="relative">
                {canDeletePost && (
                  <div className="absolute right-0 top-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPostMenuId((currentId) =>
                          currentId === post.id ? "" : post.id
                        )
                      }
                      className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
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
                          className="block w-full px-4 py-2 text-left font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:!bg-red-500/20 dark:hover:text-red-100"
                        >
                          Delete post
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 pr-10">
                  <ProfileButton
                    user={post.author}
                    className="rounded-full transition hover:ring-2 hover:ring-[#dc4fb2]"
                  >
                    <Avatar user={post.author} />
                  </ProfileButton>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <ProfileButton
                      user={post.author}
                      className="text-left text-sm font-bold text-neutral-950 transition hover:text-[#c72fb2]"
                    >
                      {getUserName(post.author)}
                    </ProfileButton>
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
                  <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-800">
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

              <div className="mt-3 border-t border-slate-200">
                <div className="flex items-center justify-between gap-4 py-2.5 text-xs font-semibold text-slate-500">
                  <div className="flex min-w-0 items-center gap-2">
                    <HeartIcon filled={post.hearts.length > 0} />
                    <span className="truncate">
                      {post.hearts.length > 0
                        ? hasHearted
                          ? `You${post.hearts.length > 1 ? ` and ${post.hearts.length - 1} others` : ""}`
                          : `${post.hearts.length} Like${post.hearts.length === 1 ? "" : "s"}`
                        : "0"}
                    </span>
                  </div>
                  <div className="flex items-center gap-8">
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="transition hover:text-pink-600"
                    >
                      {post.comments.length} comments
                    </button>
                    <button type="button" className="transition hover:text-pink-600">
                      Share
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleToggleHeart(post.id)}
                    className={`flex h-9 items-center justify-center gap-2 border-r border-slate-200 text-xs font-black transition hover:bg-pink-50 dark:hover:!bg-[#c72fb2] dark:hover:text-white ${hasHearted ? "text-pink-600" : "text-slate-600 dark:text-white"}`}
                    aria-label={hasHearted ? "Remove heart" : "Heart post"}
                  >
                    <HeartIcon filled={hasHearted} />
                    {hasHearted ? "Liked" : "Like"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleComments(post.id)}
                    className="flex h-9 items-center justify-center gap-2 border-r border-slate-200 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path d="M5 6h14v10H9l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Comment
                  </button>
                  <button
                    type="button"
                    className="flex h-9 items-center justify-center gap-2 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path d="M20 12 4 5l3 7-3 7 16-7zM7 12h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Share
                  </button>
                </div>
              </div>

              {shouldShowComments && (
                <div className="mt-4 space-y-3">
                  {post.comments.map((comment) => {
                    const commentId = comment.id || comment._id;
                    const areRepliesVisible = visibleReplies[commentId] === true;
                    const hasHeartedComment = comment.hearts.some(
                      (heart) => getEntityId(heart) === userId
                    );
                    const canDeleteComment =
                      user?.role === "admin" || getEntityId(comment.user) === userId;

                    return (
                      <div
                        key={commentId}
                        id={`newsfeed-comment-${commentId}`}
                        className={`space-y-3 rounded-lg transition ${
                          focusedTarget?.commentId === commentId ? "bg-blue-50/70 p-2" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <ProfileButton
                            user={comment.user}
                            className="rounded-full transition hover:ring-2 hover:ring-[#dc4fb2]"
                          >
                            <Avatar user={comment.user} size="h-8 w-8" />
                          </ProfileButton>
                          <div className="flex-1 px-1 py-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <ProfileButton
                                user={comment.user}
                                className="text-left text-sm font-black text-neutral-900 transition hover:text-[#c72fb2]"
                              >
                                {getUserName(comment.user)}
                              </ProfileButton>
                              <CountryBadge user={comment.user} />
                              <span className="text-[11px] font-medium text-neutral-500">
                                {formatDateTime(comment.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-800">{comment.text}</p>
                            <div className="mt-1 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleCommentHeart(post.id, commentId)}
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
                                onClick={() => toggleReplies(commentId)}
                                className="h-7 rounded-md px-1 text-xs font-bold text-slate-500 transition hover:text-[#c72fb2] dark:text-white dark:hover:text-[#f7a8df]"
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
                                  onClick={() =>
                                    setCommentToDelete({ postId: post.id, commentId })
                                  }
                                  className="h-7 rounded-md px-1 text-xs font-bold text-red-500 transition hover:text-red-600"
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
                                {comment.replies.map((reply) => {
                                  const replyId = reply._id || reply.id;

                                  return (
                                  <div
                                    key={replyId}
                                    id={`newsfeed-reply-${replyId}`}
                                    className={`flex gap-3 rounded-lg transition ${
                                      focusedTarget?.replyId === replyId
                                        ? "bg-blue-50/70 p-2"
                                        : ""
                                    }`}
                                  >
                                    <ProfileButton
                                      user={reply.user}
                                      className="rounded-full transition hover:ring-2 hover:ring-[#dc4fb2]"
                                    >
                                      <Avatar user={reply.user} size="h-7 w-7" />
                                    </ProfileButton>
                                    <div className="flex-1 rounded-lg bg-white px-4 py-3 ring-1 ring-neutral-100">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <ProfileButton
                                          user={reply.user}
                                          className="text-left text-xs font-bold text-neutral-900 transition hover:text-[#c72fb2]"
                                        >
                                          {getUserName(reply.user)}
                                        </ProfileButton>
                                        <CountryBadge user={reply.user} />
                                        <span className="text-[11px] font-medium text-neutral-500">
                                          {formatDateTime(reply.createdAt)}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm text-neutral-800">{reply.text}</p>
                                    </div>
                                  </div>
                                  );
                                })}
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
                className="mt-4 flex items-center gap-3"
              >
                <Avatar user={user} size="h-8 w-8" />
                <label className="relative flex-1">
                  <span className="sr-only">Write a comment</span>
                  <input
                    type="text"
                    value={commentDrafts[post.id] || ""}
                    onChange={(event) => handleCommentChange(post.id, event.target.value)}
                    placeholder="Write a comment..."
                    maxLength={500}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-24 text-sm font-semibold text-neutral-800 outline-none transition placeholder:text-slate-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                  <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3 text-slate-500">
                    <button type="button" className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-pink-50 hover:text-pink-600 dark:hover:!bg-[#c72fb2] dark:hover:text-white" aria-label="Add emoji">
                      <img src={emojiIcon} alt="" className="h-4 w-4 object-contain" />
                    </button>
                    <button type="button" className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-pink-50 hover:text-pink-600 dark:hover:!bg-[#c72fb2] dark:hover:text-white" aria-label="Add image">
                      <img src={insertImageIcon} alt="" className="h-4 w-4 object-contain" />
                    </button>
                    <button type="submit" className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-pink-50 dark:hover:!bg-[#c72fb2]" aria-label="Send comment">
                      <img src={sendIcon} alt="" className="h-4 w-4 object-contain" />
                    </button>
                  </span>
                </label>
              </form>
            </article>
          );
        })}
        </div>

        <aside className="hidden space-y-4 xl:sticky xl:top-20 xl:block xl:self-start xl:pt-[68px]">
          <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-[#a33bea]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="m4 15 5-5 4 4 7-7M17 7h3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Trending Topics
            </h2>
            {trendingTopics.length > 0 && (
              <div className="mt-4 space-y-3">
                {trendingTopics.map((topic) => (
                  <button
                    key={topic.label}
                    type="button"
                    onClick={() => updateNewsfeedSearch(topic.label)}
                    className="flex w-full items-center justify-between gap-4 text-left text-sm font-bold text-[#dc4fb2] transition hover:text-[#a33bea]"
                  >
                    <span># {topic.label}</span>
                    <span className="text-sm font-semibold text-slate-500">
                      {topic.count} {topic.count === 1 ? "post" : "posts"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-[#a33bea]">
              <span className="h-3 w-3 rounded-full bg-[#20bd5a]" />
              Online Team
            </h2>
            {displayedTeamMembers.length > 0 && (
              <div className="mt-4 space-y-3">
                {displayedTeamMembers.map((member) => (
                  <ProfileButton
                    key={getEntityId(member)}
                    user={member}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <Avatar user={member} size="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-[#10172a]">
                        {getUserName(member)}
                      </span>
                      <span className="block truncate text-xs font-semibold capitalize text-slate-500">
                        {member?.role || "User"}
                      </span>
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#20bd5a]" />
                  </ProfileButton>
                ))}
              </div>
            )}
            {onlineTeam.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllTeamMembers((isShowing) => !isShowing)}
                className="mt-4 h-9 w-full rounded-xl border border-[#dc4fb2] text-xs font-bold text-[#dc4fb2] transition hover:bg-pink-50 dark:hover:!bg-[#c72fb2] dark:hover:text-white"
              >
                {showAllTeamMembers ? "Show fewer team members" : "View all team members"}
              </button>
            )}
          </section>
        </aside>
      </div>
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
    </div>
  );
};

export default Newsfeed;
