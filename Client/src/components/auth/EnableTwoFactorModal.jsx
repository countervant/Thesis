import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, Mail, ShieldCheck, X } from "lucide-react";
import { authAPI } from "../../services/api.js";
import OtpInput from "./OtpInput.jsx";

const EnableTwoFactorModal = ({ open, onClose, onEnabled, required = false }) => {
  const [step, setStep] = useState("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep("password"); setPassword(""); setCode(""); setError("");
  }, [open]);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (!open) return null;

  const requestCode = async (event) => {
    event?.preventDefault();
    if (!password) return setError("Enter your current password.");
    setLoading(true); setError("");
    try {
      const data = await authAPI.requestEnableTwoFactor(password);
      setMaskedEmail(data.maskedEmail); setExpiresAt(data.expiresAt); setCode(""); setStep("code");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        `Unable to reach the CLIENTRA security service: ${requestError.message || "network error"}`
      );
    } finally { setLoading(false); }
  };

  const verify = async (event) => {
    event.preventDefault();
    if (code.length !== 6) return setError("Enter the complete 6-digit code.");
    setLoading(true); setError("");
    try {
      await authAPI.verifyEnableTwoFactor(code);
      setStep("success");
      window.setTimeout(() => onEnabled?.(), 700);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to verify the code."); setCode("");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="enable-2fa-title">
      <section className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl sm:p-7 dark:border-[#DA70D6]/60 dark:bg-[#141414]">
        {!required && <button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>}
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 text-white">
          {step === "success" ? <CheckCircle2 /> : step === "password" ? <KeyRound /> : <ShieldCheck />}
        </div>
        <h2 id="enable-2fa-title" className="mt-4 text-center text-xl font-black text-[#10142d] dark:text-white">
          {step === "success" ? "Two-Factor Enabled" : "Enable Two-Factor Authentication"}
        </h2>

        {step === "password" && <form onSubmit={requestCode} className="mt-6">
          <p className="text-center text-sm font-medium leading-6 text-slate-500">Confirm your current password before we send a code to your registered email.</p>
          <label className="mt-5 block text-xs font-black text-slate-700 dark:text-slate-200">Current password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoFocus className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#1a1a1d] dark:text-white" />
          </label>
          {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}
          <button disabled={loading || !password} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-purple-600 text-sm font-black text-white disabled:opacity-50">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}Send Verification Code</button>
        </form>}

        {step === "code" && <form onSubmit={verify} className="mt-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-[#b62ca1]"><Mail className="h-4 w-4" />{maskedEmail}</div>
          <p className="mt-3 text-sm font-medium text-slate-500">Enter the code to finish enabling email verification.</p>
          <div className="mt-5"><OtpInput value={code} onChange={(next) => { setCode(next); setError(""); }} disabled={loading} hasError={Boolean(error)} /></div>
          <p className="mt-3 text-xs font-bold text-slate-400">Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p>
          {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}
          <button disabled={loading || code.length !== 6 || secondsLeft === 0} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-purple-600 text-sm font-black text-white disabled:opacity-50">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}Verify & Enable</button>
          <button type="button" onClick={requestCode} disabled={loading} className="mt-4 text-xs font-black text-[#b62ca1]">Send a new code</button>
        </form>}

        {step === "success" && <p className="mt-4 text-center text-sm font-medium leading-6 text-slate-500">Your account is now protected with email verification.</p>}
      </section>
    </div>
  );
};

export default EnableTwoFactorModal;
