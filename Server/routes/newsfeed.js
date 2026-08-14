import express from "express";
import mongoose from "mongoose";
import NewsfeedPost from "../model/newsfeesModel.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";
import { withAvatarUrl } from "../utils/avatar.js";
import {
  deleteCloudinaryAsset,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} from "../utils/cloudinary.js";

const router = express.Router();
const userPublicFields = "firstName lastName companyName role updatedAt";
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const MAX_MEDIA_NAME_LENGTH = 180;
const MEDIA_MIME_TYPES = {
  image: new Set([
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  video: new Set([
    "video/mp4",
    "video/ogg",
    "video/quicktime",
    "video/webm",
  ]),
};
const ACTIVE_MEDIA_TYPE_PATTERN = /(?:html|svg|xml)/i;
const isMongoTimeoutError = (error) =>
  error?.name === "MongoNetworkTimeoutError" ||
  error?.name === "MongoNetworkError" ||
  String(error?.message || "").toLowerCase().includes("timed out");
const emptyMedia = { type: "", url: "", name: "" };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hasMediaSignature = (mimeType, buffer) => {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (mimeType === "image/gif") {
    return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  }
  if (mimeType === "image/webp") {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (mimeType === "image/avif") {
    const header = buffer.subarray(0, 32).toString("ascii");
    return buffer.length >= 12 && header.slice(4, 8) === "ftyp" && /(?:avif|avis)/.test(header);
  }
  if (["video/mp4", "video/quicktime"].includes(mimeType)) {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (mimeType === "video/webm") {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (mimeType === "video/ogg") {
    return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS";
  }
  return false;
};

export const validateMediaInput = (media) => {
  if (!media || typeof media !== "object" || Array.isArray(media)) {
    return { media: null };
  }

  const type = typeof media.type === "string" ? media.type.trim().toLowerCase() : "";
  const url = typeof media.url === "string" ? media.url.trim() : "";
  const name = typeof media.name === "string" ? media.name.trim() : "";

  if (!url) {
    return { media: null };
  }

  const allowedMimeTypes = Object.hasOwn(MEDIA_MIME_TYPES, type)
    ? MEDIA_MIME_TYPES[type]
    : null;

  if (!allowedMimeTypes) {
    return { error: "Media must be a supported image or video" };
  }

  if (name.length > MAX_MEDIA_NAME_LENGTH) {
    return { error: `Media name must be ${MAX_MEDIA_NAME_LENGTH} characters or fewer` };
  }

  const dataUrlMatch = /^data:([^;,]+);base64,([a-z0-9+/]*={0,2})$/i.exec(url);
  if (!dataUrlMatch) {
    return { error: "Media must be a base64-encoded data URL" };
  }

  const mimeType = dataUrlMatch[1].trim().toLowerCase();
  if (ACTIVE_MEDIA_TYPE_PATTERN.test(mimeType)) {
    return { error: "SVG, HTML, and XML media are not supported" };
  }

  if (!allowedMimeTypes.has(mimeType)) {
    return { error: `Media data does not match the declared ${type} type` };
  }

  const encodedData = dataUrlMatch[2];
  if (!encodedData || encodedData.length % 4 !== 0) {
    return { error: "Media data is not valid base64" };
  }

  const paddingLength = encodedData.endsWith("==")
    ? 2
    : encodedData.endsWith("=")
      ? 1
      : 0;
  const decodedBytes = (encodedData.length * 3) / 4 - paddingLength;
  if (decodedBytes > MAX_MEDIA_BYTES) {
    return { error: "Media must be 8MB or smaller" };
  }
  const buffer = Buffer.from(encodedData, "base64");
  if (
    buffer.length !== decodedBytes ||
    buffer.toString("base64") !== encodedData ||
    !hasMediaSignature(mimeType, buffer)
  ) {
    return { error: "Media data does not match its declared file type" };
  }

  return {
    media: {
      type,
      url,
      name,
    },
  };
};

const findPostMedia = (postId) =>
  NewsfeedPost.findById(postId)
    .select("media")
    .maxTimeMS(30000)
    .lean();

const findPostMediaWithRetry = async (postId) => {
  try {
    return await findPostMedia(postId);
  } catch (error) {
    if (!isMongoTimeoutError(error)) {
      throw error;
    }

    await wait(750);
    return findPostMedia(postId);
  }
};

const publicNewsfeedUser = (user) => (user ? withAvatarUrl(user) : user);

const withPostAvatarUrls = (post) => ({
  ...post,
  author: publicNewsfeedUser(post.author),
  comments: Array.isArray(post.comments)
    ? post.comments.map((comment) => ({
        ...comment,
        user: publicNewsfeedUser(comment.user),
        replies: Array.isArray(comment.replies)
          ? comment.replies.map((reply) => ({
              ...reply,
              user: publicNewsfeedUser(reply.user),
            }))
          : [],
      }))
    : [],
});

const populatePost = async (query) => {
  const result = await query
    .populate("author", userPublicFields)
    .populate("comments.user", userPublicFields)
    .populate("comments.replies.user", userPublicFields)
    .lean();

  return Array.isArray(result)
    ? result.map(withPostAvatarUrls)
    : result
      ? withPostAvatarUrls(result)
      : result;
};

const withCounts = (post) => ({
  ...post,
  heartCount: post.hearts?.length || 0,
  commentCount: post.comments?.length || 0,
  comments: (post.comments || []).map((comment) => ({
    ...comment,
    heartCount: comment.hearts?.length || 0,
    replyCount: comment.replies?.length || 0,
  })),
});

router.get("/post/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid post" });
    }

    const post = await populatePost(
      NewsfeedPost.findById(req.params.id)
        .select("-media.url")
        .maxTimeMS(8000)
    );
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json(withCounts(post));
  } catch (error) {
    console.error("Get newsfeed post error:", error);
    return res.status(500).json({ message: "Unable to fetch newsfeed post" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
    const hasAuthorFilter = req.query.author !== undefined;
    const author = typeof req.query.author === "string" ? req.query.author.trim() : "";

    if (hasAuthorFilter && (!author || !mongoose.Types.ObjectId.isValid(author))) {
      return res.status(400).json({ message: "Invalid newsfeed author" });
    }

    const filter = author ? { author } : {};
    const [posts, total] = await Promise.all([
      populatePost(
        NewsfeedPost.find(filter)
          .select("-media.url")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .maxTimeMS(8000)
      ),
      NewsfeedPost.countDocuments(filter).maxTimeMS(8000),
    ]);

    res.status(200).json(pagedResponse({
      data: posts.map(withCounts),
      page,
      limit,
      total,
      key: "posts",
    }));
  } catch (error) {
    console.error("Get newsfeed error:", error);
    res.status(500).json({ message: "Unable to fetch newsfeed posts" });
  }
});

router.get("/activity", protect, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const [posts, total] = await Promise.all([
      populatePost(
        NewsfeedPost.find()
          .select("author content hearts comments createdAt updatedAt")
          .sort({ updatedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .maxTimeMS(8000)
      ),
      NewsfeedPost.countDocuments().maxTimeMS(8000),
    ]);

    res.status(200).json(pagedResponse({
      data: posts.map(withCounts),
      page,
      limit,
      total,
      key: "posts",
    }));
  } catch (error) {
    console.error("Get newsfeed activity error:", error);
    res.status(500).json({ message: "Unable to fetch newsfeed activity" });
  }
});

router.post("/media/batch", protect, async (req, res) => {
  try {
    const requestedIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = [...new Set(requestedIds.map((id) => String(id || "").trim()))];

    if (ids.length === 0 || ids.length > 3 || ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: "Provide between 1 and 3 valid post IDs" });
    }

    const posts = await NewsfeedPost.find({ _id: { $in: ids } })
      .select("media")
      .maxTimeMS(8000)
      .lean();
    const storedMediaById = new Map(
      posts.map((post) => [String(post._id), post.media || emptyMedia])
    );
    const mediaById = Object.fromEntries(
      ids.map((id) => [id, storedMediaById.get(id) || emptyMedia])
    );

    return res.status(200).json({ mediaById });
  } catch (error) {
    console.error("Get newsfeed media batch error:", error);
    return res.status(isMongoTimeoutError(error) ? 503 : 500).json({
      message: "Unable to fetch post media",
    });
  }
});

router.get("/:id/media", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid post" });
    }

    const post = await findPostMediaWithRetry(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(post.media || emptyMedia);
  } catch (error) {
    if (isMongoTimeoutError(error)) {
      return res.status(503).json({ message: "Post media is temporarily unavailable" });
    }

    console.error("Get newsfeed media error:", error);
    res.status(500).json({ message: "Unable to fetch post media" });
  }
});

router.get("/:id/comments", protect, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
    const post = await NewsfeedPost.findById(req.params.id)
      .select("comments")
      .populate("comments.user", userPublicFields)
      .populate("comments.replies.user", userPublicFields)
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = (post.comments || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .map((comment) => ({
        ...comment,
        heartCount: comment.hearts?.length || 0,
        replyCount: comment.replies?.length || 0,
      }));

    res.status(200).json(pagedResponse({
      data: comments,
      page,
      limit,
      total: post.comments?.length || 0,
      key: "comments",
    }));
  } catch (error) {
    console.error("Get newsfeed comments error:", error);
    res.status(500).json({ message: "Unable to fetch comments" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const mediaValidation = validateMediaInput(body.media);

    if (mediaValidation.error) {
      return res.status(400).json({ message: mediaValidation.error });
    }

    let media = mediaValidation.media;

    if (media?.url && isCloudinaryConfigured()) {
      try {
        const resourceType = media.type === "video" ? "video" : "image";
        const base64Data = media.url.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const uploadResult = await uploadBufferToCloudinary(buffer, {
          folder: "clientra/newsfeed",
          resourceType,
        });

        media = {
          type: media.type,
          url: uploadResult.secure_url,
          name: media.name,
          publicId: uploadResult.public_id,
        };
      } catch (uploadError) {
        console.error("Newsfeed media Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Unable to upload post media" });
      }
    }

    if (!content && !media) {
      return res.status(400).json({ message: "Post content or media is required" });
    }

    if (content.length > 1200) {
      return res.status(400).json({ message: "Post content must be 1200 characters or fewer" });
    }

    const post = await NewsfeedPost.create({
      author: req.user._id,
      content,
      media: media || undefined,
    });
    const createdPost = await populatePost(
      NewsfeedPost.findById(post._id).select("-media.url")
    );

    res.status(201).json(createdPost);
  } catch (error) {
    console.error("Create newsfeed post error:", error);
    res.status(500).json({ message: "Unable to create newsfeed post" });
  }
});

router.patch("/:id/heart", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid post" });
    }

    const userId = req.user._id;
    const postExists = await NewsfeedPost.findById(req.params.id)
      .select("hearts")
      .lean()
      .maxTimeMS(8000);

    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    const hasHearted = (postExists.hearts || []).some((heart) => String(heart) === String(userId));
    const updateOperator = hasHearted
      ? { $pull: { hearts: userId } }
      : { $addToSet: { hearts: userId } };

    const updatedPost = await populatePost(
      NewsfeedPost.findByIdAndUpdate(req.params.id, updateOperator, { new: true })
        .select("-media.url")
        .maxTimeMS(8000)
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Toggle heart error:", error);
    res.status(500).json({ message: "Unable to update post heart" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await NewsfeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isAuthor = String(post.author) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: "You cannot delete this post" });
    }

    if (post.media?.publicId) {
      const resourceType = post.media.type === "video" ? "video" : "image";
      await deleteCloudinaryAsset(post.media.publicId, resourceType).catch((cleanupError) => {
        console.error("Unable to remove newsfeed post Cloudinary asset:", cleanupError);
      });
    }

    await post.deleteOne();
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: "Unable to delete post" });
  }
});

router.post("/:id/comments", protect, async (req, res) => {
  try {
    const text = req.body.text?.trim();

    if (!text) {
      return res.status(400).json({ message: "Comment is required" });
    }

    if (text.length > 500) {
      return res.status(400).json({ message: "Comment must be 500 characters or fewer" });
    }

    const post = await NewsfeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      user: req.user._id,
      text,
    });

    await post.save();
    const updatedPost = await populatePost(
      NewsfeedPost.findById(post._id).select("-media.url")
    );

    res.status(201).json(updatedPost);
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ message: "Unable to add comment" });
  }
});

router.patch("/:id/comments/:commentId/heart", protect, async (req, res) => {
  try {
    const post = await NewsfeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userId = String(req.user._id);
    const hasHearted = comment.hearts.some((heart) => String(heart) === userId);

    comment.hearts = hasHearted
      ? comment.hearts.filter((heart) => String(heart) !== userId)
      : [...comment.hearts, req.user._id];

    await post.save();
    const updatedPost = await populatePost(
      NewsfeedPost.findById(post._id).select("-media.url")
    );

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Toggle comment heart error:", error);
    res.status(500).json({ message: "Unable to update comment heart" });
  }
});

router.delete("/:id/comments/:commentId", protect, async (req, res) => {
  try {
    const post = await NewsfeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isCommentAuthor = String(comment.user) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isCommentAuthor && !isAdmin) {
      return res.status(403).json({ message: "You cannot delete this comment" });
    }

    comment.deleteOne();
    await post.save();
    const updatedPost = await populatePost(
      NewsfeedPost.findById(post._id).select("-media.url")
    );

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Unable to delete comment" });
  }
});

router.post("/:id/comments/:commentId/replies", protect, async (req, res) => {
  try {
    const text = req.body.text?.trim();

    if (!text) {
      return res.status(400).json({ message: "Reply is required" });
    }

    if (text.length > 500) {
      return res.status(400).json({ message: "Reply must be 500 characters or fewer" });
    }

    const post = await NewsfeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.replies.push({
      user: req.user._id,
      text,
    });

    await post.save();
    const updatedPost = await populatePost(
      NewsfeedPost.findById(post._id).select("-media.url")
    );

    res.status(201).json(updatedPost);
  } catch (error) {
    console.error("Create reply error:", error);
    res.status(500).json({ message: "Unable to add reply" });
  }
});

export default router;
