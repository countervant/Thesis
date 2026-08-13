import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { authAPI } from "../../services/api.js";
import OtpInput from "./OtpInput.jsx";

const readPending = (state) => {
  if (state?.temporaryToken) return state;
  try { return JSON.parse(sessionStorage.getItem("clientraPending2FA") || "null"); } catch { return null; }
};

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const formatBackupCode = (value) => {
  const normalized = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return normalized.length > 4
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
};
const dashboardPathByRole = { admin: "/admin/dashboard", employee: "/employee/dashboard", client: "/client/dashboard" };

const TwoFactorVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const pending = useMemo(() => readPending(location.state), [location.state]);
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("email");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [expiresAt, setExpiresAt] = useState(pending?.expiresAt || null);
  const [resendAt, setResendAt] = useState(pending?.resendAvailableAt || null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [resendSeconds, setResendSeconds] = useState(60);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setSecondsLeft(Math.max(0, Math.ceil((new Date(expiresAt || 0).getTime() - currentTime) / 1000)));
      setResendSeconds(Math.max(0, Math.ceil((new Date(resendAt || 0).getTime() - currentTime) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, resendAt]);

  useEffect(() => {
    if (!pending?.temporaryToken) navigate("/", { replace: true });
  }, [navigate, pending]);

  const finishSignIn = async (data) => {
    setStatus("success");
    sessionStorage.removeItem("clientraPending2FA");
    sessionStorage.setItem("token", data.token);
    const profile = await authAPI.getMe().catch(() => data);
    login(profile, data.token);
    window.setTimeout(() => navigate(dashboardPathByRole[data.role] || "/dashboard", { replace: true }), 650);
  };

  const handleVerificationError = (requestError) => {
    const requestStatus = requestError.response?.status;
    setStatus(requestStatus === 410 ? "expired" : requestStatus === 429 ? "locked" : "invalid");
    setError(requestError.response?.data?.message || "Unable to verify the code.");
  };

  const verify = async (event) => {
    event.preventDefault();
    if (code.length !== 6) return setError("Enter the complete 6-digit code.");
    setStatus("loading");
    setError("");
    try {
      const data = await authAPI.verifyTwoFactor(pending.temporaryToken, code);
      await finishSignIn(data);
    } catch (requestError) {
      handleVerificationError(requestError);
      setCode("");
    }
  };

  const verifyBackupCode = async (event) => {
    event.preventDefault();
    if (backupCode.replace(/-/g, "").length !== 8) {
      return setError("Enter the complete backup code.");
    }
    setStatus("loading");
    setError("");
    try {
      const data = await authAPI.verifyTwoFactorBackupCode(
        pending.temporaryToken,
        backupCode
      );
      await finishSignIn(data);
    } catch (requestError) {
      handleVerificationError(requestError);
      setBackupCode("");
    }
  };

  const switchVerificationMethod = (method) => {
    setVerificationMethod(method);
    setCode("");
    setBackupCode("");
    setError("");
    setStatus("idle");
  };

  const resend = async () => {
    setStatus("loading");
    setError("");
    try {
      const data = await authAPI.resendTwoFactor(pending.temporaryToken);
      setExpiresAt(data.expiresAt);
      setResendAt(data.resendAvailableAt);
      setSecondsLeft(300);
      setResendSeconds(60);
      setCode("");
      setStatus("idle");
    } catch (requestError) {
      setStatus(requestError.response?.status === 429 ? "locked" : "invalid");
      setError(requestError.response?.data?.message || "Unable to resend the code.");
    }
  };

  if (!pending) return null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f9fd] px-4 py-10 dark:bg-[#111]">
      <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
      <div className="absolute -right-28 bottom-8 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
      <section className="relative w-full max-w-lg rounded-2xl border border-pink-100 bg-white p-6 text-center shadow-[0_24px_70px_rgba(65,36,86,0.12)] sm:p-10 dark:border-[#DA70D6]/60 dark:bg-[#141414]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/70">
          {status === "success" ? <CheckCircle2 className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <h1 className="mt-6 text-2xl font-black text-[#10142d] sm:text-3xl dark:text-white">Verify Your Identity</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
          {verificationMethod === "email"
            ? "We sent a 6-digit verification code to your email."
            : "Enter one of the one-time backup codes from your Security Settings."}
        </p>
        {verificationMethod === "email" && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-sm font-bold text-[#b62ca1] dark:bg-pink-500/10 dark:text-pink-300">
            <Mail className="h-4 w-4" /> {pending.maskedEmail}
          </div>
        )}

        {verificationMethod === "email" ? (
          <form onSubmit={verify} className="mt-8">
            <OtpInput value={code} onChange={(next) => { setCode(next); setError(""); setStatus("idle"); }} disabled={status === "loading" || status === "success"} hasError={Boolean(error)} />
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <Clock3 className="h-4 w-4" />
              {secondsLeft > 0 ? <>Code expires in <span className="font-black text-[#a12db7]">{formatTime(secondsLeft)}</span></> : <span className="font-black text-red-500">Code expired</span>}
            </div>
            <button type="submit" disabled={code.length !== 6 || status === "loading" || status === "success" || secondsLeft === 0} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-purple-600 text-sm font-black text-white shadow-lg shadow-pink-200/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
              {status === "loading" && <LoaderCircle className="h-4 w-4 animate-spin" />}{status === "loading" ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyBackupCode} className="mt-8">
            <label className="block text-left text-xs font-black text-slate-700 dark:text-slate-200">
              Backup code
              <div className="relative mt-2">
                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b62ca1]" />
                <input
                  type="text"
                  value={backupCode}
                  onChange={(event) => {
                    setBackupCode(formatBackupCode(event.target.value));
                    setError("");
                    setStatus("idle");
                  }}
                  disabled={status === "loading" || status === "success"}
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck="false"
                  maxLength={9}
                  placeholder="XXXX-XXXX"
                  autoFocus
                  className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 font-mono text-base font-black uppercase tracking-[0.18em] text-slate-900 outline-none transition dark:bg-[#1a1a1d] dark:text-white ${
                    error
                      ? "border-red-300 ring-2 ring-red-100"
                      : "border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-neutral-700"
                  }`}
                />
              </div>
            </label>
            <button type="submit" disabled={backupCode.replace(/-/g, "").length !== 8 || status === "loading" || status === "success"} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-purple-600 text-sm font-black text-white shadow-lg shadow-pink-200/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
              {status === "loading" && <LoaderCircle className="h-4 w-4 animate-spin" />}{status === "loading" ? "Verifying..." : "Use Backup Code"}
            </button>
          </form>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
        {status === "success" && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">Identity verified. Signing you in...</p>}

        {verificationMethod === "email" ? (
          <div className="mt-5 space-y-3 text-sm font-semibold text-slate-500">
            <div>
              Didn&apos;t receive the code?{" "}
              <button type="button" onClick={resend} disabled={resendSeconds > 0 || status === "loading"} className="font-black text-[#b62ca1] disabled:cursor-not-allowed disabled:text-slate-400">
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
            </div>
            <button type="button" onClick={() => switchVerificationMethod("backup")} disabled={status === "loading" || status === "success"} className="inline-flex items-center gap-2 font-black text-[#b62ca1] disabled:opacity-50">
              <KeyRound className="h-4 w-4" /> Use a backup code instead
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => switchVerificationMethod("email")} disabled={status === "loading" || status === "success"} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#b62ca1] disabled:opacity-50">
            <Mail className="h-4 w-4" /> Use email verification instead
          </button>
        )}
        <button type="button" onClick={() => { sessionStorage.removeItem("clientraPending2FA"); navigate("/", { replace: true }); }} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#b62ca1]">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
      </section>
    </main>
  );
};

export default TwoFactorVerification;
