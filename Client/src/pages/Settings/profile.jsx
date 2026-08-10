import { useMemo, useState } from "react";
import InitialsAvatar from "../../components/InitialsAvatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { authAPI, getApiErrorMessage } from "../../services/api.js";

const defaultSkills = {
  "Technical Skills": ["React", "Laravel", "JavaScript", "TypeScript", "PHP", "MySQL", "Git", "UI/UX Design"],
  "Soft Skills": ["Leadership", "Communication", "Problem Solving", "Time Management", "Teamwork", "Adaptability"],
  "Other Expertise": ["System Administration", "Database Management", "Cybersecurity Basics", "Agile Methodology"],
};
const todayInputValue = new Date().toISOString().slice(0, 10);

const getStorageKey = (user) => `clientraProfileSettings:${user?._id || user?.id || user?.email || "guest"}`;

const formatBirthday = (birthday) => {
  if (!birthday) return "";
  const date = new Date(birthday);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const loadLocalSettings = (user) => {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(user)) || "{}");
  } catch {
    return {};
  }
};

const getFullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.companyName ||
  user?.email ||
  "";

const getEmployeeId = (user) =>
  String(user?._id || user?.id || "Not available").slice(0, 24);

const getJoinedDate = (user) => {
  const date = new Date(user?.createdAt || "");
  if (Number.isNaN(date.getTime())) return "Join date unavailable";
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
  const { updateUser } = useAuth();
  const localSettings = useMemo(() => loadLocalSettings(user), [user]);
  const initialData = useMemo(
    () => ({
      fullName: getFullName(user),
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.country || "",
      birthday: formatBirthday(user?.birthday),
      gender: user?.gender || localSettings.gender || "Prefer not to say",
      companyName: user?.companyName || "",
      role: user?.position || "",
      avatar: user?.avatar || "",
      coverPhoto: user?.coverPhoto || "",
    }),
    [localSettings.gender, user]
  );
  const [formData, setFormData] = useState(initialData);
  const [skillGroups, setSkillGroups] = useState(() => user?.skillGroups
    ? {
        "Technical Skills": user.skillGroups.technical || [],
        "Soft Skills": user.skillGroups.soft || [],
        "Other Expertise": user.skillGroups.other || [],
      }
    : localSettings.skills || defaultSkills);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillGroup, setNewSkillGroup] = useState("Technical Skills");
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field, value) => {
    setFormData((currentData) => ({ ...currentData, [field]: value }));
    setMessage("");
    setError("");
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill) return;
    setSkillGroups((currentGroups) => ({
      ...currentGroups,
      [newSkillGroup]: currentGroups[newSkillGroup].includes(skill)
        ? currentGroups[newSkillGroup]
        : [...currentGroups[newSkillGroup], skill],
    }));
    setNewSkill("");
    setShowSkillForm(false);
  };

  const removeSkill = (group, skill) => {
    setSkillGroups((currentGroups) => ({
      ...currentGroups,
      [group]: currentGroups[group].filter((item) => item !== skill),
    }));
  };

  const loadImage = (field, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose an image smaller than 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateField(field, String(reader.result || ""));
    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    const nameParts = formData.fullName.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setError("Please enter both first and last name.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const updatedUser = await authAPI.updateMe({
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" "),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        country: formData.address.trim(),
        birthday: formData.birthday,
        gender: formData.gender,
        skillGroups: {
          technical: skillGroups["Technical Skills"],
          soft: skillGroups["Soft Skills"],
          other: skillGroups["Other Expertise"],
        },
        companyName: formData.companyName.trim(),
        position: formData.role.trim(),
        avatar: formData.avatar,
        coverPhoto: formData.coverPhoto,
      });
      localStorage.setItem(getStorageKey(user), JSON.stringify({ gender: formData.gender, skills: skillGroups }));
      updateUser(updatedUser);
      setMessage("Profile settings saved.");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Unable to save profile settings."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside>
        <section className="overflow-hidden rounded-2xl border border-pink-100 border-b-2 border-b-[#f7b7e6] bg-white shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414]">
          <div className="relative h-20 bg-linear-to-br from-violet-200 via-pink-100 to-fuchsia-200">
            <label className="absolute right-3 top-3 flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-[#c72fb2] shadow-sm transition hover:bg-pink-50 dark:bg-[#141414] dark:hover:bg-[#c72fb2] dark:hover:text-white">
              <Icon name="upload" />
              Change Cover
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  loadImage("coverPhoto", event.target.files?.[0]);
                  event.target.value = "";
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
              {formData.role || "System Administrator"}
            </p>
            <p className="mx-auto mt-2 max-w-[220px] text-xs font-semibold leading-5 text-slate-500">
              Managing the system and ensuring everything runs smoothly.
            </p>
            <div className="mt-4 space-y-3 border-y border-pink-50 py-3.5 text-left text-xs font-bold text-slate-600">
              <p className="flex items-center gap-3"><Icon name="mail" />{formData.email}</p>
              <p className="flex items-center gap-3"><Icon name="phone" />{formData.phone}</p>
              <p className="flex items-center gap-3"><Icon name="location" />{formData.companyName}</p>
              <p className="flex items-center gap-3"><Icon name="calendar" />{getJoinedDate(user)}</p>
            </div>
            <div className="mt-4">
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#c72fb2] px-4 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50 dark:hover:bg-[#c72fb2] dark:hover:text-white">
                <Icon name="upload" />
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    loadImage("avatar", event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </section>
      </aside>

      <form id="profile-settings-form" onSubmit={saveProfile} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-pink-50 dark:border-neutral-800 dark:bg-[#141414] dark:ring-neutral-800">
        {(message || error) && (
          <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-black ${error ? "bg-red-50 text-red-500" : "bg-pink-50 text-pink-600"}`}>
            {error || message}
          </p>
        )}
        <section>
          <h2 className="mb-4 flex items-center gap-3 text-base font-black text-[#10142d] dark:text-white">
            <Icon name="person" className="h-5 w-5" /> Personal Information
          </h2>
          <div className="grid gap-3.5 xl:grid-cols-2">
            <Field label="Full Name" icon="person" required>
              <input type="text" required value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Email Address" icon="mail" required>
              <input type="email" required value={formData.email} onChange={(event) => updateField("email", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Phone Number" icon="phone" required>
              <input type="tel" required value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Address" icon="location" required>
              <input type="text" required value={formData.address} onChange={(event) => updateField("address", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Birthday" icon="calendar" required>
              <input type="date" required max={todayInputValue} value={formData.birthday} onChange={(event) => updateField("birthday", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Gender" icon="person" required>
              <select required value={formData.gender} onChange={(event) => updateField("gender", event.target.value)} className={iconInputClass}>
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
            <Field label="Company" icon="briefcase">
              <input type="text" value={formData.companyName} onChange={(event) => updateField("companyName", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Role" icon="person">
              <input type="text" value={formData.role} onChange={(event) => updateField("role", event.target.value)} className={iconInputClass} />
            </Field>
            <Field label="Work Status" required>
              <input type="text" value={user?.isActive === false ? "Inactive" : "Active"} readOnly className={`${inputClass} bg-slate-50`} />
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
            <button type="button" onClick={() => setShowSkillForm((visible) => !visible)} className="h-9 rounded-lg border border-pink-500 px-4 text-xs font-black text-pink-600 transition hover:bg-pink-50 dark:hover:bg-pink-500 dark:hover:text-white">
              + Add Skill
            </button>
          </div>
          {showSkillForm && (
            <div className="mb-4 grid gap-2 rounded-xl bg-pink-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input type="text" value={newSkill} onChange={(event) => setNewSkill(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Enter a skill" className={`${inputClass} min-w-0 w-full`} />
              <select value={newSkillGroup} onChange={(event) => setNewSkillGroup(event.target.value)} className={`${inputClass} w-full sm:w-auto`}>
                {Object.keys(skillGroups).map((group) => <option key={group}>{group}</option>)}
              </select>
              <button type="button" onClick={addSkill} className="h-10 rounded-lg bg-linear-to-r from-[#df4bb4] to-[#c72fb2] px-4 text-xs font-black text-white shadow-[0_8px_18px_rgba(219,74,181,0.28)] transition hover:brightness-105">Add</button>
            </div>
          )}
          {Object.entries(skillGroups).map(([group, items]) => (
            <div key={group} className="mb-4 last:mb-0">
              <h3 className="mb-3 text-sm font-black text-[#10142d] dark:text-white">{group}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <button type="button" onClick={() => removeSkill(group, skill)} key={skill} aria-label={`Remove ${skill}`} className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600 transition hover:border-pink-300 hover:bg-pink-100">
                    {skill} <span className="ml-1">×</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
        <span className="sr-only" aria-live="polite">{isSaving ? "Saving profile settings" : message}</span>
      </form>
    </div>
  );
};

export default ProfileSettings;
