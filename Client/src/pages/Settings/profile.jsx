import { useMemo, useState } from "react";
import InitialsAvatar from "../../components/InitialsAvatar.jsx";

const skills = {
  "Technical Skills": ["React", "Laravel", "JavaScript", "TypeScript", "PHP", "MySQL", "Git", "UI/UX Design"],
  "Soft Skills": ["Leadership", "Communication", "Problem Solving", "Time Management", "Teamwork", "Adaptability"],
  "Other Expertise": ["System Administration", "Database Management", "Cybersecurity Basics", "Agile Methodology"],
};

const getFullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.companyName ||
  user?.email ||
  "";

const getEmployeeId = (user) =>
  String(user?._id || user?.id || "69f8b5a1fdf46c3698ba46e3").slice(0, 24);

const getJoinedDate = (user) => {
  const date = new Date(user?.createdAt || "2026-05-04T10:44:00");
  if (Number.isNaN(date.getTime())) return "Joined May 4, 2026";
  return `Joined ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

const Icon = ({ name, className = "h-4 w-4" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "person") return <svg {...props}><circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c.9-4 3.2-6 7-6s6.1 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "mail") return <svg {...props}><path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (name === "phone") return <svg {...props}><path d="M7 4l3 3-2 2c1.2 2.4 2.8 4 5.2 5.2l2-2 3 3-1.5 3c-.4.8-1.2 1.2-2.1 1C9.6 18.3 5.7 14.4 4.8 9.4c-.2-.9.2-1.7 1-2.1L7 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "location") return <svg {...props}><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" /></svg>;
  if (name === "calendar") return <svg {...props}><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "briefcase") return <svg {...props}><path d="M9 6V4h6v2M4 7h16v12H4zM4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "id") return <svg {...props}><path d="M5 7h14v10H5zM8 11h3M8 14h5M15 11h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "upload") return <svg {...props}><path d="M12 16V5M8 9l4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Field = ({ children, icon, label, required }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-white">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    <span className="relative block">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <Icon name={icon} />
        </span>
      )}
      {children}
    </span>
  </label>
);

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-[#10142d] outline-none transition placeholder:text-slate-400 focus:border-[#c72fb2] focus:ring-2 focus:ring-pink-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white";
const iconInputClass = `${inputClass} pl-10`;

const ProfileSettings = ({ user }) => {
  const initialData = useMemo(
    () => ({
      fullName: getFullName(user),
      email: user?.email || "peejong@gmail.com",
      phone: user?.phone || "+632313213123",
      address: user?.country || "Philippines",
      birthday: "February 14, 2001",
      gender: "Male",
      department: user?.companyName || "Clientra",
      position: user?.position || "",
      avatar: user?.avatar || "",
      coverPhoto: user?.coverPhoto || "",
    }),
    [user]
  );
  const [formData, setFormData] = useState(initialData);

  const updateField = (field, value) => {
    setFormData((currentData) => ({ ...currentData, [field]: value }));
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside>
        <section className="overflow-hidden rounded-2xl border border-pink-100 border-b-2 border-b-[#f7b7e6] bg-white shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414]">
          <div className="relative h-20 bg-linear-to-br from-violet-200 via-pink-100 to-fuchsia-200">
            <label className="absolute right-3 top-3 flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-[#c72fb2] shadow-sm transition hover:bg-pink-50">
              <Icon name="upload" />
              Change Cover
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => updateField("coverPhoto", String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {formData.coverPhoto && (
              <img src={formData.coverPhoto} alt="" className="h-full w-full object-cover" aria-hidden="true" />
            )}
          </div>
          <div className="px-4 pb-4 text-center">
            <div className="relative -mt-9 inline-block">
              <InitialsAvatar user={user} src={formData.avatar} className="h-[72px] w-[72px] ring-4 ring-white" textClassName="text-lg" />
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <h2 className="mt-3 text-base font-black text-[#10142d] dark:text-white">{formData.fullName || "Profile Name"}</h2>
            <span className="mt-2 inline-flex rounded-full bg-pink-50 px-3 py-1 text-xs font-black uppercase text-[#c72fb2]">
              {user?.role || "Admin"}
            </span>
            <p className="mt-3 text-sm font-black text-[#10142d] dark:text-white">
              {formData.position || "System Administrator"}
            </p>
            <p className="mx-auto mt-2 max-w-[220px] text-xs font-semibold leading-5 text-slate-500">
              Managing the system and ensuring everything runs smoothly.
            </p>
            <div className="mt-4 space-y-3 border-y border-pink-50 py-3.5 text-left text-xs font-bold text-slate-600">
              <p className="flex items-center gap-3"><Icon name="mail" />{formData.email}</p>
              <p className="flex items-center gap-3"><Icon name="phone" />{formData.phone}</p>
              <p className="flex items-center gap-3"><Icon name="location" />{formData.department}</p>
              <p className="flex items-center gap-3"><Icon name="calendar" />{getJoinedDate(user)}</p>
            </div>
            <div className="mt-4">
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#c72fb2] px-4 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
                <Icon name="upload" />
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => updateField("avatar", String(reader.result || ""));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </section>
      </aside>

      <form className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
        <section>
          <h2 className="mb-4 flex items-center gap-3 text-base font-black text-[#10142d] dark:text-white">
            <Icon name="person" className="h-5 w-5" /> Personal Information
          </h2>
          <div className="grid gap-3.5 xl:grid-cols-2">
            <Field label="Full Name" icon="person" required>
              <input type="text" value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Email Address" icon="mail" required>
              <input type="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Phone Number" icon="phone" required>
              <input type="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Address" icon="location" required>
              <input type="text" value={formData.address} onChange={(event) => updateField("address", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Birthday" icon="calendar" required>
              <input type="text" value={formData.birthday} onChange={(event) => updateField("birthday", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Gender" icon="person" required>
              <select value={formData.gender} onChange={(event) => updateField("gender", event.target.value)} className={iconInputClass}>
                <option>Male</option>
                <option>Female</option>
                <option>Prefer not to say</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="mt-4 border-t border-pink-50 pt-4">
          <h2 className="mb-4 flex items-center gap-3 text-base font-black text-[#10142d] dark:text-white">
            <Icon name="briefcase" className="h-5 w-5" /> Work Information
          </h2>
          <div className="grid gap-3.5 xl:grid-cols-3">
            <Field label="Employee ID" icon="id">
              <input type="text" value={getEmployeeId(user)} readOnly className={`${iconInputClass} bg-slate-50`} />
            </Field>
            <Field label="Department" icon="briefcase">
              <input type="text" value={formData.department} onChange={(event) => updateField("department", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Position" icon="person">
              <input type="text" value={formData.position} onChange={(event) => updateField("position", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Work Status" required>
              <input type="text" value="Full-time" readOnly className={`${inputClass} bg-slate-50`} />
            </Field>
          </div>
        </section>

        <section className="mt-4 border-t border-pink-50 pt-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-3 text-base font-black text-[#10142d] dark:text-white">
                <Icon name="person" className="h-5 w-5" /> Skills & Expertise
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Manage your skills and expertise to showcase your strengths.
              </p>
            </div>
            <button type="button" className="h-9 rounded-lg border border-[#c72fb2] px-4 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
              + Add Skill
            </button>
          </div>
          {Object.entries(skills).map(([group, items]) => (
            <div key={group} className="mb-4 last:mb-0">
              <h3 className="mb-3 text-sm font-black text-[#10142d] dark:text-white">{group}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span key={skill} className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs font-black text-[#c72fb2]">
                    {skill} <span className="ml-1">x</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      </form>
    </div>
  );
};

export default ProfileSettings;
