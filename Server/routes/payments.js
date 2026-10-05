import express from "express";
import mongoose from "mongoose";
import Task from "../models/Admin/taskmodel.js";
import User from "../models/userModel.js";
import Budget from "../models/Admin/budgetmodel.js";
import Payment from "../models/paymentModel.js";
import { protect } from "../middleware/protectedjwt.js";
import * as paymongoService from "../services/paymongo.service.js";

import { deleteCloudinaryAsset } from "../utils/cloudinary.js";

const router = express.Router();

/**
 * Idempotently applies a successful payment to a task, down payment tracking,
 * activity history, watermark removal, and budget income ledger.
 */
const applySuccessfulPaymentToTask = async ({
  payment,
  paymentDetails = {},
}) => {
  if (!payment) return null;

  // Atomic state guard: ensure status transitions from pending only once
  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        paidAt: paymentDetails.paidAt || new Date(),
        paymentId: paymentDetails.paymentId || payment.paymentId,
        paymentMethod: paymentDetails.paymentMethod || payment.paymentMethod || "online_payment",
      },
    },
    { returnDocument: "after" }
  );

  if (!updatedPayment) {
    // Already processed by a concurrent webhook or user redirect verification
    const existingTask = await Task.findById(payment.task)
      .populate("assignedTo", "firstName lastName email role")
      .populate("assignees", "firstName lastName email role")
      .populate("subtasks.assignedTo", "firstName lastName email role")
      .populate("createdBy", "firstName lastName companyName email role")
      .populate("requestedBy", "firstName lastName companyName email role")
      .lean();
    return { alreadyCredited: true, task: existingTask };
  }

  const task = await Task.findById(payment.task);
  if (!task) {
    throw new Error(`Task ${payment.task} not found for credited payment.`);
  }

  // Calculate new paid total clamped to total project amount
  const previousPaid = Number(task.paid) || 0;
  const paymentAmount = Number(payment.amount) || 0;
  let projectTotal = Number(task.amount ?? task.budget ?? 0);

  // If task has no configured amount or budget, adopt payment amount
  if (projectTotal <= 0 && paymentAmount > 0) {
    projectTotal = paymentAmount;
    task.amount = paymentAmount;
  }

  if (payment.paymentType === "full_payment") {
    // Full project payment marks total amount paid
    task.paid = projectTotal > 0 ? projectTotal : paymentAmount;
    if (!task.amount || Number(task.amount) <= 0) {
      task.amount = task.paid;
    }
  } else if (payment.paymentType === "remaining_balance") {
    // Balance payment marks total amount paid
    task.paid = projectTotal > 0 ? projectTotal : (previousPaid + paymentAmount);
    if (!task.amount || Number(task.amount) <= 0) {
      task.amount = task.paid;
    }
  } else {
    // Down payment or incremental milestone payment
    task.paid = previousPaid + paymentAmount;
    if (projectTotal > 0 && task.paid >= projectTotal) {
      task.paid = projectTotal;
    }
  }

  // Ensure task.amount is at least equal to task.paid if task.amount was unset
  if (!task.amount || Number(task.amount) <= 0) {
    task.amount = task.paid;
  }

  // Check if project is now fully paid
  const isFullyPaid = Number(task.amount) > 0 && Number(task.paid) >= Number(task.amount);
  if (isFullyPaid) {
    task.paid = Number(task.amount);
  }

  // If this was a down payment, full payment, or down payment threshold is met, mark it paid
  const downPaymentAmount = Number(task.downPayment?.amount) || 0;
  if (
    payment.paymentType === "down_payment" ||
    isFullyPaid ||
    (downPaymentAmount > 0 && task.paid >= downPaymentAmount)
  ) {
    task.downPayment = {
      ...(task.downPayment?.toObject?.() || task.downPayment || {}),
      amount: downPaymentAmount || (payment.paymentType === "down_payment" ? paymentAmount : 0),
      paidAt: task.downPayment?.paidAt || new Date(),
    };
  }

  // If fully paid, unlock final deliverables and strip watermarked review preview
  let removedPreviewPublicId = "";
  if (isFullyPaid && task.finalOutput && task.finalOutput.watermarked) {
    removedPreviewPublicId = task.finalOutput.previewPublicId || "";
    task.finalOutput.watermarked = false;
    task.finalOutput.previewFileName = undefined;
    task.finalOutput.previewStoredName = undefined;
    task.finalOutput.previewPublicId = undefined;
    task.finalOutput.previewUrl = undefined;
  }

  // Push activity log to task
  const paymentTypeLabels = {
    down_payment: "Down payment",
    remaining_balance: "Remaining balance",
    full_payment: "Full payment",
  };
  const label = paymentTypeLabels[payment.paymentType] || "Payment";

  task.activities.push({
    title: isFullyPaid ? "Project marked as fully paid" : `${label} received`,
    details: `₱${paymentAmount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    })} settled via PayMongo (${paymentDetails.paymentMethod || "online"})${isFullyPaid ? " — Project is now fully paid" : ""}`,
    actorName: "PayMongo Gateway",
    type: payment.paymentType === "down_payment" ? "down_payment_received" : "payment_received",
    createdAt: new Date(),
  });

  await task.save();

  // Clean up watermarked preview files from Cloudinary (best-effort)
  if (removedPreviewPublicId) {
    deleteCloudinaryAsset(removedPreviewPublicId, "image").catch((cleanupError) => {
      console.warn("[payments] Unable to remove watermarked preview file:", cleanupError?.message);
    });
  }

  // Record or update income entry in Budget model
  try {
    const budgetCategory = isFullyPaid ? "Project Income" : "Project Down Payment";
    const budgetDescription = isFullyPaid
      ? `Project payment: ${task.title}`
      : `Project down payment: ${task.title}`;

    await Budget.findOneAndUpdate(
      { sourceTask: task._id },
      {
        $set: {
          type: "income",
          category: budgetCategory,
          amount: Number(task.paid) || paymentAmount,
          description: budgetDescription,
          date: new Date(),
          sourceTask: task._id,
          relatedTask: task._id,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );
  } catch (budgetError) {
    console.error(
      "[payments.applySuccessfulPayment] Failed to record budget entry:",
      budgetError.message
    );
  }

  const populatedTask = await Task.findById(task._id)
    .populate("assignedTo", "firstName lastName email role")
    .populate("assignees", "firstName lastName email role")
    .populate("subtasks.assignedTo", "firstName lastName email role")
    .populate("createdBy", "firstName lastName companyName email role")
    .populate("requestedBy", "firstName lastName companyName email role")
    .lean();

  return { alreadyCredited: false, task: populatedTask };
};

/**
 * Route: POST /api/payments/create-checkout-session
 * Initiates a PayMongo checkout session for a project task.
 */
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const { taskId, paymentType = "full_payment" } = req.body;

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "A valid project task ID is required.",
      });
    }

    const validPaymentTypes = ["down_payment", "remaining_balance", "full_payment"];
    if (!validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment type. Choose one of: ${validPaymentTypes.join(", ")}`,
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Project task not found.",
      });
    }

    // Permission check: admins or the owning client may initiate payment
    const isOwner =
      String(task.requestedBy || "") === String(req.user._id) ||
      String(task.createdBy || "") === String(req.user._id);

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to make payments for this project.",
      });
    }

    // Calculate exact charge amount based on milestone
    let chargeAmount = 0;
    const taskAmount = Number(task.amount) || 0;
    const currentPaid = Number(task.paid) || 0;
    const remainingBalance = Math.max(0, taskAmount - currentPaid);

    if (paymentType === "down_payment") {
      const downPaymentAmount = Number(task.downPayment?.amount) || 0;
      if (downPaymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "This project does not require a down payment.",
        });
      }
      if (task.downPayment?.paidAt || currentPaid >= downPaymentAmount) {
        return res.status(400).json({
          success: false,
          message: "The down payment for this project has already been paid.",
        });
      }
      chargeAmount = downPaymentAmount;
    } else if (paymentType === "remaining_balance") {
      if (remainingBalance <= 0) {
        return res.status(400).json({
          success: false,
          message: "This project has already been fully paid.",
        });
      }
      chargeAmount = remainingBalance;
    } else {
      // full_payment
      if (currentPaid >= taskAmount && taskAmount > 0) {
        return res.status(400).json({
          success: false,
          message: "This project has already been fully paid.",
        });
      }
      chargeAmount = remainingBalance > 0 ? remainingBalance : taskAmount;
    }

    if (chargeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    // Determine client user profile for billing receipt
    let clientUser = req.user;
    if (req.user.role === "admin" && task.requestedBy) {
      const targetClient = await User.findById(task.requestedBy).lean();
      if (targetClient) clientUser = targetClient;
    }

    // Create a pending Payment record in MongoDB
    const paymentRecord = await Payment.create({
      task: task._id,
      client: req.user._id,
      amount: chargeAmount,
      currency: "PHP",
      paymentType,
      status: "pending",
      metadata: {
        taskTitle: task.title,
        clientEmail: clientUser?.email,
      },
    });

    // Create PayMongo checkout session
    const frontendUrl = req.get("origin") || process.env.FRONTEND_URL;
    const sessionResult = await paymongoService.createCheckoutSession({
      taskId: task._id,
      paymentId: paymentRecord._id,
      projectTitle: task.title,
      amount: chargeAmount,
      paymentType,
      clientUser,
      frontendUrl,
    });

    // Attach PayMongo checkout session ID and checkout URL
    paymentRecord.checkoutSessionId = sessionResult.checkoutSessionId;
    paymentRecord.checkoutUrl = sessionResult.checkoutUrl;
    await paymentRecord.save();

    return res.status(201).json({
      success: true,
      message: "Checkout session created successfully.",
      data: {
        checkoutUrl: sessionResult.checkoutUrl,
        checkoutSessionId: sessionResult.checkoutSessionId,
        isSandbox: sessionResult.isSandbox,
        amount: chargeAmount,
        currency: "PHP",
        paymentId: paymentRecord._id,
      },
    });
  } catch (error) {
    console.error("[payments.createCheckoutSession] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment checkout session.",
    });
  }
});

/**
 * Route: POST /api/payments/verify-checkout-session
 * Verifies a checkout session upon redirect from PayMongo and settles payment.
 */
router.post("/verify-checkout-session", protect, async (req, res) => {
  try {
    const { sessionId, taskId, paymentId } = req.body;

    if (!sessionId && !taskId && !paymentId) {
      return res.status(400).json({
        success: false,
        message: "PayMongo session ID, taskId, or paymentId is required.",
      });
    }

    // Find the matching payment record in our ledger
    let payment = null;

    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await Payment.findById(paymentId);
    }

    if (!payment && sessionId && sessionId !== "{CHECKOUT_SESSION_ID}") {
      payment = await Payment.findOne({ checkoutSessionId: sessionId });
    }

    if (!payment && taskId && mongoose.Types.ObjectId.isValid(taskId)) {
      payment = await Payment.findOne({
        task: taskId,
        status: "pending",
      }).sort({ createdAt: -1 });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found for this checkout session.",
      });
    }

    // If already marked paid, return immediately
    if (payment.status === "paid") {
      const task = await Task.findById(payment.task)
        .populate("assignedTo", "firstName lastName email role")
        .populate("assignees", "firstName lastName email role")
        .populate("subtasks.assignedTo", "firstName lastName email role")
        .populate("createdBy", "firstName lastName companyName email role")
        .populate("requestedBy", "firstName lastName companyName email role")
        .lean();
      return res.json({
        success: true,
        message: "Payment has already been confirmed.",
        data: { payment, task },
      });
    }

    // Determine the real PayMongo session ID (must not be literal placeholder)
    const validSessionId =
      payment.checkoutSessionId ||
      (sessionId && sessionId !== "{CHECKOUT_SESSION_ID}" ? sessionId : null);

    if (!validSessionId) {
      return res.status(400).json({
        success: false,
        message: "Valid checkout session identifier could not be determined.",
      });
    }

    // Retrieve the session from PayMongo to confirm payment status
    const session = await paymongoService.getCheckoutSession(validSessionId);

    // PayMongo considers the session paid if attributes.status is 'paid'
    // or if payments array contains at least one payment with status 'paid'
    const paymentsList = session.payments || [];
    const successfulPayment = paymentsList.find(
      (p) => p.attributes?.status === "paid"
    );

    const isPaid = session.status === "paid" || Boolean(successfulPayment);

    if (!isPaid) {
      return res.status(400).json({
        success: false,
        message: `Payment session status is currently: ${session.status || "unpaid"}.`,
        data: { status: session.status },
      });
    }

    const paymentDetails = {
      paymentId: successfulPayment?.id || session.paymentIntent?.id,
      paymentMethod:
        successfulPayment?.attributes?.source?.type || "paymongo_checkout",
      paidAt: successfulPayment?.attributes?.paid_at
        ? new Date(successfulPayment.attributes.paid_at * 1000)
        : new Date(),
    };

    const result = await applySuccessfulPaymentToTask({
      payment,
      paymentDetails,
    });

    const refreshedPayment = await Payment.findById(payment._id);

    return res.json({
      success: true,
      message: "Payment successfully verified and credited.",
      data: {
        payment: refreshedPayment,
        task: result.task,
      },
    });
  } catch (error) {
    console.error("[payments.verifyCheckoutSession] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify checkout session.",
    });
  }
});

/**
 * Route: POST /api/payments/paymongo/webhook
 * Handles incoming webhooks from PayMongo (e.g. checkout_session.payment.paid).
 */
router.post("/paymongo/webhook", async (req, res) => {
  try {
    const signature = req.headers["paymongo-signature"];
    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    const isValid = paymongoService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[payments.webhook] Invalid signature received.");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body?.data?.attributes;
    const eventType = event?.type;
    const resourceData = event?.data;

    console.info(`[payments.webhook] Received PayMongo event: ${eventType}`);

    if (eventType === "checkout_session.payment.paid") {
      const sessionId = resourceData?.id;
      const paymentData = resourceData?.attributes?.payments?.[0];

      if (sessionId) {
        const payment = await Payment.findOne({ checkoutSessionId: sessionId });
        if (payment && payment.status !== "paid") {
          await applySuccessfulPaymentToTask({
            payment,
            paymentDetails: {
              paymentId: paymentData?.id,
              paymentMethod: paymentData?.attributes?.source?.type,
              paidAt: paymentData?.attributes?.paid_at
                ? new Date(paymentData.attributes.paid_at * 1000)
                : new Date(),
            },
          });
          console.info(`[payments.webhook] Credited payment for session ${sessionId}`);
        }
      }
    }

    // PayMongo expects HTTP 200 acknowledge
    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("[payments.webhook] Processing error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Route: GET /api/payments/history/:taskId
 * Retrieves all payment records for a given task.
 */
router.get("/history/:taskId", protect, async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID provided.",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const isOwner =
      String(task.requestedBy || "") === String(req.user._id) ||
      String(task.createdBy || "") === String(req.user._id);

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view payments for this project.",
      });
    }

    const paymentsList = await Payment.find({ task: taskId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: paymentsList,
    });
  } catch (error) {
    console.error("[payments.history] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load payment history.",
    });
  }
});

export default router;
