const privacyItems = [
  {
    title: "Profile Visibility",
    description: "Choose who can view your profile.",
    icon: "person",
    control: "select",
    value: "Everyone",
  },
  {
    title: "Online Status",
    description: "Show when you are online.",
    icon: "status",
    control: "toggle",
    enabled: true,
  },
  {
    title: "Activity Visibility",
    description: "Allow others to see your activity.",
    icon: "hide",
    control: "toggle",
    enabled: false,
  },
  {
    title: "Personal Information",
    description: "Choose who can see your personal information.",
    icon: "users",
    control: "select",
    value: "Only Me",
  },
];

const Icon = ({ name, className = "h-5 w-5" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };

  if (name === "person") return <svg {...props}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c.9-4 3.2-6 7-6s6.1 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "status") return <svg {...props}><circle cx="12" cy="12" r="8" fill="currentColor" /></svg>;
  if (name === "hide") return <svg {...props}><path d="m4 4 16 16M10.6 10.6A2 2 0 0 0 13.4 13.4M7.2 7.6C5.8 8.5 4.7 10 4 12c1.5 4.1 4.2 6 8 6 1.3 0 2.4-.2 3.5-.7M10 6.2c.6-.1 1.3-.2 2-.2 3.8 0 6.5 1.9 8 6-.4 1.2-1 2.2-1.8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "users") return <svg {...props}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19c.7-3.2 2.6-4.8 5.5-4.8s4.8 1.6 5.5 4.8M16.5 11.5a2.5 2.5 0 1 0 0-5M15.5 14.5c2.6.2 4.2 1.7 5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "chevron") return <svg {...props}><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "save") return <svg {...props}><path d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Toggle = ({ enabled }) => (
  <span
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
      enabled
        ? "bg-linear-to-r from-[#f472b6] to-[#c72fb2] shadow-[0_6px_14px_rgba(199,47,178,0.22)]"
        : "bg-slate-300"
    }`}
  >
    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "translate-x-5" : "translate-x-0"}`} />
  </span>
);

const SelectControl = ({ value }) => (
  <button
    type="button"
    className="flex h-10 min-w-[150px] items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#10142d] transition hover:border-pink-200 hover:bg-pink-50/40 dark:border-neutral-800 dark:bg-[#141414] dark:text-white"
  >
    {value}
    <Icon name="chevron" className="h-4 w-4 text-slate-500" />
  </button>
);

const PrivacySettings = () => (
  <div className="space-y-5">
    <header>
      <h2 className="text-3xl font-black text-[#10142d] dark:text-white">
        Privacy Settings
      </h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Control your privacy and visibility settings.
      </p>
    </header>

    <section className="rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
      <div className="divide-y divide-pink-50">
        {privacyItems.map((item) => (
          <div key={item.title} className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-13 w-13 shrink-0 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]">
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-[#10142d] dark:text-white">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                  {item.description}
                </span>
              </span>
            </div>

            {item.control === "select" ? (
              <SelectControl value={item.value} />
            ) : (
              <Toggle enabled={item.enabled} />
            )}
          </div>
        ))}
      </div>
    </section>

    <div className="flex justify-end">
      <button
        type="button"
        className="flex h-8 min-w-[132px] items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#f472b6] to-[#c72fb2] px-4 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(227,71,179,0.2)] transition hover:brightness-105"
      >
        <Icon name="save" className="h-4 w-4" />
        Save Changes
      </button>
    </div>
  </div>
);

export default PrivacySettings;
