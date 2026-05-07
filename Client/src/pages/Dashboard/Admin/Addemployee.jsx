import { useEffect, useState } from "react";
import { employeeAPI } from "../../../services/api.js";
import { isValidEmail } from "../../../utils/emailValidation.js";
import { isValidPhoneNumber } from "../../../utils/phoneValidation.js";
import {
  applyCountryDialCode,
  countryOptions,
  defaultCountry,
  getCountryDialCode,
} from "../../../utils/countries.js";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  country: defaultCountry,
  phone: getCountryDialCode(defaultCountry),
  position: "",
  isActive: true,
};

const fieldNames = {
  firstName: `employee_given_${Date.now()}`,
  lastName: `employee_family_${Date.now()}`,
  email: `employee_contact_${Date.now()}`,
  password: `employee_secret_${Date.now()}`,
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

const FieldLabel = ({ children }) => (
  <label className="text-sm font-medium text-neutral-800">{children}</label>
);

const preventAutofill = (event) => {
  event.currentTarget.removeAttribute("readOnly");
};

const Addemployee = ({ employee, onEmployeeSaved, onNavigate }) => {
  const isEditing = Boolean(employee?.id);
  const [formData, setFormData] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!employee) {
      setFormData(emptyForm);
      return;
    }

    const [firstName = "", ...lastNameParts] = employee.name.split(" ");

    setFormData({
      firstName,
      lastName: lastNameParts.join(" "),
      email: employee.email || "",
      password: "",
      country: employee.country || defaultCountry,
      phone: employee.phone || getCountryDialCode(employee.country || defaultCountry),
      position: employee.position || employee.role || "",
      isActive: employee.status === "Active",
    });
  }, [employee]);

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
      phone: applyCountryDialCode(currentData.phone, nextCountry, currentData.country),
    }));
  };

  const handleCancel = () => {
    onNavigate?.("employee");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage("First name and last name are required.");
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!isValidEmail(formData.email.trim())) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (!isValidPhoneNumber(formData.phone)) {
      setErrorMessage("Enter a valid phone number.");
      return;
    }

    if (!isEditing && !formData.password) {
      setErrorMessage("Password is required for new employees.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        country: formData.country,
        phone: formData.phone.trim(),
        position: formData.position.trim(),
        isActive: isEditing ? formData.isActive : true,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditing) {
        await employeeAPI.update(employee.id, payload);
      } else {
        await employeeAPI.create(payload);
      }

      onEmployeeSaved?.();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          `Unable to ${isEditing ? "update" : "create"} employee.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8 text-neutral-950">
      <section className="max-h-full w-full max-w-[690px] overflow-y-auto bg-[#f1f1f1] shadow-2xl">
        <header className="border-b border-neutral-300 px-8 py-11 sm:px-11">
          <h1
            className="text-2xl uppercase leading-none text-neutral-950 sm:text-3xl"
            style={{ fontFamily: "var(--font-bruno)" }}
          >
            {isEditing ? "Edit Employee" : "New Employee"}
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col px-8 py-10 sm:px-11 sm:py-12"
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

          {errorMessage && (
            <p className="mb-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
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
                placeholder="First name..."
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
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
                placeholder="Last name..."
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          <div className="mt-5 space-y-1">
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
              placeholder="employee@email.com"
              className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Country</FieldLabel>
              <select
                value={formData.country}
                onChange={(event) => handleCountryChange(event.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              >
                {countryOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({option.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <FieldLabel>Phone</FieldLabel>
              <input
                type="tel"
                autoComplete="off"
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+ country code..."
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel>Password</FieldLabel>
              <input
                type="text"
                name={fieldNames.password}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                value={formData.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder={isEditing ? "Leave blank to keep..." : "Password..."}
                style={{ WebkitTextSecurity: "disc" }}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Position</FieldLabel>
              <input
                type="text"
                autoComplete="off"
                value={formData.position}
                onChange={(event) => updateField("position", event.target.value)}
                placeholder="Video Editor..."
                className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          <div className={`mt-5 grid gap-5 ${isEditing ? "sm:grid-cols-2" : ""}`}>
            {isEditing && (
              <div className="space-y-1">
                <FieldLabel>Status</FieldLabel>
                <select
                  value={formData.isActive ? "Active" : "Inactive"}
                  onChange={(event) =>
                    updateField("isActive", event.target.value === "Active")
                  }
                  className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-4 text-xs font-medium text-neutral-500 outline-none transition focus:border-[#d94ab4] focus:ring-2 focus:ring-pink-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 rounded-lg border border-[#9a55ff] bg-transparent text-xs font-semibold text-neutral-700 transition hover:bg-purple-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-[#dc4fb2] text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Employee"
                  : "Create Employee"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Addemployee;
