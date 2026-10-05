import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "PHP",
      uppercase: true,
      trim: true,
    },
    paymentType: {
      type: String,
      enum: ["down_payment", "remaining_balance", "full_payment"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    checkoutSessionId: {
      type: String,
      trim: true,
      index: true,
    },
    paymentId: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    checkoutUrl: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ task: 1, createdAt: -1 });
paymentSchema.index({ client: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;

