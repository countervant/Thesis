import { useState } from "react";
import { useNavigate } from "react-router-dom";
import settingsIcon from "../../assets/settings.png";
import { useAuth } from "../../context/AuthContext.jsx";
import { authAPI, getApiErrorMessage } from "../../services/api.js";
import NotificationSettings from "./notification.jsx";
import PrivacySettings from "./privacy.jsx";
import ProfileSettings from "./profile.jsx";
import SecuritySettings from "./security.jsx";

const menuItems = [
  ["Profile", "person"],
  ["Privacy & Security", "shield"],
  ["Notifications", "bell"],
  ["Privacy", "lock"],
];

const quickActions = ["Change Password", "Deactivate Account"];

const formatAccountDate = (value, includeTime = false) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

const Icon = ({ name, className = "h-5 w-5" }) => {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": "true",
  };

  if (name === "person") return <svg {...commonProps}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c.9-4 3.2-6 7-6s6.1 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "shield") return <svg {...commonProps}><path d="M12 3 19 6v5c0 4.4-2.5 7.8-7 10-4.5-2.2-7-5.6-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "bell") return <svg {...commonProps}><path d="M7 10a5 5 0 0 1 10 0v4l2 3H5l2-3v-4ZM10 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "palette") return <svg {...commonProps}><path d="M12 4a8 8 0 0 0 0 16h1.2a1.8 1.8 0 0 0 1.2-3.1l-.3-.3a1.6 1.6 0 0 1 1.1-2.7H17a3 3 0 0 0 3-3c0-3.8-3.4-6.9-8-6.9Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="8.5" cy="10" r="1" fill="currentColor" /><circle cx="11.5" cy="8" r="1" fill="currentColor" /><circle cx="14.5" cy="10" r="1" fill="currentColor" /></svg>;
  if (name === "lock") return <svg {...commonProps}><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "globe") return <svg {...commonProps}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M4 12h16M12 4c2 2.2 3 4.9 3 8s-1 5.8-3 8c-2-2.2-3-4.9-3-8s1-5.8 3-8Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "link") return <svg {...commonProps}><path d="M10 13a4 4 0 0 0 5.7.2l2-2a4 4 0 0 0-5.6-5.6l-1.1 1.1M14 11a4 4 0 0 0-5.7-.2l-2 2a4 4 0 0 0 5.6 5.6l1.1-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "calendar") return <svg {...commonProps}><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "clock") return <svg {...commonProps}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "monitor") return <svg {...commonProps}><path d="M5 5h14v11H5zM9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "bolt") return <svg {...commonProps}><path d="m13 2-7 12h5l-1 8 8-13h-5l1-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "x") return <svg {...commonProps}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return <svg {...commonProps}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Profile");
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateConfirmation, setDeactivateConfirmation] = useState("");
  const [deactivateError, setDeactivateError] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const isSecurityTab = activeTab === "Privacy & Security";
  const isNotificationTab = activeTab === "Notifications";
  const isPrivacyTab = activeTab === "Privacy";
  const usesFullContent = isSecurityTab || isNotificationTab || isPrivacyTab;
  const overviewItems = [
    ["Account Created", formatAccountDate(user?.createdAt), "calendar"],
    ["Last Activity", formatAccountDate(user?.lastSeen || user?.updatedAt, true), "clock"],
    ["Active Session", "This device", "monitor"],
    ["Security Status", user?.twoFactorEnabled ? "Two-factor enabled" : "Password protected", "shield"],
  ];

  const openPasswordSettings = () => {
    setActiveTab("Privacy & Security");
    setTimeout(() => window.dispatchEvent(new Event("clientra:open-password-settings")), 0);
  };

  const handleQuickAction = (action) => {
    if (action === "Change Password") {
      openPasswordSettings();
      return;
    }
    setDeactivatePassword("");
    setDeactivateConfirmation("");
    setDeactivateError("");
    setIsDeactivateOpen(true);
  };

  const submitDeactivateRequest = async (event) => {
    event.preventDefault();
    if (deactivateConfirmation.trim().toUpperCase() !== "DEACTIVATE") {
      setDeactivateError('Type "DEACTIVATE" to confirm.');
      return;
    }
    if (!deactivatePassword) {
      setDeactivateError("Enter your current password.");
      return;
    }

    try {
      setIsDeactivating(true);
      setDeactivateError("");
      await authAPI.deactivateMe(deactivatePassword);
      await logout();
      navigate("/", { replace: true });
    } catch (requestError) {
      setDeactivateError(getApiErrorMessage(requestError, "Unable to deactivate your account."));
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="-mb-8 -mt-4 min-h-[calc(100dvh-4rem)] bg-[#f8f9fd] px-4 py-4 dark:bg-neutral-950 md:px-5 lg:px-6">
      <div className="mx-auto max-w-[1540px] space-y-4">


        <div className={`grid gap-5 ${
          usesFullContent
            ? "xl:grid-cols-[210px_minmax(0,1fr)]"
            : "xl:grid-cols-[210px_minmax(0,1fr)_270px]"
        }`}>
          <aside className="min-w-0 self-start overflow-hidden rounded-2xl border border-pink-100 bg-white p-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800 xl:overflow-visible">
            <div className="flex h-full flex-col">
              <nav className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-1.5 xl:overflow-visible xl:pb-0">
                {menuItems.map(([label, icon]) => {
                  const isActive = label === activeTab;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveTab(label)}
                      className={`flex h-10 w-auto shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-black transition xl:h-9 xl:w-full xl:gap-3 xl:px-3 ${
                        isActive
                          ? "bg-pink-50 text-[#c72fb2] dark:bg-[#c72fb2] dark:text-white"
                          : "text-[#243154] hover:bg-pink-50 hover:text-[#c72fb2] dark:text-slate-300 dark:hover:bg-[#c72fb2] dark:hover:text-white"
                      }`}
                    >
                      <Icon name={icon} className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-[#c72fb2] dark:text-white" : "text-[#647299]"}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>

            </div>
          </aside>

          <main className="min-w-0 space-y-3">
            {isSecurityTab ? (
              <SecuritySettings user={user} />
            ) : isNotificationTab ? (
              <NotificationSettings user={user} />
            ) : isPrivacyTab ? (
              <PrivacySettings user={user} />
            ) : (
              <>
                <ProfileSettings user={user} />
                <div className="flex items-center justify-stretch gap-3 md:justify-end">
                  <button
                    type="submit"
                    form="profile-settings-form"
                    className="h-10 w-full rounded-lg bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-5 text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105 md:h-9 md:w-auto md:min-w-[160px]"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </main>

          {!usesFullContent && <aside className="space-y-3">
            <section className="rounded-2xl border border-pink-100 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
              <h2 className="mb-3 flex items-center gap-3 text-sm font-black text-[#10142d] dark:text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-pink-600">
                  <img src={settingsIcon} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
                </span>
                Account Overview
              </h2>
              <div className="divide-y divide-pink-50">
                {overviewItems.map(([label, value, icon]) => (
                  <div key={label} className="flex items-center gap-3 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pink-50 text-pink-600">
                      <Icon name={icon} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-black text-[#10142d] dark:text-white">
                        {label}
                      </span>
                      <span className={`mt-0.5 block text-xs font-semibold ${label === "Security Status" ? "text-emerald-500" : "text-slate-500"}`}>
                        {value}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-pink-100 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
              <h2 className="mb-3 flex items-center gap-3 text-sm font-black text-[#10142d] dark:text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-pink-600">
                  <Icon name="bolt" className="h-5 w-5" />
                </span>
                Quick Actions
              </h2>
              <div className="divide-y divide-pink-50">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className="flex h-11 w-full items-center justify-between text-left text-sm font-bold text-slate-700 transition hover:text-[#c72fb2] dark:text-slate-300"
                  >
                    <span>{action}</span>
                    <span className="text-slate-300">&gt;</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-pink-100 bg-pink-50 p-4 text-center shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:border-pink-500 dark:bg-[#141414]">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pink-500 text-white shadow-[0_12px_24px_rgba(236,72,153,0.24)]">
                <Icon name="shield" className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-sm font-black text-[#10142d] dark:text-white">
                Your security matters
              </h2>
              <p className="mx-auto mt-2 max-w-[220px] text-xs font-semibold leading-5 text-slate-500 dark:text-white">
                Keep your account secure by using a strong password and reviewing access.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("Privacy & Security")}
                className="mt-4 h-9 w-full rounded-lg border border-pink-400 bg-white text-xs font-black text-pink-600 transition hover:bg-pink-100 dark:bg-neutral-950 dark:text-pink-400 dark:hover:!bg-pink-500 dark:hover:text-white"
              >
                Go to Privacy & Security
              </button>
            </section>
          </aside>}
        </div>
      </div>

      {isDeactivateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-3 sm:p-4">
          <section className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5 dark:bg-[#141414]">
            <h2 className="text-lg font-black text-[#10142d] dark:text-white">Deactivate Account</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              This immediately disables sign-in for this account and signs you out.
            </p>
            <form onSubmit={submitDeactivateRequest} className="mt-4 space-y-3">
              {deactivateError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{deactivateError}</p>}
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-white">Current Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={deactivatePassword}
                  onChange={(event) => { setDeactivatePassword(event.target.value); setDeactivateError(""); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#10142d] outline-none transition focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-white">Type DEACTIVATE to confirm</span>
                <input
                  type="text"
                  value={deactivateConfirmation}
                  onChange={(event) => { setDeactivateConfirmation(event.target.value); setDeactivateError(""); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#10142d] outline-none transition focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />
              </label>
              <div className="grid gap-2 min-[380px]:flex min-[380px]:justify-end">
                <button
                  type="button"
                  onClick={() => { setIsDeactivateOpen(false); setDeactivateError(""); }}
                  disabled={isDeactivating}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 min-[380px]:w-auto min-[380px]:min-w-[100px] dark:bg-[#141414] dark:text-slate-200 dark:hover:bg-[#c72fb2] dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeactivating}
                  className="h-9 w-full rounded-lg bg-red-500 px-5 text-xs font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 min-[380px]:w-auto min-[380px]:min-w-[150px]"
                >
                  {isDeactivating ? "Deactivating..." : "Deactivate Account"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Settings;
