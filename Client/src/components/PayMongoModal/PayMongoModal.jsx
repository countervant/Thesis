import { useState, useMemo } from "react";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import { paymentAPI } from "../../services/api.js";

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PayMongoModal({
  isOpen,
  onClose,
  task,
  onPaymentInitiated,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const totalAmount = Number(task?.amount || 0);
  const currentPaid = Number(task?.paid || 0);
  const remainingBalance = Math.max(0, totalAmount - currentPaid);
  const downPaymentAmount = Number(task?.downPayment?.amount || 0);
  const isDownPaymentPending =
    downPaymentAmount > 0 &&
    currentPaid < downPaymentAmount &&
    !task?.downPayment?.paidAt;

  // Determine available payment milestone options
  const paymentOptions = useMemo(() => {
    const opts = [];

    if (isDownPaymentPending) {
      opts.push({
        id: "down_payment",
        label: "Required Down Payment",
        subtitle: "Initial commitment required before project kickoff",
        amount: downPaymentAmount,
      });
    }

    if (currentPaid > 0 && remainingBalance > 0) {
      opts.push({
        id: "remaining_balance",
        label: "Remaining Project Balance",
        subtitle: "Final payment to unlock unwatermarked deliverables",
        amount: remainingBalance,
      });
    } else if (remainingBalance > 0 && !isDownPaymentPending) {
      opts.push({
        id: "full_payment",
        label: "Full Project Payment",
        subtitle: "Complete payment for all deliverables",
        amount: remainingBalance,
      });
    }

    return opts;
  }, [isDownPaymentPending, downPaymentAmount, currentPaid, remainingBalance]);

  const activeOption = paymentOptions[0] || null;

  const isInvalidAmount = Boolean(activeOption && (activeOption.amount || 0) <= 0);

  const handlePay = async () => {
    const taskId = task?._id || task?.id;
    if (!taskId || !activeOption || isSubmitting || isInvalidAmount) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await paymentAPI.createCheckoutSession({
        taskId,
        paymentType: activeOption.id,
      });

      if (res?.data?.checkoutUrl) {
        onPaymentInitiated?.(res.data);
        // Redirect browser to PayMongo hosted checkout page
        window.location.href = res.data.checkoutUrl;
      } else {
        throw new Error("Unable to retrieve checkout URL from PayMongo.");
      }
    } catch (err) {
      console.error("[PayMongoModal] Payment error:", err);
      setIsSubmitting(false);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate PayMongo payment. Please try again."
      );
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paymongo-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-100 text-[#c72fb2] dark:bg-pink-950/60 dark:text-pink-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="paymongo-modal-title"
                className="text-lg font-black text-slate-900 dark:text-white"
              >
                Pay with PayMongo
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-neutral-800"
            aria-label="Close payment modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Project Context */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Project
            </span>
            <span className="font-black text-slate-900 dark:text-white">
              {task.title || "Project Settlement"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs border-t border-slate-200/60 pt-2 dark:border-neutral-700/60">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Total Budget
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatPeso(totalAmount)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Already Paid
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatPeso(currentPaid)}
            </span>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mt-4 space-y-2">
          {paymentOptions.map((opt) => (
            <div
              key={opt.id}
              className="flex w-full items-center justify-between rounded-xl bg-pink-50/50 p-3.5 text-left dark:bg-pink-950/20"
            >
              <div className="min-w-0 pr-3">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {opt.label}
                </span>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {opt.subtitle}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-base font-black text-[#c72fb2] dark:text-pink-400">
                  {formatPeso(opt.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>



        {/* Error notification */}
        {errorMessage ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Security & Action */}
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            disabled={!activeOption || isSubmitting || isInvalidAmount}
            onClick={handlePay}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#c72fb2] text-sm font-black text-white shadow-md transition hover:bg-[#b0259d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting to PayMongo...
              </>
            ) : (
              <>
                <span>Pay {formatPeso(activeOption?.amount || 0)}</span>
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>256-bit encrypted checkout via PayMongo Payments Philippines</span>
          </div>
        </div>
      </div>
    </div>
  );
}

