import { useEffect, useMemo, useState } from "react";
import { authAPI, getApiErrorMessage } from "../../services/api.js";
import TwoFactorSettings from "../../components/auth/TwoFactorSettings.jsx";
import OtpInput from "../../components/auth/OtpInput.jsx";

const alertItems = [
  { id: "emailAlerts", label: "Email alerts", icon: "mail" },
  { id: "newDeviceAlerts", label: "New device alerts", icon: "monitor" },
  { id: "suspiciousActivityAlerts", label: "Suspicious activity alerts", icon: "shield" },
];

const defaultSettings = {
  alerts: {
    emailAlerts: true,
    newDeviceAlerts: true,
    suspiciousActivityAlerts: true,
  },
  backupCodes: [],
  lastPasswordChange: "May 10, 2026 - 2:15 PM",
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
    const savedSettings = JSON.parse(localStorage.getItem(getStorageKey(user)) || "{}");
    return {
      ...defaultSettings,
      ...savedSettings,
      alerts: { ...defaultSettings.alerts, ...(savedSettings.alerts || {}) },
    };
  } catch {
    return defaultSettings;
  }
};

const generateBackupCodes = () =>
  Array.from({ length: 6 }, () =>
    Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
  );

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

const Toggle = ({ enabled, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={enabled}
    className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition ${
      enabled
        ? "bg-linear-to-r from-[#e347b3] to-[#8b35ff] shadow-[0_6px_14px_rgba(227,71,179,0.24)]"
        : "bg-slate-300"
    }`}
  >
    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
  </button>
);

const passwordInitialState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const SecuritySettings = ({ user }) => {
  const email = user?.email || "peejong@gmail.com";
  const phone = user?.phone || "";
  const savedSettings = useMemo(() => loadSettings(user), [user]);
  const [settings, setSettings] = useState(savedSettings);
  const [passwordForm, setPasswordForm] = useState(passwordInitialState);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState({ hasPhone: Boolean(user?.phone), verified: Boolean(user?.phoneVerifiedAt) });
  const [isPhoneStatusLoading, setIsPhoneStatusLoading] = useState(true);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerification, setPhoneVerification] = useState(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState("");
  const [isPhoneVerificationBusy, setIsPhoneVerificationBusy] = useState(false);
  const [phoneCodeSecondsLeft, setPhoneCodeSecondsLeft] = useState(0);

  useEffect(() => {
    const openPasswordSettings = () => setShowPasswordForm(true);
    window.addEventListener("clientra:open-password-settings", openPasswordSettings);
    return () => window.removeEventListener("clientra:open-password-settings", openPasswordSettings);
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsPhoneStatusLoading(true);
    authAPI.getRecoveryPhoneStatus()
      .then((status) => { if (isActive) setPhoneStatus(status); })
      .catch(() => { if (isActive) setPhoneStatus({ hasPhone: Boolean(phone), verified: false }); })
      .finally(() => { if (isActive) setIsPhoneStatusLoading(false); });
    return () => { isActive = false; };
  }, [phone]);

  useEffect(() => {
    const expiresAt = phoneVerification?.expiresAt;
    if (!expiresAt) return undefined;
    const update = () => setPhoneCodeSecondsLeft(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [phoneVerification?.expiresAt]);

  const persistSettings = (nextSettings) => {
    localStorage.setItem(getStorageKey(user), JSON.stringify(nextSettings));
  };

  const updateSettings = (updater) => {
    setSettings((currentSettings) => {
      const nextSettings = typeof updater === "function" ? updater(currentSettings) : updater;
      setMessage("");
      setError("");
      return nextSettings;
    });
  };

  const saveSettings = () => {
    persistSettings(settings);
    setMessage("Security settings saved.");
    setError("");
  };

  const cancelSettings = () => {
    setSettings(loadSettings(user));
    setPasswordForm(passwordInitialState);
    setShowPasswordForm(false);
    setMessage("Changes cancelled.");
    setError("");
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
      await authAPI.updateMe({ password: nextPassword });
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

  const showCodes = () => {
    const nextSettings = settings.backupCodes?.length
      ? settings
      : { ...settings, backupCodes: generateBackupCodes() };
    setSettings(nextSettings);
    persistSettings(nextSettings);
    setShowBackupCodes(true);
  };

  const requestPhoneVerification = async () => {
    setIsPhoneVerificationBusy(true);
    setPhoneVerificationError("");
    setError("");
    try {
      const data = await authAPI.requestRecoveryPhoneCode();
      setPhoneVerification(data);
      setPhoneCode("");
      setShowPhoneVerification(true);
    } catch (requestError) {
      const requestMessage = getApiErrorMessage(requestError, "Unable to send the phone verification code.");
      setPhoneVerificationError(requestMessage);
      setError(requestMessage);
    } finally {
      setIsPhoneVerificationBusy(false);
    }
  };

  const verifyPhone = async (event) => {
    event.preventDefault();
    if (phoneCode.length !== 6) {
      setPhoneVerificationError("Enter the complete 6-digit code.");
      return;
    }
    setIsPhoneVerificationBusy(true);
    setPhoneVerificationError("");
    try {
      const status = await authAPI.verifyRecoveryPhoneCode(phoneCode);
      setPhoneStatus({ hasPhone: true, ...status });
      setShowPhoneVerification(false);
      setPhoneVerification(null);
      setPhoneCode("");
      setMessage("Recovery phone verified successfully.");
      setError("");
    } catch (verifyError) {
      setPhoneVerificationError(getApiErrorMessage(verifyError, "Unable to verify the recovery phone."));
      setPhoneCode("");
    } finally {
      setIsPhoneVerificationBusy(false);
    }
  };

  const protectedText = Object.values(settings.alerts).some(Boolean)
    ? "Your account is secure"
    : "Security needs review";

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-[#c72fb2]">
          <Icon name="shield" className="h-8 w-8" />
        </span>
        <div>
          <h2 className="text-3xl font-black text-[#10142d] dark:text-white">Security Settings</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Manage your account security and keep your data safe.
          </p>
        </div>
      </header>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-black ${
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
                    className="h-9 min-w-[150px] rounded-lg bg-linear-to-r from-[#8b35ff] via-[#c72fb2] to-[#e347b3] px-5 text-xs font-black text-white shadow-[0_10px_22px_rgba(227,71,179,0.22)] transition hover:brightness-105 disabled:opacity-60"
                  >
                    {isSavingPassword ? "Saving..." : "Save Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm(passwordInitialState);
                      setShowPasswordForm(false);
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

          <Card>
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-pink-50 text-[#c72fb2]">
                <Icon name="bell" className="h-7 w-7" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#10142d] dark:text-white">Login Alerts</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Get notified about important security events.
                </p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-pink-50">
              {alertItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-black text-[#10142d] dark:text-white">{item.label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                        Get notified when security activity happens.
                      </span>
                    </span>
                  </div>
                  <Toggle
                    enabled={Boolean(settings.alerts[item.id])}
                    onClick={() =>
                      updateSettings((currentSettings) => ({
                        ...currentSettings,
                        alerts: {
                          ...currentSettings.alerts,
                          [item.id]: !currentSettings.alerts[item.id],
                        },
                      }))
                    }
                    label={`Toggle ${item.label}`}
                  />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={cancelSettings} className="h-9 min-w-[120px] rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:bg-[#141414] dark:text-slate-200 dark:hover:bg-[#c72fb2] dark:hover:text-white">
              Cancel
            </button>
            <button type="button" onClick={saveSettings} className="h-9 min-w-[160px] rounded-lg bg-linear-to-r from-[#8b35ff] via-[#c72fb2] to-[#e347b3] px-5 text-xs font-black text-white shadow-[0_10px_22px_rgba(227,71,179,0.22)] transition hover:brightness-105">
              Save Changes
            </button>
          </div>
        </main>

        <aside className="space-y-5">
          <Card>
            <h3 className="text-sm font-black text-[#10142d] dark:text-white">Security Overview</h3>
            <div className="mt-5 flex items-center gap-5">
              <span className="grid h-24 w-24 place-items-center rounded-3xl bg-linear-to-b from-[#e347b3] to-[#8b35ff] text-white shadow-[0_16px_30px_rgba(227,71,179,0.22)]">
                <Icon name="shield" className="h-14 w-14" />
              </span>
              <div>
                <h4 className="text-sm font-black text-[#10142d] dark:text-white">{protectedText}</h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  We are protecting your account and your data.
                </p>
                <span className={`mt-3 inline-flex rounded-md px-3 py-1.5 text-xs font-black ${
                  protectedText === "Your account is secure" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                }`}>
                  {protectedText === "Your account is secure" ? "Protected" : "Review"}
                </span>
              </div>
            </div>
            <div className="mt-5 divide-y divide-pink-50">
              {[
                ["Password Strength", "Strong", "lock"],
                ["Last Login", formatDateTime(new Date()), "monitor"],
                ["Last Password Change", settings.lastPasswordChange, "calendar"],
              ].map(([label, value, icon]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3 text-xs font-bold">
                  <span className="flex items-center gap-3 text-slate-500">
                    <Icon name={icon} className="h-4 w-4" />
                    {label}
                  </span>
                  <span className={label === "Password Strength" ? "text-emerald-500" : "text-slate-600"}>{value}</span>
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
              <div className="flex items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]"><Icon name="phone" className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-black text-[#10142d] dark:text-white">Recovery Phone</span><span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{phoneStatus.maskedPhone || phone || "Not set"}</span></span></span>
                {isPhoneStatusLoading ? (
                  <span className="text-[11px] font-black text-slate-400">Checking...</span>
                ) : phoneStatus.verified ? (
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-500">Verified</span>
                ) : phoneStatus.hasPhone ? (
                  <button type="button" disabled={isPhoneVerificationBusy} onClick={requestPhoneVerification} className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-600 transition hover:bg-amber-100 disabled:opacity-50">{isPhoneVerificationBusy ? "Sending..." : "Verify"}</button>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">Not set</span>
                )}
              </div>
            </div>
            <button type="button" onClick={showCodes} className="mt-4 h-10 w-full rounded-lg border border-[#d86bc4] text-xs font-black text-[#c72fb2] transition hover:bg-pink-50 dark:hover:bg-[#c72fb2] dark:hover:text-white">
              View Backup Codes
            </button>
          </Card>
        </aside>
      </div>

      {showPhoneVerification && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="verify-phone-title">
          <section className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl dark:border-[#DA70D6]/60 dark:bg-[#141414]">
            <button type="button" disabled={isPhoneVerificationBusy} onClick={() => setShowPhoneVerification(false)} className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50" aria-label="Close phone verification"><Icon name="x" /></button>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 text-white"><Icon name="phone" className="h-7 w-7" /></div>
            <h2 id="verify-phone-title" className="mt-4 text-center text-xl font-black text-[#10142d] dark:text-white">Verify Recovery Phone</h2>
            <p className="mt-2 text-center text-sm font-medium text-slate-500">Enter the 6-digit SMS code sent to {phoneVerification?.maskedPhone || "your phone"}.</p>
            {phoneVerification?.developmentCode && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700">Development code: {phoneVerification.developmentCode}</p>}
            <form onSubmit={verifyPhone} className="mt-5 text-center">
              <OtpInput value={phoneCode} onChange={(next) => { setPhoneCode(next); setPhoneVerificationError(""); }} disabled={isPhoneVerificationBusy} hasError={Boolean(phoneVerificationError)} />
              <p className="mt-3 text-xs font-bold text-slate-400">Expires in {Math.floor(phoneCodeSecondsLeft / 60)}:{String(phoneCodeSecondsLeft % 60).padStart(2, "0")}</p>
              {phoneVerificationError && <p className="mt-3 text-sm font-bold text-red-500">{phoneVerificationError}</p>}
              <button disabled={isPhoneVerificationBusy || phoneCode.length !== 6 || phoneCodeSecondsLeft === 0} className="mt-5 h-11 w-full rounded-xl bg-linear-to-r from-pink-500 to-purple-600 text-sm font-black text-white disabled:opacity-50">{isPhoneVerificationBusy ? "Verifying..." : "Verify Phone"}</button>
              <button type="button" disabled={isPhoneVerificationBusy} onClick={requestPhoneVerification} className="mt-4 text-xs font-black text-[#b62ca1] disabled:opacity-50">Send a new code</button>
            </form>
          </section>
        </div>
      )}

      {showBackupCodes && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#141414]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#10142d] dark:text-white">Backup Codes</h3>
              <button type="button" onClick={() => setShowBackupCodes(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">Use these codes when you cannot access your authenticator.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {settings.backupCodes.map((code) => (
                <span key={code} className="rounded-lg border border-pink-100 bg-pink-50 px-3 py-2 text-center text-sm font-black text-[#c72fb2]">
                  {code}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const nextSettings = { ...settings, backupCodes: generateBackupCodes() };
                setSettings(nextSettings);
                persistSettings(nextSettings);
              }}
              className="mt-4 h-9 w-full rounded-lg bg-linear-to-r from-[#8b35ff] via-[#c72fb2] to-[#e347b3] text-xs font-black text-white"
            >
              Generate New Codes
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
