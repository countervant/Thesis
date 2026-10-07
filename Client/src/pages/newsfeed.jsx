import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import emojiIcon from "../assets/emoji.png";
import heartIcon from "../assets/heart.png";
import insertImageIcon from "../assets/insertimage.png";
import redHeartIcon from "../assets/redheart.png";
import sendIcon from "../assets/send.png";
import { useAuth } from "../context/AuthContext.jsx";
import { newsfeedAPI } from "../services/api.js";
import ConfirmDialog from "../components/ConfirmDialog/ConfirmDialog.jsx";
import InitialsAvatar from "../components/InitialsAvatar/InitialsAvatar.jsx";
import { FeedSkeleton } from "../components/Skeleton/Skeleton.jsx";
import { getCountryFlag } from "../utils/countries.js";
import { QUERY_KEYS } from "../constants/queryKeys.js";
import {
  useNewsfeedQuery,
  useNewsfeedMutations,
  useOnlineTeamQuery,
} from "../hooks/index.js";
import { unwrapData } from "../utils/queryUtils.js";

const notificationTargetKey = "clientraNotificationTarget";
const NEWSFEED_PAGE_SIZE = 10;
const MAX_POST_MEDIA_BYTES = 8 * 1024 * 1024;
const MAX_POST_MEDIA_NAME_LENGTH = 180;
const POST_MEDIA_TYPES = new Map([
  ["image/avif", "image"],
  ["image/gif", "image"],
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["video/mp4", "video"],
  ["video/ogg", "video"],
  ["video/quicktime", "video"],
  ["video/webm", "video"],
]);
const POST_MEDIA_ACCEPT = Array.from(POST_MEDIA_TYPES.keys()).join(",");

const emojiCategories = [
  {
    label: "Smileys",
    icon: "\u{1F600}",
    emojis: ["\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}", "\u{1F602}", "\u{1F923}", "\u{1F642}", "\u{1F643}", "\u{1F609}", "\u{1F60A}", "\u{1F60D}", "\u{1F618}", "\u{1F61C}", "\u{1F914}", "\u{1F62D}", "\u{1F621}", "\u{1F60E}", "\u{1F92D}", "\u{1F979}", "\u{1F973}", "\u{1F910}", "\u{1F634}"],
  },
  {
    label: "Reactions",
    icon: "\u{1F44D}",
    emojis: ["\u{1F44D}", "\u{1F44E}", "\u{1F44F}", "\u{1F64C}", "\u{1F64F}", "\u{1F44B}", "\u{1F44C}", "\u{1F91D}", "\u{1F4AA}", "\u{1F525}", "\u{1F4AF}", "\u{2728}", "\u{1F31F}", "\u{1F389}", "\u{1F680}", "\u{1F4AF}", "\u{1F525}", "\u{1F3C6}", "\u{1F4A5}", "\u{1F4AF}", "\u{1F91E}", "\u{1F929}", "\u{1F92F}", "\u{1F4AA}"],
  },
  {
    label: "Hearts",
    icon: "\u{2764}\u{FE0F}",
    emojis: ["\u{2764}\u{FE0F}", "\u{1F499}", "\u{1F49A}", "\u{1F49B}", "\u{1F9E1}", "\u{1F5A4}", "\u{1F90D}", "\u{1F90E}", "\u{1F494}", "\u{1F495}", "\u{1F496}", "\u{1F497}", "\u{1F498}", "\u{1F49D}", "\u{1F49E}", "\u{1F493}", "\u{1F49F}", "\u{2763}\u{FE0F}", "\u{1F48B}", "\u{1F970}", "\u{1F60D}", "\u{1F618}", "\u{1F917}", "\u{1F49C}"],
  },
  {
    label: "Objects",
    icon: "\u{1F4A1}",
    emojis: ["\u{1F4A1}", "\u{1F4CC}", "\u{1F4CE}", "\u{1F4F7}", "\u{1F4BB}", "\u{1F4F1}", "\u{1F4AC}", "\u{1F4E2}", "\u{1F4E3}", "\u{1F381}", "\u{1F3A8}", "\u{1F3B5}", "\u{1F3AC}", "\u{1F4DA}", "\u{2705}", "\u{26A0}\u{FE0F}", "\u{1F4C5}", "\u{23F0}", "\u{1F4B0}", "\u{1F4C8}", "\u{1F4C9}", "\u{1F30D}", "\u{2600}\u{FE0F}", "\u{1F31C}"],
  },
];

const EmojiPicker = ({ onSelect }) => {
  const [activeCategory, setActiveCategory] = useState(emojiCategories[0].label);
  const category = emojiCategories.find((item) => item.label === activeCategory) || emojiCategories[0];

  return (
    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] w-auto rounded-xl border border-pink-100 bg-white p-2 shadow-xl sm:static sm:w-72 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-center gap-1 border-b border-pink-50 pb-2 dark:border-neutral-800">
        {emojiCategories.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActiveCategory(item.label)}
            className={`grid h-8 w-8 place-items-center rounded-lg text-base transition ${
              activeCategory === item.label ? "bg-pink-50 ring-1 ring-pink-200" : "hover:bg-pink-50"
            }`}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto pr-1">
        {category.emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="grid h-10 w-10 place-items-center rounded-md text-lg transition hover:bg-pink-50 dark:hover:bg-pink-500/20"
            aria-label={`Add ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

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

const mergePostPreservingMedia = (currentPost, updatedPost) => {
  const normalizedPost = normalizePost(updatedPost);

  return {
    ...currentPost,
    ...normalizedPost,
    media: {
      ...(currentPost?.media || {}),
      ...(normalizedPost.media || {}),
      url: normalizedPost.media?.url || currentPost?.media?.url || "",
    },
  };
};

const mergePostPage = (currentPosts, incomingPosts) => {
  const mergedPosts = [...currentPosts];
  const indexById = new Map(
    mergedPosts.map((post, index) => [post.id, index])
  );

  incomingPosts.forEach((incomingPost) => {
    const normalizedPost = normalizePost(incomingPost);
    if (!normalizedPost.id) return;

    const existingIndex = indexById.get(normalizedPost.id);
    if (existingIndex === undefined) {
      indexById.set(normalizedPost.id, mergedPosts.length);
      mergedPosts.push(normalizedPost);
      return;
    }

    mergedPosts[existingIndex] = mergePostPreservingMedia(
      mergedPosts[existingIndex],
      normalizedPost
    );
  });

  return mergedPosts;
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
  const queryClient = useQueryClient();
  const feedParams = useMemo(() => ({ page: 1, limit: NEWSFEED_PAGE_SIZE }), []);
  const userId = getEntityId(user);
  const canPost = ["admin", "client", "employee"].includes(
    String(user?.role || "").toLowerCase()
  );

  const {
    data: feedData,
    isLoading: isFeedLoading,
    error: feedError,
  } = useNewsfeedQuery(feedParams, { enabled: !authLoading });

  const { data: rawOnlineTeam = [] } = useOnlineTeamQuery({
    enabled: Boolean(!authLoading && userId),
  });

  const onlineTeam = useMemo(() => {
    const members = Array.isArray(rawOnlineTeam) ? rawOnlineTeam : [];
    const filtered = members.filter((member) => canShowInOnlineTeam(member, userId));
    return filtered.length > 0 ? filtered : [user].filter(Boolean);
  }, [rawOnlineTeam, user, userId]);

  const {
    createPost: createPostMutation,
    deletePost: deletePostMutation,
    toggleHeart: toggleHeartMutation,
    addComment: addCommentMutation,
    deleteComment: deleteCommentMutation,
    toggleCommentHeart: toggleCommentHeartMutation,
    replyComment: replyCommentMutation,
  } = useNewsfeedMutations();

  const isPosting = createPostMutation.isPending;

  const [searchTerm, setSearchTerm] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [visibleComments, setVisibleComments] = useState({});
  const [visibleReplies, setVisibleReplies] = useState({});
  const [openPostMenuId, setOpenPostMenuId] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState("");
  const [postToDelete, setPostToDelete] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [focusedTarget, setFocusedTarget] = useState(null);
  const [localErrorMessage, setLocalErrorMessage] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [showAllTeamMembers, setShowAllTeamMembers] = useState(false);
  const focusTimerRef = useRef(null);
  const sharedPostTimerRef = useRef(null);
  const notificationRequestRef = useRef(false);

  const posts = useMemo(() => {
    const list = Array.isArray(feedData?.posts) ? feedData.posts : [];
    return list.map(normalizePost);
  }, [feedData]);

  const isLoading = authLoading || (isFeedLoading && posts.length === 0);
  const errorMessage =
    localErrorMessage ||
    (feedError ? (feedError.response?.data?.message || "Unable to load newsfeed.") : "");
  const setErrorMessage = useCallback((msg) => setLocalErrorMessage(msg), []);

  const updateFeedCache = useCallback((updater) => {
    queryClient.setQueryData(QUERY_KEYS.newsfeed(feedParams), (old) => {
      const current = old && Array.isArray(old.posts) ? old : { posts: [], page: 1, totalPages: 1 };
      return updater(current);
    });
  }, [feedParams, queryClient]);

  const replacePost = useCallback((updatedPost) => {
    const normalizedPost = normalizePost(updatedPost);
    updateFeedCache((old) => ({
      ...old,
      posts: old.posts.map((post) =>
        getEntityId(post) === normalizedPost.id
          ? mergePostPreservingMedia(normalizePost(post), normalizedPost)
          : post
      ),
    }));
  }, [updateFeedCache]);

  useEffect(() => () => {
    if (sharedPostTimerRef.current) window.clearTimeout(sharedPostTimerRef.current);
  }, []);

  useEffect(() => {
    const postsMissingMedia = posts.filter(
      (post) => post.media?.type && !post.media?.url
    );

    if (postsMissingMedia.length === 0) return;

    let isActive = true;

    const loadMissingMedia = async () => {
      const result = await newsfeedAPI.getMediaBatch(
        postsMissingMedia.map((post) => post.id)
      );
      if (!isActive) return;

      const mediaByPostId = new Map(
        Object.entries(result.mediaById).map(([postId, media]) => [
          postId,
          {
            type: media?.type || "",
            url: media?.url || "",
            name: media?.name || "",
          },
        ])
      );

      if (mediaByPostId.size > 0) {
        updateFeedCache((old) => ({
          ...old,
          posts: old.posts.map((post) => {
            const id = getEntityId(post);
            return mediaByPostId.has(id)
              ? { ...post, media: mediaByPostId.get(id) }
              : post;
          }),
        }));
      }

      if (result.failedBatchCount > 0) {
        setErrorMessage("Some post media could not be loaded. Refresh to retry.");
      }
    };

    loadMissingMedia().catch(() => {
      if (!isActive) return;
      setErrorMessage("Post media could not be loaded. Refresh to retry.");
    });

    return () => {
      isActive = false;
    };
  }, [posts, setErrorMessage, updateFeedCache]);

  const focusNotificationTarget = useCallback(async () => {
      const rawTarget = sessionStorage.getItem(notificationTargetKey);
      if (!rawTarget || notificationRequestRef.current) return;

      try {
        const target = JSON.parse(rawTarget);
        if (target?.page !== "newsfeed" || !target?.postId) return;

        let targetPost = posts.find((post) => String(post.id) === String(target.postId));
        if (!targetPost) {
          notificationRequestRef.current = true;
          const fetchedPost = normalizePost(await newsfeedAPI.getById(target.postId, { refresh: true }));
          targetPost = fetchedPost;
          updateFeedCache((old) => ({
            ...old,
            posts: mergePostPage([targetPost], old.posts),
          }));
        }

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

        if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = window.setTimeout(() => {
          const targetId = target.replyId
            ? `newsfeed-reply-${target.replyId}`
            : target.commentId
              ? `newsfeed-comment-${target.commentId}`
              : `newsfeed-post-${target.postId}`;

          const targetElement = document.getElementById(targetId) ||
            document.getElementById(`newsfeed-post-${target.postId}`);
          targetElement?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          if (targetElement) sessionStorage.removeItem(notificationTargetKey);
          focusTimerRef.current = null;
        }, 160);
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Unable to open the selected newsfeed activity.");
      } finally {
        notificationRequestRef.current = false;
      }
  }, [posts, setErrorMessage, updateFeedCache]);

  useEffect(() => {
    const focusTarget = () => {
      focusNotificationTarget();
    };

    if (!isLoading) focusTarget();

    window.addEventListener("clientra:notification-target", focusTarget);
    return () => {
      window.removeEventListener("clientra:notification-target", focusTarget);
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
    };
  }, [focusNotificationTarget, isLoading]);

  useEffect(() => {
    const focusSharedPost = async () => {
      const match = window.location.hash.match(/^#newsfeed-post-([a-f\d]{24})$/i);
      const postId = match?.[1];
      if (!postId || posts.some((post) => String(post.id) === postId)) return;

      try {
        const fetchedPost = normalizePost(await newsfeedAPI.getById(postId, { refresh: true }));
        updateFeedCache((old) => ({
          ...old,
          posts: mergePostPage([fetchedPost], old.posts),
        }));
        if (sharedPostTimerRef.current) window.clearTimeout(sharedPostTimerRef.current);
        sharedPostTimerRef.current = window.setTimeout(() => {
          document.getElementById(`newsfeed-post-${postId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          sharedPostTimerRef.current = null;
        }, 160);
      } catch (error) {
        setErrorMessage(error.response?.data?.message || "Unable to open the shared post.");
      }
    };

    if (!isLoading) focusSharedPost();
  }, [isLoading, posts, setErrorMessage, updateFeedCache]);

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

  const handleLoadMore = async () => {
    if (!hasNextPage || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      setLoadMoreError("");
      const nextPage = currentPage + 1;
      const pageData = await newsfeedAPI.getPage({
        page: nextPage,
        limit: NEWSFEED_PAGE_SIZE,
        refresh: true,
      });

      updateFeedCache((old) => ({
        ...old,
        posts: mergePostPage(old.posts, pageData.posts),
        page: pageData.page,
        totalPages: pageData.totalPages,
      }));
      setCurrentPage(pageData.page);
      setHasNextPage(pageData.page < pageData.totalPages);
    } catch (error) {
      setLoadMoreError(
        error.response?.data?.message || "Unable to load more posts. Try again."
      );
    } finally {
      setIsLoadingMore(false);
    }
  };



  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const mediaType = POST_MEDIA_TYPES.get(file.type.toLowerCase()) || "";

    if (!mediaType) {
      setErrorMessage(
        "Choose a JPEG, PNG, GIF, WebP, AVIF, MP4, WebM, MOV, or Ogg file."
      );
      return;
    }

    if (file.size > MAX_POST_MEDIA_BYTES) {
      setErrorMessage("Media must be 8MB or smaller.");
      return;
    }

    if (file.name.trim().length > MAX_POST_MEDIA_NAME_LENGTH) {
      setErrorMessage("Media file names must be 180 characters or fewer.");
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
    reader.onerror = () => {
      setErrorMessage("Unable to read the selected media file.");
    };
    reader.readAsDataURL(file);
  };

  const handleInsertEmoji = (emoji) => {
    setPostContent((currentContent) => `${currentContent}${emoji}`.slice(0, 1200));
    setIsEmojiPickerOpen(false);
  };

  const handleInsertCommentEmoji = (postId, emoji) => {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: `${currentDrafts[postId] || ""}${emoji}`.slice(0, 500),
    }));
    setEmojiPickerTarget("");
  };

  const handleInsertReplyEmoji = (commentId, emoji) => {
    setReplyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [commentId]: `${currentDrafts[commentId] || ""}${emoji}`.slice(0, 500),
    }));
    setEmojiPickerTarget("");
  };

  const toggleEmojiPicker = (target) => {
    setEmojiPickerTarget((currentTarget) =>
      currentTarget === target ? "" : target
    );
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();

    if (!postContent.trim() && !postMedia?.url) {
      setErrorMessage("Post content or media is required.");
      return;
    }

    try {
      setErrorMessage("");
      const createdPost = await createPostMutation.mutateAsync({
        content: postContent.trim(),
        media: postMedia,
      });
      const normalizedCreated = normalizePost(unwrapData(createdPost));
      updateFeedCache((old) => ({
        ...old,
        posts: [normalizedCreated, ...old.posts.filter((p) => getEntityId(p) !== normalizedCreated.id)],
      }));
      setPostContent("");
      setPostMedia(null);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to create post.");
    }
  };

  const handleToggleHeart = async (postId) => {
    try {
      setErrorMessage("");
      const updatedPost = await toggleHeartMutation.mutateAsync(postId);
      replacePost(unwrapData(updatedPost));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update heart.");
    }
  };

  const handleDeletePost = async (post) => {
    try {
      setErrorMessage("");
      setOpenPostMenuId("");
      await deletePostMutation.mutateAsync(post.id);
      updateFeedCache((old) => ({
        ...old,
        posts: old.posts.filter((currentPost) => getEntityId(currentPost) !== post.id),
      }));
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
      handleCommentChange(postId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));

      const updatedPost = await addCommentMutation.mutateAsync({ postId, text });
      replacePost(unwrapData(updatedPost));
    } catch (error) {
      handleCommentChange(postId, text);
      setErrorMessage(error.response?.data?.message || "Unable to add comment.");
    }
  };

  const handleToggleCommentHeart = async (postId, commentId) => {
    try {
      setErrorMessage("");
      const updatedPost = await toggleCommentHeartMutation.mutateAsync({ postId, commentId });
      replacePost(unwrapData(updatedPost));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update comment heart.");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      setErrorMessage("");
      const updatedPost = await deleteCommentMutation.mutateAsync({ postId, commentId });
      replacePost(unwrapData(updatedPost));
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
      handleReplyChange(commentId, "");
      setVisibleComments((currentVisibility) => ({
        ...currentVisibility,
        [postId]: true,
      }));
      setVisibleReplies((currentVisibility) => ({
        ...currentVisibility,
        [commentId]: true,
      }));

      const updatedPost = await replyCommentMutation.mutateAsync({ postId, commentId, text });
      replacePost(unwrapData(updatedPost));
    } catch (error) {
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
    <div className="-mb-8 -mt-4 min-h-[calc(100dvh-4rem)] bg-[#f8f9fd] px-4 py-4 dark:bg-neutral-950 md:px-5 lg:px-6">
      <div className="mx-auto grid max-w-[1600px] gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-4">
          <header>
            <h1
              className="page-title text-2xl leading-none text-neutral-950 md:text-3xl"
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
          <div className="flex items-start gap-3 px-4 py-4 md:items-center md:px-5">
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5 md:gap-3 md:px-5">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white">
                <img
                  src={insertImageIcon}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
                <span>Photo / Video</span>
                <input
                  type="file"
                  accept={POST_MEDIA_ACCEPT}
                  onChange={handleMediaChange}
                  className="sr-only"
                />
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
                  <div className="absolute bottom-10 left-0 z-20">
                    <EmojiPicker onSelect={handleInsertEmoji} />
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
          You can read, heart, and comment on newsfeed posts.
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
                      className="grid h-11 w-11 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
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
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800 [overflow-wrap:anywhere]">
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
                  <div className="flex shrink-0 items-center gap-3 md:gap-8">
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="transition hover:text-pink-600"
                    >
                      {post.comments.length} comments
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
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
                    className="flex h-9 items-center justify-center gap-2 text-xs font-black text-slate-600 transition hover:bg-pink-50 hover:text-pink-600 dark:text-white dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path d="M5 6h14v10H9l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Comment
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
                            <p className="mt-1 break-words text-sm font-semibold leading-6 text-neutral-800 [overflow-wrap:anywhere]">{comment.text}</p>
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
                              <div className="ml-8 space-y-3 sm:ml-11">
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
                                      <p className="mt-1 break-words text-sm text-neutral-800 [overflow-wrap:anywhere]">{reply.text}</p>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            )}

                            <form
                              onSubmit={(event) => handleAddReply(event, post.id, commentId)}
                              className="ml-8 flex min-w-0 gap-2 sm:ml-11 sm:gap-3"
                            >
                              <Avatar user={user} size="h-7 w-7" />
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={replyDrafts[commentId] || ""}
                                  onChange={(event) =>
                                    handleReplyChange(commentId, event.target.value)
                                  }
                                  placeholder="Reply to this comment..."
                                  maxLength={500}
                                  className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-3 pr-10 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleEmojiPicker(`reply:${commentId}`)}
                                  className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full transition hover:bg-pink-50"
                                  aria-label="Add emoji to reply"
                                >
                                  <img src={emojiIcon} alt="" className="h-4 w-4 object-contain" />
                                </button>
                                {emojiPickerTarget === `reply:${commentId}` && (
                                  <div className="absolute bottom-10 right-0 z-20">
                                    <EmojiPicker onSelect={(emoji) => handleInsertReplyEmoji(commentId, emoji)} />
                                  </div>
                                )}
                              </div>
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
                    <button
                      type="button"
                      onClick={() => toggleEmojiPicker(`comment:${post.id}`)}
                      className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-pink-50 hover:text-pink-600 dark:hover:!bg-[#c72fb2] dark:hover:text-white"
                      aria-label="Add emoji to comment"
                    >
                      <img src={emojiIcon} alt="" className="h-4 w-4 object-contain" />
                    </button>
                    {emojiPickerTarget === `comment:${post.id}` && (
                      <span className="absolute bottom-9 right-0 z-20">
                        <EmojiPicker onSelect={(emoji) => handleInsertCommentEmoji(post.id, emoji)} />
                      </span>
                    )}
                    <span id={`comment-image-unavailable-${post.id}`} className="sr-only">
                      Image attachments are not available for comments.
                    </span>
                    <button
                      type="button"
                      disabled
                      aria-describedby={`comment-image-unavailable-${post.id}`}
                      aria-label="Add image to comment (not available)"
                      title="Image attachments are not available for comments"
                      className="grid h-11 w-11 cursor-not-allowed place-items-center rounded-full opacity-40"
                    >
                      <img src={insertImageIcon} alt="" className="h-4 w-4 object-contain" />
                    </button>
                    <button type="submit" className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-pink-50 dark:hover:!bg-[#c72fb2]" aria-label="Send comment">
                      <img src={sendIcon} alt="" className="h-4 w-4 object-contain" />
                    </button>
                  </span>
                </label>
              </form>
            </article>
          );
        })}
        {!isLoading && (hasNextPage || loadMoreError) && (
          <div className="rounded-2xl border border-pink-100 bg-white p-4 text-center shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            {loadMoreError && (
              <p className="mb-3 text-sm font-semibold text-red-600" role="alert">
                {loadMoreError}
              </p>
            )}
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore || !hasNextPage}
              className="h-10 min-w-36 rounded-xl border border-[#dc4fb2] px-5 text-sm font-black text-[#dc4fb2] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#c72fb2] dark:hover:text-white"
            >
              {isLoadingMore
                ? "Loading..."
                : loadMoreError
                  ? "Retry Load More"
                  : "Load More"}
            </button>
          </div>
        )}
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
