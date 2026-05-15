import { useState } from "react";
import settingsIcon from "../../assets/settings.png";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationSettings from "./notification.jsx";
import ProfileSettings from "./profile.jsx";
import SecuritySettings from "./security.jsx";

const menuItems = [
  ["Profile", "person"],
  ["Account", "account"],
  ["Security", "shield"],
  ["Notifications", "bell"],
  ["Appearance", "palette"],
  ["Privacy", "lock"],

];

const overviewItems = [
  ["Account Created", "May 08, 2026", "calendar"],
  ["Last Login", "May 12, 2026 at 10:15 AM", "clock"],
  ["Active Sessions", "2 sessions", "monitor"],
  ["Security Status", "Your account is secure", "shield"],
];

const quickActions = ["Change Password", "Download My Data", "Deactivate Account"];

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
  return <svg {...commonProps}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Profile");
  const isSecurityTab = activeTab === "Security";
  const isNotificationTab = activeTab === "Notifications";
  const usesFullContent = isSecurityTab || isNotificationTab;

  return (
    <div className="-mx-4 -mb-8 -mt-4 min-h-[calc(100vh-4rem)] bg-[#f8f9fd] px-4 py-4 dark:bg-neutral-950 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto max-w-[1540px] space-y-4">


        <div className={`grid gap-5 ${
          usesFullContent
            ? "xl:grid-cols-[210px_minmax(0,1fr)]"
            : "xl:grid-cols-[210px_minmax(0,1fr)_270px]"
        }`}>
          <aside className="rounded-2xl border border-pink-100 bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800 xl:min-h-[620px]">
            <div className="flex h-full flex-col">
              <nav className="space-y-1.5">
                {menuItems.map(([label, icon]) => {
                  const isActive = label === activeTab;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveTab(label)}
                      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-black transition ${
                        isActive
                          ? "bg-[#f4ebff] text-[#8b35ff]"
                          : "text-[#243154] hover:bg-pink-50 hover:text-[#c72fb2] dark:text-slate-300"
                      }`}
                    >
                      <Icon name={icon} className="h-[18px] w-[18px] shrink-0 text-[#647299]" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>

              <section className="mt-auto rounded-xl border border-violet-200 bg-[#fbf7ff] p-3 shadow-[0_4px_14px_rgba(139,53,255,0.08)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#8b35ff] bg-white text-sm font-black text-[#8b35ff]">
                    ?
                  </span>
                  <div>
                    <h2 className="text-xs font-black text-[#8b35ff]">Need Help?</h2>
                    <p className="mt-1 text-[10px] font-semibold leading-4 text-[#647299]">
                      If you need assistance, our support team is here to help.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#d9c0ff] bg-white text-xs font-black text-[#8b35ff] transition hover:bg-violet-50"
                >
                  Contact Support
                  <span className="text-sm leading-none">&gt;</span>
                </button>
              </section>
            </div>
          </aside>

          <main className="space-y-3">
            {isSecurityTab ? (
              <SecuritySettings user={user} />
            ) : isNotificationTab ? (
              <NotificationSettings />
            ) : (
              <>
                <ProfileSettings user={user} />
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="h-9 min-w-[160px] rounded-lg bg-linear-to-r from-[#8b35ff] to-[#dc4fb2] px-5 text-xs font-black text-white shadow-[0_8px_18px_rgba(139,53,255,0.2)] transition hover:brightness-105"
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
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-[#8b35ff]">
                  <img src={settingsIcon} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
                </span>
                Account Overview
              </h2>
              <div className="divide-y divide-pink-50">
                {overviewItems.map(([label, value, icon]) => (
                  <div key={label} className="flex items-center gap-3 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-[#8b35ff]">
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
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-[#8b35ff]">
                  <Icon name="bolt" className="h-5 w-5" />
                </span>
                Quick Actions
              </h2>
              <div className="divide-y divide-pink-50">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="flex h-11 w-full items-center justify-between text-left text-sm font-bold text-slate-700 transition hover:text-[#c72fb2] dark:text-slate-300"
                  >
                    <span>{action}</span>
                    <span className="text-slate-300">&gt;</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-violet-100 bg-linear-to-b from-violet-50 to-pink-50 p-4 text-center shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-b from-[#8b35ff] to-[#b44cff] text-white shadow-[0_12px_24px_rgba(139,53,255,0.24)]">
                <Icon name="shield" className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-sm font-black text-[#10142d]">
                Your security matters
              </h2>
              <p className="mx-auto mt-2 max-w-[220px] text-xs font-semibold leading-5 text-slate-500">
                Keep your account secure by using a strong password and reviewing access.
              </p>
              <button
                type="button"
                className="mt-4 h-9 w-full rounded-lg border border-[#b678ff] bg-white text-xs font-black text-[#8b35ff] transition hover:bg-violet-50"
              >
                Go to Security
              </button>
            </section>
          </aside>}
        </div>
      </div>
    </div>
  );
};

export default Settings;
