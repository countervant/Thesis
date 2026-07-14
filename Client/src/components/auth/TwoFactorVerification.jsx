import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { authAPI } from "../../services/api.js";
import OtpInput from "./OtpInput.jsx";

const readPending = (state) => {
  if (state?.temporaryToken) return state;
  try { return JSON.parse(sessionStorage.getItem("clientraPending2FA") || "null"); } catch { return null; }
};

const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const dashboardPathByRole = { admin: "/admin/dashboard", employee: "/employee/dashboard", client: "/client/dashboard" };

const TwoFactorVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const pending = useMemo(() => readPending(location.state), [location.state]);
  const [code, setCode] = useState("");
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

  const verify = async (event) => {
    event.preventDefault();
    if (code.length !== 6) return setError("Enter the complete 6-digit code.");
    setStatus("loading");
    setError("");
    try {
      const data = await authAPI.verifyTwoFactor(pending.temporaryToken, code);
      setStatus("success");
      sessionStorage.removeItem("clientraPending2FA");
      sessionStorage.setItem("token", data.token);
      const profile = await authAPI.getMe().catch(() => data);
      login(profile, data.token);
      window.setTimeout(() => navigate(dashboardPathByRole[data.role] || "/dashboard", { replace: true }), 650);
    } catch (requestError) {
      const requestStatus = requestError.response?.status;
      setStatus(requestStatus === 410 ? "expired" : requestStatus === 429 ? "locked" : "invalid");
      setError(requestError.response?.data?.message || "Unable to verify the code.");
      setCode("");
    }
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
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">We sent a 6-digit verification code to your email.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1.5 text-sm font-bold text-[#b62ca1] dark:bg-pink-500/10 dark:text-pink-300">
          <Mail className="h-4 w-4" /> {pending.maskedEmail}
        </div>

        <form onSubmit={verify} className="mt-8">
          <OtpInput value={code} onChange={(next) => { setCode(next); setError(""); setStatus("idle"); }} disabled={status === "loading" || status === "success"} hasError={Boolean(error)} />
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <Clock3 className="h-4 w-4" />
            {secondsLeft > 0 ? <>Code expires in <span className="font-black text-[#a12db7]">{formatTime(secondsLeft)}</span></> : <span className="font-black text-red-500">Code expired</span>}
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
          {status === "success" && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">Identity verified. Signing you in...</p>}
          <button type="submit" disabled={code.length !== 6 || status === "loading" || status === "success" || secondsLeft === 0} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-purple-600 text-sm font-black text-white shadow-lg shadow-pink-200/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
            {status === "loading" && <LoaderCircle className="h-4 w-4 animate-spin" />}{status === "loading" ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="mt-5 text-sm font-semibold text-slate-500">
          Didn&apos;t receive the code?{" "}
          <button type="button" onClick={resend} disabled={resendSeconds > 0 || status === "loading"} className="font-black text-[#b62ca1] disabled:cursor-not-allowed disabled:text-slate-400">
            {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
          </button>
        </div>
        <button type="button" onClick={() => { sessionStorage.removeItem("clientraPending2FA"); navigate("/", { replace: true }); }} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#b62ca1]">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
      </section>
    </main>
  );
};

export default TwoFactorVerification;
