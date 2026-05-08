import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
import view from "../../assets/view.png";
import hide from "../../assets/hide.png";
import AuthenticationHelper from "./AuthenticationHelper.jsx";
import { authAPI } from "../../services/api.js";
import { validateEmail } from "../../utils/emailValidation.js";
import {
  getPhoneValidationMessage,
  limitPhoneNumberLength,
} from "../../utils/phoneValidation.js";
import {
  applyCountryDialCode,
  countryOptions,
  defaultCountry,
  getCountryDialCode,
} from "../../utils/countries.js";

const fieldNames = {
  firstName: `register_given_${Date.now()}`,
  lastName: `register_family_${Date.now()}`,
  companyName: `register_company_${Date.now()}`,
  email: `register_contact_${Date.now()}`,
  phone: `register_line_${Date.now()}`,
  password: `register_secret_${Date.now()}`,
  confirmPassword: `register_secret_confirm_${Date.now()}`,
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

const preventAutofill = (event) => {
  event.currentTarget.removeAttribute("readOnly");
};

const RegisterPage = ({ order, order1 }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [phone, setPhone] = useState(getCountryDialCode(defaultCountry));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setCompanyName("");
    setEmail("");
    setEmailError("");
    setCountry(defaultCountry);
    setPhone(getCountryDialCode(defaultCountry));
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, []);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleCountryChange = (nextCountry) => {
    setPhone((currentPhone) => applyCountryDialCode(currentPhone, nextCountry, country));
    setCountry(nextCountry);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const phoneValidation = getPhoneValidationMessage(phone, country);
    if (phoneValidation) {
      setError(phoneValidation);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include uppercase, lowercase, and number characters");
      return;
    }

    setLoading(true);

    try {
      await authAPI.register(
        firstName.trim(),
        lastName.trim(),
        companyName.trim(),
        email,
        password,
        phone.trim(),
        country
      );
      resetForm();
      setSuccessMessage("Account created successfully. Please log in.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isEmailInvalid = !email || !!emailError;

  useEffect(() => {
    resetForm();
    const timer = setTimeout(resetForm, 100);
    return () => clearTimeout(timer);
  }, [resetForm]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  return (
    <>
      <div
        className={`order-${order} md:order-${order1} w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 py-12 md:py-0`}
      >
        {successMessage && (
          <div className="fixed top-6 right-6 z-20 w-72 max-w-full rounded-xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-pink-100">
            <div className="flex items-start gap-2 p-4">
              <div className="mt-1 h-3 w-3 rounded-full bg-linear-to-br from-pink-500 to-purple-600" aria-hidden="true" />
              <div className="flex-1 text-sm text-gray-800">
                <p className="font-semibold text-gray-900">Success</p>
                <p>{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage("")}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
            <div className="h-1 w-full bg-pink-100">
              <div className="h-1 w-full bg-linear-to-r from-pink-500 to-purple-600" />
            </div>
          </div>
        )}

        <img
          src={logo}
          alt="CLIENTRA"
          className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain"
        />
        <h2
          className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-10 tracking-wide uppercase"
          style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
        >
          Create Account
        </h2>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8"
          autoComplete="off"
          data-form-type="other"
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

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border-b border-black mb-2">
              <input
                type="text"
                name={fieldNames.firstName}
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
                required
              />
            </div>

            <div className="border-b border-black mb-2">
              <input
                type="text"
                name={fieldNames.lastName}
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
                required
              />
            </div>
          </div>

          <div>
            <div className="border-b border-black mb-2">
              <input
                type="text"
                name={fieldNames.companyName}
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
                required
              />
            </div>
          </div>

          <div>
            <div className="border-b border-black mb-2">
              <input
                type="text"
                name={fieldNames.email}
                inputMode="email"
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
                required
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-6">
            <div className="border-b border-black mb-2">
              <select
                value={country}
                onChange={(event) => handleCountryChange(event.target.value)}
                autoComplete="country-name"
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800"
                required
              >
                {countryOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({option.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-b border-black mb-2">
              <input
                type="tel"
                name={fieldNames.phone}
                placeholder="Phone"
                value={phone}
                onChange={(event) =>
                  setPhone(limitPhoneNumberLength(event.target.value, country))
                }
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
                required
              />
            </div>
          </div>

          <div className="border-b-2 border-gray-400 flex items-center">
            <input
              type="text"
              name={fieldNames.password}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...antiAutofillProps}
              readOnly
              onFocus={preventAutofill}
              style={showPassword ? undefined : { WebkitTextSecurity: "disc" }}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-pink-500 hover:text-pink-600 focus:outline-none pb-2 pl-3"
            >
              {showPassword ? (
                <img src={hide} alt="Hide" className="w-5 h-5" />
              ) : (
                <img src={view} alt="Show" className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="border-b-2 border-gray-400 flex items-center">
            <input
              type="text"
              name={fieldNames.confirmPassword}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              {...antiAutofillProps}
              readOnly
              onFocus={preventAutofill}
              style={showPassword ? undefined : { WebkitTextSecurity: "disc" }}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-pink-500 hover:text-pink-600 focus:outline-none pb-2 pl-3"
            >
              {showPassword ? (
                <img src={hide} alt="Hide" className="w-5 h-5" />
              ) : (
                <img src={view} alt="Show" className="w-5 h-5" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || isEmailInvalid}
            className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg mt-6 sm:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <AuthenticationHelper
            link="/"
            Label="Already have an account? Log In"
            Label1=""
          />
        </form>
      </div>
    </>
  );
};

export default RegisterPage;
