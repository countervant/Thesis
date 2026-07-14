import { useState } from "react";
import { LoaderCircle, ShieldAlert, X } from "lucide-react";
import { authAPI } from "../../services/api.js";

const DisableTwoFactorModal = ({ open, onClose, onDisabled }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError("");
    try { await authAPI.disableTwoFactor(password); setPassword(""); onDisabled?.(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to disable two-factor authentication."); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <section className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl dark:border-[#DA70D6]/60 dark:bg-[#141414]">
      <button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500"><ShieldAlert /></div>
      <h2 className="mt-4 text-center text-xl font-black text-[#10142d] dark:text-white">Disable Two-Factor Authentication?</h2>
      <p className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">Your account will no longer require an email code when signing in.</p>
      <form onSubmit={submit} className="mt-5">
        <label className="block text-xs font-black text-slate-700 dark:text-slate-200">Current password
          <input type="password" autoFocus autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-neutral-700 dark:bg-[#1a1a1d] dark:text-white" />
        </label>
        {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 text-sm font-black text-slate-600">Keep Enabled</button>
          <button disabled={!password || loading} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-black text-white disabled:opacity-50">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}Disable 2FA</button>
        </div>
      </form>
    </section>
  </div>;
};

export default DisableTwoFactorModal;
