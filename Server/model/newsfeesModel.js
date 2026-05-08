import mongoose from "mongoose";

const newsfeedReplySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

const newsfeedCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    hearts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replies: [newsfeedReplySchema],
  },
  {
    timestamps: true,
  }
);

const newsfeedPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1200,
    },
    media: {
      type: {
        type: String,
        enum: ["image", "video", ""],
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
      name: {
        type: String,
        default: "",
      },
    },
    hearts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [newsfeedCommentSchema],
  },
  {
    timestamps: true,
  }
);

newsfeedPostSchema.index({ createdAt: -1 });
newsfeedPostSchema.index({ author: 1, createdAt: -1 });

const NewsfeedPost = mongoose.model("NewsfeedPost", newsfeedPostSchema);

export default NewsfeedPost;
