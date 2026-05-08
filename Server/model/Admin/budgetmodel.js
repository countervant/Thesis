// Server/model/budgetModel.js

import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

budgetSchema.index({ date: -1, createdAt: -1 });

const Budget = mongoose.model("Budget", budgetSchema);

export default Budget;
