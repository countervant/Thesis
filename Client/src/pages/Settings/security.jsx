import { useEffect, useMemo, useState } from "react";
import { authAPI, getApiErrorMessage } from "../../services/api.js";
import TwoFactorSettings from "../../components/auth/TwoFactorSettings.jsx";

const defaultSettings = {
  lastPasswordChange: "Not available",
};

const getStorageKey = (user) => `clientraSecuritySettings:${user?._id || user?.id || user?.email || "guest"}`;

const formatDateTime = (date = new Date()) =>
  date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const loadSettings = (user) => {
  try {
    const storageKey = getStorageKey(user);
    const savedSettings = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (Object.hasOwn(savedSettings, "backupCodes") || Object.hasOwn(savedSettings, "alerts")) {
      delete savedSettings.backupCodes;
      delete savedSettings.alerts;
      localStorage.setItem(storageKey, JSON.stringify(savedSettings));
    }
    return {
      ...defaultSettings,
      ...savedSettings,
    };
  } catch {
    return defaultSettings;
  }
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "shield") return <svg {...props}><path d="M12 3 19 6v5c0 4.4-2.5 7.8-7 10-4.5-2.2-7-5.6-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "lock") return <svg {...props}><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "bell") return <svg {...props}><path d="M7 10a5 5 0 0 1 10 0v4l2 3H5l2-3v-4ZM10 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "phone") return <svg {...props}><path d="M9 4h6v16H9zM11 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "message") return <svg {...props}><path d="M5 6h14v10H9l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "mail") return <svg {...props}><path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "monitor") return <svg {...props}><path d="M5 5h14v11H5zM9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...props}><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "x") return <svg {...props}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800 ${className}`}>
    {children}
  </section>
);

const passwordInitialState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const SecuritySettings = ({ user }) => {
  const email = user?.email || "No recovery email available";
  const savedSettings = useMemo(() => loadSettings(user), [user]);
  const [settings, setSettings] = useState(savedSettings);
  const [passwordForm, setPasswordForm] = useState(passwordInitialState);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [isGeneratingBackupCodes, setIsGeneratingBackupCodes] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const openPasswordSettings = () => setShowPasswordForm(true);
    window.addEventListener("clientra:open-password-settings", openPasswordSettings);
    return () => window.removeEventListener("clientra:open-password-settings", openPasswordSettings);
  }, []);

  const persistSettings = (nextSettings) => {
    localStorage.setItem(getStorageKey(user), JSON.stringify(nextSettings));
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((currentForm) => ({ ...currentForm, [field]: value }));
    setError("");
    setMessage("");
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const nextPassword = passwordForm.newPassword.trim();

    if (!passwordForm.currentPassword.trim()) {
      setError("Enter your current password first.");
      return;
    }

    if (nextPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(nextPassword) || !/[a-z]/.test(nextPassword) || !/\d/.test(nextPassword)) {
      setError("Password must include uppercase, lowercase, and number characters.");
      return;
    }

    if (nextPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await authAPI.updateMe({
        currentPassword: passwordForm.currentPassword,
        password: nextPassword,
      });
      const nextSettings = {
        ...settings,
        lastPasswordChange: formatDateTime(new Date()),
      };
      setSettings(nextSettings);
      persistSettings(nextSettings);
      setPasswordForm(passwordInitialState);
      setShowPasswordForm(false);
      setMessage("Password changed successfully.");
      setError("");
    } catch (passwordError) {
      setError(getApiErrorMessage(passwordError, "Unable to change password."));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const generateCodes = async () => {
    try {
      setIsGeneratingBackupCodes(true);
      setMessage("");
      setError("");
      const data = await authAPI.regenerateBackupCodes();
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      setShowBackupCodes(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to generate backup codes."));
    } finally {
      setIsGeneratingBackupCodes(false);
    }
  };

  const closeBackupCodes = () => {
    setShowBackupCodes(false);
    setBackupCodes([]);
  };

  const protectedText = user?.twoFactorEnabled
    ? "Enhanced protection enabled"
    : "Basic password protection";

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-[#c72fb2]">
          <Icon name="shield" className="h-8 w-8" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-[#10142d] dark:text-white md:text-3xl">Security Settings</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Manage your account security and keep your data safe.
          </p>
        </div>
      </header>

      {(message || error) && (
        <div role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-black ${
          error ? "border-red-100 bg-red-50 text-red-500" : "border-emerald-100 bg-emerald-50 text-emerald-600"
        }`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-pink-50 text-[#c72fb2]">
                  <Icon name="lock" className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#10142d] dark:text-white">Change Password</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Update your password regularly to keep your account secure.
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Last updated: {settings.lastPasswordChange}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm((isOpen) => !isOpen)}
                className="h-10 rounded-lg border border-[#d86bc4] px-5 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50 dark:hover:bg-[#c72fb2] dark:hover:text-white"
              >
                Change Password
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={submitPassword} className="mt-5 grid gap-3 border-t border-pink-50 pt-5 md:grid-cols-3">
                {[
                  ["currentPassword", "Current Password"],
                  ["newPassword", "New Password"],
                  ["confirmPassword", "Confirm Password"],
                ].map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-white">{label}</span>
                    <input
                      type="password"
                      autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                      value={passwordForm[field]}
                      onChange={(event) => updatePasswordField(field, event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-[#10142d] outline-none transition focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                  </label>
                ))}
                <div className="flex items-end gap-2 md:col-span-3">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="h-9 min-w-[150px] rounded-lg bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105 disabled:opacity-60"
                  >
                    {isSavingPassword ? "Saving..." : "Save Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm(passwordInitialState);
                      setShowPasswordForm(false);
                      setError("");
                    }}
                    className="h-9 min-w-[100px] rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:bg-[#141414] dark:text-slate-200 dark:hover:bg-[#c72fb2] dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Card>

          <TwoFactorSettings />

        </main>

        <aside className="space-y-5">
          <Card>
            <h3 className="text-sm font-black text-[#10142d] dark:text-white">Security Overview</h3>
            <div className="mt-5 flex items-center gap-5">
              <span className="grid h-24 w-24 place-items-center rounded-3xl bg-pink-500 text-white shadow-[0_16px_30px_rgba(236,72,153,0.22)]">
                <Icon name="shield" className="h-14 w-14" />
              </span>
              <div>
                <h4 className="text-sm font-black text-[#10142d] dark:text-white">{protectedText}</h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  We are protecting your account and your data.
                </p>
                <span className={`mt-3 inline-flex rounded-md px-3 py-1.5 text-xs font-black ${
                  user?.twoFactorEnabled ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                }`}>
                  {user?.twoFactorEnabled ? "Protected" : "Enable 2FA"}
                </span>
              </div>
            </div>
            <div className="mt-5 divide-y divide-pink-50">
              {[
                ["Password", "Protected", "lock"],
                ["Last Activity", user?.lastSeen ? formatDateTime(new Date(user.lastSeen)) : "Not available", "monitor"],
                ["Last Password Change", settings.lastPasswordChange, "calendar"],
              ].map(([label, value, icon]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3 text-xs font-bold">
                  <span className="flex items-center gap-3 text-slate-500">
                    <Icon name={icon} className="h-4 w-4" />
                    {label}
                  </span>
                  <span className={label === "Password" ? "text-emerald-500" : "text-slate-600"}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="flex items-center gap-3 text-sm font-black text-[#10142d] dark:text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-[#c72fb2]">
                <Icon name="shield" />
              </span>
              Backup & Recovery
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">Manage your recovery options.</p>
            <div className="mt-4 divide-y divide-pink-50">
              <div className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]"><Icon name="mail" className="h-4 w-4" /></span><span><span className="block text-xs font-black text-[#10142d] dark:text-white">Recovery Email</span><span className="mt-0.5 block text-xs font-semibold text-slate-500">{email}</span></span></span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-500">Verified</span>
              </div>
            </div>
            <button type="button" onClick={generateCodes} disabled={isGeneratingBackupCodes || !user?.twoFactorEnabled} className="mt-4 h-10 w-full rounded-lg border border-[#d86bc4] text-xs font-black text-[#c72fb2] transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#c72fb2] dark:hover:text-white">
              {isGeneratingBackupCodes ? "Generating..." : user?.twoFactorEnabled ? "Generate Backup Codes" : "Enable 2FA to Generate Codes"}
            </button>
          </Card>
        </aside>
      </div>

      {showBackupCodes && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#141414]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#10142d] dark:text-white">Backup Codes</h3>
              <button type="button" onClick={closeBackupCodes} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">Save these somewhere safe. Each code can be used once when you cannot access your email.</p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">These codes are shown only now. Generating another set will invalidate this set.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {backupCodes.map((code) => (
                <span key={code} className="rounded-lg border border-pink-100 bg-pink-50 px-3 py-2 text-center text-sm font-black text-[#c72fb2]">
                  {code}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={generateCodes}
              disabled={isGeneratingBackupCodes}
              className="mt-4 h-9 w-full rounded-lg bg-linear-to-r from-[#df4bb4] to-[#c72fb2] text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105"
            >
              {isGeneratingBackupCodes ? "Generating..." : "Replace With New Codes"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
