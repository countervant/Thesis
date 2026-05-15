const alertItems = ["Email alerts", "New device alerts", "Suspicious activity alerts"];

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
  if (name === "link") return <svg {...props}><path d="M10 13a4 4 0 0 0 5.7.2l2-2a4 4 0 0 0-5.6-5.6l-1.1 1.1M14 11a4 4 0 0 0-5.7-.2l-2 2a4 4 0 0 0 5.6 5.6l1.1-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Card = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800 ${className}`}>
    {children}
  </section>
);

const Toggle = () => (
  <span className="relative inline-flex h-7 w-12 items-center rounded-full bg-linear-to-r from-[#e347b3] to-[#8b35ff] p-1 shadow-[0_6px_14px_rgba(227,71,179,0.24)]">
    <span className="h-5 w-5 translate-x-5 rounded-full bg-white shadow-sm" />
  </span>
);

const SecuritySettings = ({ user }) => {
  const email = user?.email || "peejong@gmail.com";
  const phone = user?.phone || "+63 231 321 3123";

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
                    Last updated: May 10, 2026 • 2:15 PM
                  </p>
                </div>
              </div>
              <button type="button" className="h-10 rounded-lg border border-[#d86bc4] px-5 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
                Change Password
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-pink-50 text-[#c72fb2]">
                  <Icon name="shield" className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#10142d] dark:text-white">Two-Factor Authentication (2FA)</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Add an extra layer of security to your account.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Toggle />
                <span className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-500">
                  Enabled
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ["Authenticator App", "Use an authenticator app like Google Authenticator or Authy.", "Configured", "phone"],
                ["SMS Backup", "Receive verification codes via SMS as backup.", "Set up", "message"],
              ].map(([title, description, action, icon]) => (
                <div key={title} className="rounded-xl border border-pink-100 p-4">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-pink-50 text-[#c72fb2]">
                      <Icon name={icon} />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-[#10142d] dark:text-white">{title}</h4>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
                      <button type="button" className="mt-3 h-8 rounded-lg bg-pink-50 px-4 text-xs font-black text-[#c72fb2]">
                        {action}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

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
                <div key={item} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]">
                      <Icon name={item === "Email alerts" ? "mail" : item === "New device alerts" ? "monitor" : "shield"} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-black text-[#10142d] dark:text-white">{item}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                        Get notified when security activity happens.
                      </span>
                    </span>
                  </div>
                  <Toggle />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="h-9 min-w-[120px] rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" className="h-9 min-w-[160px] rounded-lg bg-linear-to-r from-[#8b35ff] via-[#c72fb2] to-[#e347b3] px-5 text-xs font-black text-white shadow-[0_10px_22px_rgba(227,71,179,0.22)] transition hover:brightness-105">
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
                <h4 className="text-sm font-black text-[#10142d] dark:text-white">Your account is secure</h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  We're protecting your account and your data.
                </p>
                <span className="mt-3 inline-flex rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-500">
                  Protected
                </span>
              </div>
            </div>
            <div className="mt-5 divide-y divide-pink-50">
              {[
                ["Password Strength", "Strong", "lock"],
                ["Last Login", "May 12, 2026 • 10:15 AM", "monitor"],
                ["Last Password Change", "May 10, 2026 • 2:15 PM", "calendar"],
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
              {[
                ["Recovery Email", email, "mail"],
                ["Recovery Phone", phone, "phone"],
              ].map(([label, value, icon]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-[#c72fb2]">
                      <Icon name={icon} className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-black text-[#10142d] dark:text-white">{label}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-500">{value}</span>
                    </span>
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-500">Verified</span>
                </div>
              ))}
            </div>
            <button type="button" className="mt-4 h-10 w-full rounded-lg border border-[#d86bc4] text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
              View Backup Codes
            </button>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default SecuritySettings;
