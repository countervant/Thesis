const notificationItems = [
  ["Task Updates", "Get notified about task assignments, updates, and changes.", "bell", true],
  ["Project Updates", "Receive updates about project activities and progress.", "clipboard", true],
  ["Announcements", "Important announcements and system updates.", "megaphone", true],
  ["Mentions", "When someone mentions you in a comment or message.", "at", false],
  ["Calendar Reminders", "Reminders for upcoming events and meetings.", "calendar", true],
  ["System Alerts", "Important system alerts and notifications.", "warning", true],
  ["Reports", "Receive scheduled reports and summaries.", "chart", false],
];

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "bell") return <svg {...props}><path d="M7 10a5 5 0 0 1 10 0v4l2 3H5l2-3v-4ZM10 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "clipboard") return <svg {...props}><path d="M9 4h6l1 3H8l1-3ZM6 7h12v13H6zM9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "megaphone") return <svg {...props}><path d="M4 13V9h4l9-4v12l-9-4H4ZM8 13l1 6h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "at") return <svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M15 9v5a2 2 0 0 0 3 1.7M15 12a3 3 0 1 1-1-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "calendar") return <svg {...props}><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "warning") return <svg {...props}><path d="m12 4 9 16H3L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "chart") return <svg {...props}><path d="M5 19h14M8 16V9M12 16V5M16 16v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Toggle = ({ enabled }) => (
  <span
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
      enabled
        ? "bg-linear-to-r from-[#8b35ff] to-[#c72fb2] shadow-[0_6px_14px_rgba(199,47,178,0.24)]"
        : "bg-slate-300"
    }`}
  >
    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
  </span>
);

const NotificationSettings = () => (
  <div className="space-y-5">
    <header>
      <h2 className="text-3xl font-black text-[#10142d] dark:text-white">
        Notification Settings
      </h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Choose what notifications you want to receive.
      </p>
    </header>

    <section className="rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
      <div className="border-b border-pink-50 pb-4">
        <h3 className="text-lg font-black text-[#10142d] dark:text-white">
          Notification Preferences
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Manage your notification preferences below.
        </p>
      </div>

      <div className="divide-y divide-pink-50">
        {notificationItems.map(([title, description, icon, enabled]) => (
          <div key={title} className="flex items-center justify-between gap-5 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]">
                <Icon name={icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-[#10142d] dark:text-white">
                  {title}
                </span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                  {description}
                </span>
              </span>
            </div>
            <Toggle enabled={enabled} />
          </div>
        ))}
      </div>
    </section>

    <div className="flex justify-end">
      <button
        type="button"
        className="h-9 min-w-[160px] rounded-lg bg-linear-to-r from-[#8b35ff] via-[#c72fb2] to-[#e347b3] px-5 text-xs font-black text-white shadow-[0_10px_22px_rgba(227,71,179,0.22)] transition hover:brightness-105"
      >
        Save Changes
      </button>
    </div>
  </div>
);

export default NotificationSettings;
