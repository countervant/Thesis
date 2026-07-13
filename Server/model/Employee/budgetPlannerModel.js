import mongoose from "mongoose";

const budgetPlannerEntrySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true }
);

budgetPlannerEntrySchema.index({ owner: 1, date: -1, createdAt: -1 });

const budgetPlannerSettingsSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    monthlyLimit: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const BudgetPlannerEntry = mongoose.model(
  "BudgetPlannerEntry",
  budgetPlannerEntrySchema
);

export const BudgetPlannerSettings = mongoose.model(
  "BudgetPlannerSettings",
  budgetPlannerSettingsSchema
);
