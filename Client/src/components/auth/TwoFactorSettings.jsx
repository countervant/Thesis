import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { authAPI } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import DisableTwoFactorModal from "./DisableTwoFactorModal.jsx";
import EnableTwoFactorModal from "./EnableTwoFactorModal.jsx";

const maskEmail = (email = "") => {
  const [name = "", domain = ""] = String(email).split("@");
  if (!domain) return "Registered email";
  const visible = name.slice(0, Math.min(4, Math.max(1, name.length - 1)));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};

const statusFromUser = (user) => user ? ({
  enabled: Boolean(user.twoFactorEnabled),
  required: String(user.role || "").toLowerCase() === "admin",
  method: "Email",
  maskedEmail: maskEmail(user.email),
}) : null;

const TwoFactorSettings = ({ setupMode = false, onEnabled }) => {
  const { login, user, updateUser } = useAuth();
  const [status, setStatus] = useState(() => statusFromUser(user));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enableOpen, setEnableOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    await Promise.resolve();
    setLoading(true); setError("");
    let lastError;

    // A freshly restarted API can briefly be unavailable while MongoDB reconnects.
    // Retry once so the security card does not remain stuck on a transient failure.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const data = await authAPI.getTwoFactorStatus();
        setStatus(data);
        if (setupMode && !data.enabled) setEnableOpen(true);
        setLoading(false);
        return;
      } catch (requestError) {
        lastError = requestError;
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 700));
        }
      }
    }

    const profileStatus = statusFromUser(user);
    if (profileStatus) {
      // /auth/me is already authenticated and contains the same persisted flag.
      // Keep the settings usable if the dedicated status request is interrupted.
      setStatus(profileStatus);
      setError("");
    } else {
      setError(lastError?.response?.data?.message || "Unable to load two-factor settings.");
    }
    setLoading(false);
  }, [setupMode, user]);

  useEffect(() => {
    const timer = window.setTimeout(loadStatus, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);
  const enabled = async (verification) => {
    setEnableOpen(false);
    const nextUser = { ...user, twoFactorEnabled: true, twoFactorSetupRequired: false };
    if (verification?.token) login(nextUser, verification.token);
    else updateUser(nextUser);
    await loadStatus();
    onEnabled?.();
  };
  const disabled = async () => { setDisableOpen(false); updateUser({ twoFactorEnabled: false }); await loadStatus(); };

  return <>
    <section className="rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-pink-50 to-violet-100 text-[#b62ca1]"><ShieldCheck className="h-7 w-7" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-[#10142d] dark:text-white">Two-Factor Authentication</h3>
              {!loading && status && <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${status.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{status.enabled ? "Enabled" : "Disabled"}</span>}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">Add an extra layer of protection to your account.</p>
            {status && <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-neutral-900"><Mail className="h-4 w-4 text-[#b62ca1]" />Method: {status.method}</span>
              <span className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-neutral-900">{status.maskedEmail}</span>
              {status.required && <span className="rounded-lg bg-pink-50 px-3 py-2 text-pink-600">Required for Admin</span>}
            </div>}
          </div>
        </div>
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin text-[#b62ca1]" /> : status && (
          status.enabled
            ? <button type="button" disabled={status.required} onClick={() => setDisableOpen(true)} className="h-10 shrink-0 rounded-xl border border-slate-200 px-5 text-xs font-black text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50">{status.required ? "Required" : "Disable 2FA"}</button>
            : <button type="button" onClick={() => setEnableOpen(true)} className="h-10 shrink-0 rounded-xl bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105">Enable 2FA</button>
        )}
      </div>
      {error && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
        <span>{error}</span>
        <button type="button" onClick={loadStatus} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-100">Try again</button>
      </div>}
    </section>
    {enableOpen && <EnableTwoFactorModal required={setupMode || status?.required} onClose={() => setEnableOpen(false)} onEnabled={enabled} />}
    <DisableTwoFactorModal open={disableOpen} onClose={() => setDisableOpen(false)} onDisabled={disabled} />
  </>;
};

export default TwoFactorSettings;
