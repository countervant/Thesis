import express from "express";
import NewsfeedPost from "../model/newsfeesModel.js";
import { protect } from "../middleware/protectedjwt.js";

const router = express.Router();
const postAllowedRoles = ["admin", "client"];
const userPublicFields = "firstName lastName companyName email phone country role avatar";

const populatePost = (query) =>
  query
    .populate("author", userPublicFields)
    .populate("hearts", userPublicFields)
    .populate("comments.user", userPublicFields)
    .populate("comments.hearts", userPublicFields)
    .populate("comments.replies.user", userPublicFields)
    .lean();

router.get("/", protect, async (req, res) => {
  try {
    const posts = await populatePost(
      NewsfeedPost.find().sort({ createdAt: -1 })
    );

    res.status(200).json(posts);
  } catch (error) {
    console.error("Get newsfeed error:", error);
    res.status(500).json({ message: "Unable to fetch newsfeed posts" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    if (!postAllowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins and clients can post" });
    }

    const content = req.body.content?.trim() || "";
    const media = req.body.media || {};
    const mediaType = ["image", "video"].includes(media.type) ? media.type : "";
    const mediaUrl = typeof media.url === "string" ? media.url : "";

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: "Post content or media is required" });
    }

    if (content.length > 1200) {
      return res.status(400).json({ message: "Post content must be 1200 characters or fewer" });
    }

    if (mediaUrl && !mediaType) {
      return res.status(400).json({ message: "Media must be an image or video" });
    }

    const post = await NewsfeedPost.create({
      author: req.user._id,
      content,
      media: mediaUrl
        ? {
            type: mediaType,
            url: mediaUrl,
            name: String(media.name || "").slice(0, 180),
          }
        : undefined,
    });
    const createdPost = await populatePost(NewsfeedPost.findById(post._id));

    res.status(201).json(createdPost);
  } catch (error) {
    console.error("Create newsfeed post error:", error);
    res.status(500).json({ message: "Unable to create newsfeed post" });
  }
});

router.patch("/:id/heart", protect, async (req, res) => {
  try {
    const post = await NewsfeedPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = String(req.user._id);
    const hasHearted = post.hearts.some((heart) => String(heart) === userId);

    post.hearts = hasHearted
      ? post.hearts.filter((heart) => String(heart) !== userId)
      : [...post.hearts, req.user._id];

    await post.save();
    const updatedPost = await populatePost(NewsfeedPost.findById(post._id));

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
    const updatedPost = await populatePost(NewsfeedPost.findById(post._id));

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
    const updatedPost = await populatePost(NewsfeedPost.findById(post._id));

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
    const updatedPost = await populatePost(NewsfeedPost.findById(post._id));

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
    const updatedPost = await populatePost(NewsfeedPost.findById(post._id));

    res.status(201).json(updatedPost);
  } catch (error) {
    console.error("Create reply error:", error);
    res.status(500).json({ message: "Unable to add reply" });
  }
});

export default router;
