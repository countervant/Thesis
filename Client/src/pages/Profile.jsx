import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CLIENTRA2 from "../assets/CLIENTRA2.png";
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

const getPositionDisplay = (formData, role) => {
  const normalizedRole = role?.toLowerCase() || "";
  const position = formData.position.trim();

  if (normalizedRole === "client") return "Client";
  if (normalizedRole === "employee") {
    return ["Employee", position].filter(Boolean).join(" - ");
  }
  if (normalizedRole === "admin") return ["Admin", position].filter(Boolean).join(" - ");

  return position || formatRole(role);
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

  const content = (
      <main className={embedded ? "mx-auto max-w-[980px]" : "mx-auto max-w-[980px] px-5 py-10"}>
        <section className="rounded-lg bg-white p-6 shadow-[0_3px_8px_rgba(190,65,158,0.25)] ring-1 ring-pink-50 sm:p-8">
          <div className="flex flex-col gap-6 border-b border-neutral-200 pb-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className="text-3xl uppercase leading-none text-neutral-950"
                style={{ fontFamily: "var(--font-bruno)" }}
              >
                Profile
              </h1>
              <p className="mt-2 text-sm font-medium text-neutral-600">
                Manage your account information and avatar.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <InitialsAvatar
                alt="Avatar preview"
                className="h-20 w-20"
                src={formData.avatar}
                textClassName="text-2xl"
                user={formData}
              />
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#dc4fb2] px-5 text-sm font-semibold text-white transition hover:brightness-105">
                Upload Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {isLoading && !formData.email ? (
            <ProfileSkeleton />
          ) : (
            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              data-form-type="other"
              className="mt-7"
            >
              <input
                type="text"
                name="username"
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
              />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
              />

              {isLoading && (
                <ProfileSkeleton />
              )}

              {errorMessage && (
                <p className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="mb-5 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-100">
                  {successMessage}
                </p>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>First Name</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.firstName}
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Last Name</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.lastName}
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>Company Name</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.companyName}
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                    placeholder="Company name..."
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.email}
                    inputMode="email"
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Country</FieldLabel>
                  <CountrySelect
                    value={formData.country}
                    onChange={handleCountryChange}
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>Phone</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.phone}
                    inputMode="tel"
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.phone}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    placeholder="Phone Number"
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Position</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.position}
                    value={getPositionDisplay(formData, user?.role)}
                    readOnly
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 text-sm font-medium text-neutral-800 outline-none"
                  />
                </div>
              </div>

              <div className="mt-7 grid gap-5 border-t border-neutral-200 pt-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>New Password</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.password}
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Leave blank to keep current"
                    style={{ WebkitTextSecurity: "disc" }}
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Confirm Password</FieldLabel>
                  <input
                    type="text"
                    name={fieldNames.confirmPassword}
                    {...antiAutofillProps}
                    readOnly
                    onFocus={preventAutofill}
                    value={formData.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    placeholder="Confirm new password"
                    style={{ WebkitTextSecurity: "disc" }}
                    className="h-10 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => updateField("avatar", "")}
                    className="h-10 rounded-lg border border-neutral-300 px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Remove Avatar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 rounded-lg bg-[#dc4fb2] px-7 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </section>
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
          className="h-10 rounded-lg border border-[#9a55ff] px-5 text-sm font-semibold text-neutral-700 transition hover:bg-purple-50"
        >
          Back
        </button>
      </header>

      {content}
    </div>
  );
};

export default Profile;
