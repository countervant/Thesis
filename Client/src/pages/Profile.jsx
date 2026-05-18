import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CLIENTRA2 from "../assets/CLIENTRA2.png";
import defaultCoverPhoto from "../assets/defaultcoverphoto.png";
import CountrySelect from "../components/CountrySelect.jsx";
import InitialsAvatar from "../components/InitialsAvatar.jsx";
import { ProfileSkeleton } from "../components/Skeleton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { authAPI } from "../services/api.js";
import { isValidEmail } from "../utils/emailValidation.js";
import {
  getPhoneValidationMessage,
  limitPhoneNumberLength,
} from "../utils/phoneValidation.js";
import {
  applyCountryDialCode,
  defaultCountry,
  ensureCountryDialCode,
  getCountryDialCode,
} from "../utils/countries.js";

const emptyForm = {
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  country: defaultCountry,
  phone: "",
  position: "",
  password: "",
  confirmPassword: "",
  avatar: "",
  coverPhoto: "",
};

const fieldNames = {
  firstName: `profile_given_${Date.now()}`,
  lastName: `profile_family_${Date.now()}`,
  companyName: `profile_company_${Date.now()}`,
  email: `profile_contact_${Date.now()}`,
  phone: `profile_optional_line_${Date.now()}`,
  position: `profile_position_${Date.now()}`,
  password: `profile_secret_${Date.now()}`,
  confirmPassword: `profile_secret_confirm_${Date.now()}`,
};

const antiAutofillProps = {
  autoComplete: "new-password",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: "false",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
};

const profileToForm = (profile) => {
  const country = profile?.country || defaultCountry;
  const role = profile?.role?.toLowerCase() || "";

  return {
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    companyName: profile?.companyName || "",
    email: profile?.email || "",
    country,
    phone: ensureCountryDialCode(profile?.phone || getCountryDialCode(country), country),
    position: role === "client" ? "Client" : profile?.position || "",
    password: "",
    confirmPassword: "",
    avatar: profile?.avatar || "",
    coverPhoto: profile?.coverPhoto || profile?.cover || "",
  };
};

const FieldLabel = ({ children }) => (
  <label className="text-sm font-semibold text-neutral-800">{children}</label>
);

const preventAutofill = (event) => {
  event.currentTarget.removeAttribute("readOnly");
};

const formatRole = (role = "") => {
  const value = String(role || "").trim();
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const Profile = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const hasCachedProfile = Boolean(user?.email);
  const [formData, setFormData] = useState(() => profileToForm(user) || emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(!hasCachedProfile);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(!hasCachedProfile);
        setErrorMessage("");
        const data = await authAPI.getMe();

        if (isMounted) {
          const nextUser = {
            id: data._id || data.id,
            ...data,
          };

          updateUser(nextUser);
          setFormData(profileToForm(data));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.response?.data?.message || "Unable to load profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [hasCachedProfile, updateUser]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleCountryChange = (nextCountry) => {
    setFormData((currentData) => ({
      ...currentData,
      country: nextCountry,
      phone: ensureCountryDialCode(
        applyCountryDialCode(currentData.phone, nextCountry, currentData.country),
        nextCountry
      ),
    }));
  };

  const handlePhoneChange = (value) => {
    updateField(
      "phone",
      limitPhoneNumberLength(
        ensureCountryDialCode(value, formData.country),
        formData.country
      )
    );
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Avatar image must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("avatar", String(reader.result || ""));
      setErrorMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleCoverPhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Cover photo image must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("coverPhoto", String(reader.result || ""));
      setErrorMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage("First name and last name are required.");
      return;
    }

    if (user?.role === "client" && !formData.companyName.trim()) {
      setErrorMessage("Company name is required.");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    const phoneValidation = getPhoneValidationMessage(formData.phone, formData.country);
    if (phoneValidation) {
      setErrorMessage(phoneValidation);
      return;
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      if (formData.password.length < 8) {
        setErrorMessage("Password must be at least 8 characters.");
        return;
      }

      if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/\d/.test(formData.password)) {
        setErrorMessage("Password must include uppercase, lowercase, and number characters.");
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        companyName: formData.companyName.trim(),
        email: formData.email.trim(),
        country: formData.country,
        phone: formData.phone.trim(),
        position: user?.role === "client" ? "Client" : formData.position.trim(),
        avatar: formData.avatar,
        coverPhoto: formData.coverPhoto,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const updatedProfile = await authAPI.updateMe(payload);
      updateUser(updatedProfile);
      setFormData({
        ...profileToForm(updatedProfile),
        password: "",
        confirmPassword: "",
      });
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "May 8, 2026";
  const fullName = getFullName(formData);

  const content = (
    <main className={embedded ? "w-full" : "w-full px-5 py-10"}>
      <div className="mb-4">
        <h1
          className="text-3xl uppercase leading-none text-neutral-950 dark:text-white"
          style={{ fontFamily: "var(--font-bruno)" }}
        >
        Profile
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Manage your personal information and account settings.
        </p>
      </div>

      {isLoading && !formData.email ? (
        <section className="rounded-2xl border-b-2 border-b-[#f7b7e6] bg-white p-5 shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50">
          <ProfileSkeleton />
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          data-form-type="other"
          className="grid gap-4 xl:grid-cols-[300px_1fr]"
        >
          <input type="text" name="username" autoComplete="username" tabIndex={-1} aria-hidden="true" className="hidden" />
          <input type="password" name="password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" className="hidden" />

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border-b-2 border-b-[#f7b7e6] bg-white shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50">
              <div className="group relative h-24 bg-pink-50">
                <img
                  src={formData.coverPhoto || defaultCoverPhoto}
                  alt=""
                  className="h-full w-full object-cover"
                  aria-hidden="true"
                />
                <label className="absolute right-3 top-3 flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-white/90 px-3 text-xs font-black text-[#c72fb2] shadow-sm ring-1 ring-pink-100 transition hover:bg-white">
                  <FormIcon name="upload" className="h-4 w-4" />
                  Change Cover
                  <input type="file" accept="image/*" onChange={handleCoverPhotoChange} className="sr-only" />
                </label>
              </div>
              <div className="px-5 pb-5 text-center">
                <div className="relative -mt-10 inline-block">
                  <InitialsAvatar
                    alt="Avatar preview"
                    className="h-20 w-20"
                    src={formData.avatar}
                    textClassName="text-xl"
                    user={formData}
                  />
                  <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <h2 className="text-lg font-black text-[#10142d]">{fullName || "Your Name"}</h2>
                </div>
                <span className="mt-2 inline-flex rounded-full bg-pink-50 px-3 py-1 text-xs font-black uppercase text-[#c72fb2]">
                  {formatRole(user?.role) || "User"}
                </span>
                <p className="mt-4 text-sm font-black text-[#10142d]">
                  {formData.position || "System Administrator"}
                </p>
                <p className="mx-auto mt-2 max-w-[240px] text-xs font-semibold leading-5 text-slate-500">
                  Managing the system and ensuring everything runs smoothly.
                </p>

                <div className="mt-4 space-y-3 border-y border-pink-50 py-4 text-left text-xs font-bold text-slate-600">
                  <p className="flex items-center gap-3"><FormIcon name="mail" />{formData.email || "email@example.com"}</p>
                  <p className="flex items-center gap-3"><FormIcon name="phone" />{formData.phone || "Phone number"}</p>
                  <p className="flex items-center gap-3"><FormIcon name="location" />{formData.companyName || formData.country || "Manila, Philippines"}</p>
                  <p className="flex items-center gap-3"><FormIcon name="calendar" />Joined {joinedDate}</p>
                </div>

                <label className="mt-4 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#c72fb2] text-xs font-black text-[#c72fb2] transition hover:bg-pink-50">
                  <FormIcon name="upload" className="h-4 w-4" />
                  Change Photo
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
                </label>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => updateField("avatar", "")}
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-red-300 text-xs font-black text-red-500 transition hover:bg-red-50"
                  >
                    Remove Photo
                  </button>
                )}
                {formData.coverPhoto && (
                  <button
                    type="button"
                    onClick={() => updateField("coverPhoto", "")}
                    className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-red-300 text-xs font-black text-red-500 transition hover:bg-red-50"
                  >
                    Remove Cover Photo
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-2xl border-b-2 border-b-[#f7b7e6] bg-white p-4 shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50">
              <h2 className="mb-3 text-base font-black text-[#10142d]">Account Activity</h2>
              {[
                ["Last profile update", "May 12, 2026 - 7:52 PM"],
                ["Last login", "May 12, 2026 - 7:50 PM"],
                ["Account created", `${joinedDate} - 10:44 AM`],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 border-b border-pink-50 py-3 last:border-b-0">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink-50 text-[#c72fb2]">
                    <FormIcon name="calendar" className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-black text-[#10142d]">{label}</span>
                    <span className="text-xs font-semibold text-slate-500">{value}</span>
                  </span>
                </div>
              ))}
            </section>
          </aside>

          <section className="overflow-hidden rounded-2xl border-b-2 border-b-[#f7b7e6] bg-white shadow-[0_3px_4px_rgba(190,65,158,0.14),0_8px_24px_rgba(190,65,158,0.05)] ring-1 ring-pink-50">
            <div className="space-y-5 p-5">
              {errorMessage && (
                <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{errorMessage}</p>
              )}
              {successMessage && (
                <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-100">{successMessage}</p>
              )}

              <section>
                <h2 className="mb-4 flex items-center gap-3 text-base font-black">
                  <FormIcon name="person" /> Personal Information
                </h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Full Name" icon="person" required>
                    <input
                      type="text"
                      name={fieldNames.firstName}
                      {...antiAutofillProps}
                      readOnly
                      onFocus={preventAutofill}
                      value={fullName}
                      onChange={(event) => {
                        const names = splitFullName(event.target.value);
                        setFormData((currentData) => ({ ...currentData, ...names }));
                      }}
                      className={iconInputClass}
                    />
                  </Field>
                  <Field label="Email Address" icon="mail" required>
                    <input
                      type="text"
                      name={fieldNames.email}
                      inputMode="email"
                      {...antiAutofillProps}
                      readOnly
                      onFocus={preventAutofill}
                      value={formData.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className={iconInputClass}
                    />
                  </Field>
                  <Field label="Phone Number" icon="phone" required>
                    <input
                      type="text"
                      name={fieldNames.phone}
                      inputMode="tel"
                      {...antiAutofillProps}
                      readOnly
                      onFocus={preventAutofill}
                      value={formData.phone}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      className={iconInputClass}
                    />
                  </Field>
                  <Field label="Address" icon="location" required>
                    <CountrySelect
                      value={formData.country}
                      onChange={handleCountryChange}
                      className={iconInputClass}
                    />
                  </Field>
                  <Field label="Birthday" icon="calendar" required>
                    <input type="text" value="February 14, 2001" readOnly className={iconInputClass} />
                  </Field>
                  <Field label="Gender" icon="person" required>
                    <select className={iconInputClass} defaultValue="Male">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Prefer not to say</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section className="border-t border-pink-50 pt-5">
                <h2 className="mb-4 flex items-center gap-3 text-base font-black">
                  <FormIcon name="briefcase" /> Work Information
                </h2>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Field label="Employee ID" icon="id">
                    <input type="text" value={getEmployeeId(user)} readOnly className={`${readOnlyInputClass} pl-12`} />
                  </Field>
                  <Field label="Department" icon="briefcase">
                    <input
                      type="text"
                      value={formData.companyName || "IT Department"}
                      onChange={(event) => updateField("companyName", event.target.value)}
                      className={iconInputClass}
                    />
                  </Field>
                  <Field label="Position" icon="person">
                    <input
                      type="text"
                      name={fieldNames.position}
                      value={formData.position}
                      onChange={(event) => updateField("position", event.target.value)}
                      className={iconInputClass}
                    />
                  </Field>
                  <Field label="Work Status" required>
                    <input type="text" value={getWorkStatus(user)} readOnly className={readOnlyInputClass} />
                  </Field>
                </div>
              </section>

              <section className="border-t border-pink-50 pt-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-3 text-base font-black">
                      <FormIcon name="person" /> Skills & Expertise
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Manage your skills and expertise to showcase your strengths.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-lg border border-[#c72fb2] bg-white px-4 text-xs font-black text-[#c72fb2] transition hover:bg-pink-50"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add Skill
                  </button>
                </div>

                {[
                  ["Technical Skills", ["React", "Laravel", "JavaScript", "TypeScript", "PHP", "MySQL", "Git", "UI/UX Design"]],
                  ["Soft Skills", ["Leadership", "Communication", "Problem Solving", "Time Management", "Teamwork", "Adaptability"]],
                  ["Other Expertise", ["System Administration", "Database Management", "Cybersecurity Basics", "Agile Methodology"]],
                ].map(([group, skills]) => (
                  <div key={group} className="mb-5 last:mb-0">
                    <h3 className="mb-3 text-sm font-black text-[black]">{group}</h3>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-2 rounded-full border border-black-100 bg-black-50 px-3 py-1.5 text-xs font-black text-[#c72fb2]"
                        >
                          {skill}
                          <button
                            type="button"
                            className="text-sm font-black text-[#c72fb2] transition hover:text-black-700"
                            aria-label={`Remove ${skill}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section className="border-t border-pink-50 pt-5">
                <h2 className="mb-4 flex items-center gap-3 text-base font-black">
                  <FormIcon name="lock" /> Account Settings
                </h2>
                <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                  <button
                    type="button"
                    className="flex h-16 w-full self-start items-center gap-4 rounded-lg border border-pink-200 bg-pink-50/30 px-4 py-3 text-left transition hover:bg-pink-50"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-pink-100 text-[#c72fb2]">
                      <FormIcon name="lock" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[#10142d]">
                        Change Password
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        Update your password regularly for better security.
                      </span>
                    </span>
                    <span className="text-3xl font-light text-[#c72fb2]" aria-hidden="true">
                      ›
                    </span>
                  </button>
                  <div className="space-y-4 rounded-xl border border-slate-100 p-4">
                    {["Two-factor authentication (2FA)", "Email notifications"].map((setting) => (
                      <div key={setting} className="flex items-center justify-between rounded-xl border border-pink-50 px-4 py-3">
                        <span>
                          <span className="block text-sm font-black text-[#10142d]">{setting}</span>
                          <span className="text-sm font-semibold text-slate-500">
                            {setting.startsWith("Two") ? "Add an extra layer of security to your account." : "Receive email updates about your account."}
                          </span>
                        </span>
                        <span className="flex h-7 w-12 items-center rounded-full bg-[#c72fb2] p-1">
                          <span className="h-5 w-5 translate-x-5 rounded-full bg-white shadow-sm" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-3 border-t border-pink-50 px-5 py-4">
              <button
                type="button"
                onClick={() => navigate(`/${user?.role || "client"}/dashboard`)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-8 text-xs font-black text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-lg bg-linear-to-b from-[#df4bb4] to-[#c72fb2] px-8 text-xs font-black text-white shadow-[0_9px_18px_rgba(199,47,178,0.3)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </form>
      )}
    </main>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-neutral-950">
      <header className="flex h-16 items-center justify-between border-b border-neutral-300 bg-[#f5f5f5] px-5">
        <button
          type="button"
          onClick={() => navigate(`/${user?.role || "client"}/dashboard`)}
          className="flex items-center gap-2"
        >
          <img src={CLIENTRA2} alt="Clientra" className="h-10 w-10 object-contain" />
          <span
            className="text-2xl uppercase text-neutral-950"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            Clientra
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 rounded-lg border border-[#c72fb2] px-5 text-sm font-semibold text-neutral-700 transition hover:bg-pink-50"
        >
          Back
        </button>
      </header>

      {content}
    </div>
  );
};

const getFullName = (formData) =>
  [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim();

const splitFullName = (value) => {
  const [firstName = "", ...lastNameParts] = value.trim().split(/\s+/);
  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
};

const getEmployeeId = (user) => user?.employeeId || user?.employeeID || user?._id || user?.id || "EMP-000123";

const getWorkStatus = (user) =>
  user?.workStatus || (user?.isActive === false ? "Inactive" : "Full-time");

const FormIcon = ({ name, className = "h-5 w-5" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "mail") return <svg {...props}><path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "phone") return <svg {...props}><path d="M7 4l3 3-2 2c1.2 2.4 2.8 4 5.2 5.2l2-2 3 3-1.5 3c-.4.8-1.2 1.2-2.1 1C9.6 18.3 5.7 14.4 4.8 9.4c-.2-.9.2-1.7 1-2.1L7 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="5" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "location") return <svg {...props}><path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "briefcase") return <svg {...props}><path d="M9 7V5h6v2M5 8h14v11H5zM5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "id") return <svg {...props}><rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10h3M8 14h5M15 11h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "lock") return <svg {...props}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "upload") return <svg {...props}><path d="M12 16V5M8 9l4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M5.5 19c.8-3.4 3-5.2 6.5-5.2s5.7 1.8 6.5 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const Field = ({ children, icon, label, required = false }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-black text-slate-600">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    <span className="relative block">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <FormIcon name={icon} />
        </span>
      )}
      {children}
    </span>
  </label>
);

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#10142d] outline-none transition focus:border-[#dc4fb2] focus:ring-2 focus:ring-pink-100";

const iconInputClass = `${inputClass} pl-12`;

const readOnlyInputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 outline-none";

export default Profile;
