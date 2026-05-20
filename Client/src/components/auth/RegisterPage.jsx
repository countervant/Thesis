import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
import mobileLogo from "../../assets/CLIENTRA2.png";
import view from "../../assets/view.png";
import hide from "../../assets/hide.png";
import CountrySelect from "../CountrySelect.jsx";
import { authAPI } from "../../services/api.js";
import { validateEmail } from "../../utils/emailValidation.js";
import {
  getPhoneValidationMessage,
  limitPhoneNumberLength,
} from "../../utils/phoneValidation.js";
import {
  applyCountryDialCode,
  defaultCountry,
  getCountryDialCode,
} from "../../utils/countries.js";
import { getAuthErrorMessage } from "../../utils/authErrors.js";

const fieldNames = {
  firstName: `register_given_${Date.now()}`,
  middleInitial: `register_middle_${Date.now()}`,
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

const RegisterIcon = ({ name, className = "h-5 w-5" }) => {
  const props = { viewBox: "0 0 24 24", fill: "none", className, "aria-hidden": "true" };
  if (name === "person") return <svg {...props}><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" /><path d="M5.5 20c.8-3.8 3-5.7 6.5-5.7s5.7 1.9 6.5 5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === "mail") return <svg {...props}><path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "briefcase") return <svg {...props}><path d="M9 6V4h6v2M4 7h16v12H4zM4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "globe") return <svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M4 12h16M12 4c2 2.2 3 4.9 3 8s-1 5.8-3 8c-2-2.2-3-4.9-3-8s1-5.8 3-8Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (name === "phone") return <svg {...props}><path d="M7 4l3 3-2 2c1.2 2.4 2.8 4 5.2 5.2l2-2 3 3-1.5 3c-.4.8-1.2 1.2-2.1 1C9.6 18.3 5.7 14.4 4.8 9.4c-.2-.9.2-1.7 1-2.1L7 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "lock") return <svg {...props}><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (name === "text") return <span className={`${className} flex items-center justify-center font-black`}>Aa</span>;
  return <svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
};

const mobileFieldWrap = "space-y-2";
const mobileInputBox =
  "relative flex h-12 items-center rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 dark:border-white/40 dark:bg-[#1f2937]";
const mobileInput =
  "w-full border-none bg-transparent px-4 text-sm font-medium text-gray-800 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white dark:placeholder:text-white/85";

const RegisterPage = ({ order, order1 }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const handleLoginClick = () => {
    const authScreen = document.querySelector("[data-auth-screen]");
    authScreen?.classList.add("auth-screen-exit-login");

    window.setTimeout(() => {
      navigate("/");
    }, 420);
  };

  const resetForm = useCallback(() => {
    setFirstName("");
    setMiddleInitial("");
    setLastName("");
    setCompanyName("");
    setEmail("");
    setEmailError("");
    setCountry("");
    setPhone("");
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
    setPhone((currentPhone) =>
      applyCountryDialCode(
        currentPhone || getCountryDialCode(nextCountry),
        nextCountry,
        country || nextCountry
      )
    );
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

    const selectedCountry = country || defaultCountry;
    const phoneValidation = getPhoneValidationMessage(phone, selectedCountry);
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
        middleInitial.trim(),
        lastName.trim(),
        companyName.trim(),
        email,
        password,
        phone.trim(),
        selectedCountry
      );
      resetForm();
      setSuccessMessage("Account created successfully. Please log in.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(getAuthErrorMessage(err, "Registration failed. Please try again."));
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
        className={`order-${order} md:order-${order1} relative z-20 -mt-16 flex w-full flex-col items-center justify-start bg-transparent px-3 pb-8 pt-0 md:mt-0 md:w-1/2 md:justify-center md:bg-gray-100 md:px-12 md:py-0 dark:md:bg-[#111111]`}
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

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg space-y-5 rounded-[2.25rem] border border-transparent bg-white px-6 py-8 shadow-[0_18px_35px_rgba(15,23,42,0.16)] sm:max-w-lg sm:space-y-8 md:max-w-2xl md:-translate-y-4 md:bg-transparent md:px-10 md:py-7 md:shadow-none dark:bg-[#141414] dark:md:border-pink-200/90 dark:md:shadow-[0_0_42px_rgba(219,39,119,0.22)]"
          autoComplete="off"
          data-form-type="other"
        >
          <div className="flex flex-col items-center">
            <picture>
              <source media="(min-width: 768px)" srcSet={logo} />
              <img
                src={mobileLogo}
                alt="CLIENTRA"
                className="h-14 w-14 object-contain sm:h-24 sm:w-24 md:h-44 md:w-44"
              />
            </picture>
            <h2
              className="mb-1 mt-4 text-2xl font-bold uppercase tracking-wide sm:mb-10 sm:mt-5 sm:text-3xl md:mt-0 dark:text-white"
              style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
            >
              Create Account
            </h2>
          </div>

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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:border-red-400/60 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <div className={mobileFieldWrap}>
              <label className="block text-xs font-medium text-slate-500">First Name</label>
              <div className={mobileInputBox}>
              <input
                type="text"
                name={fieldNames.firstName}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className={mobileInput}
                required
              />
              </div>
            </div>

            <div className={mobileFieldWrap}>
              <label className="block whitespace-nowrap text-[11px] font-medium text-slate-500 md:text-xs">Middle Initial (Optional)</label>
              <div className={mobileInputBox}>
              <input
                type="text"
                name={fieldNames.middleInitial}
                placeholder="M.I."
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value.slice(0, 5))}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className={mobileInput}
              />
              </div>
            </div>

            <div className={mobileFieldWrap}>
              <label className="block text-xs font-medium text-slate-500">Last Name</label>
              <div className={mobileInputBox}>
              <input
                type="text"
                name={fieldNames.lastName}
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className={mobileInput}
                required
              />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className={mobileFieldWrap}>
              <label className="block text-xs font-medium text-slate-500">Email</label>
              <div className={mobileInputBox}>
              <input
                type="text"
                name={fieldNames.email}
                inputMode="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className={mobileInput}
                required
              />
              </div>
            </div>
            {emailError && (
              <p className="text-sm text-red-500 sm:col-start-1 sm:row-start-2 dark:text-red-300">{emailError}</p>
            )}

            <div className={mobileFieldWrap}>
              <label className="block text-xs font-medium text-slate-500">Company Name</label>
              <div className={mobileInputBox}>
              <input
                type="text"
                name={fieldNames.companyName}
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className={mobileInput}
                required
              />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr] md:gap-6">
            <div className={mobileFieldWrap}>
              <label className="block text-xs font-medium text-slate-500">Country</label>
              <div className={mobileInputBox}>
              <CountrySelect
                value={country}
                onChange={handleCountryChange}
                autoComplete="country-name"
                className={`${mobileInput} relative z-0`}
                required
              />
              </div>
            </div>

            <div className={mobileFieldWrap}>
              <label className="block text-xs font-medium text-slate-500">Phone</label>
              <div className={mobileInputBox}>
              <input
                type="tel"
                name={fieldNames.phone}
                placeholder="Enter phone number"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    limitPhoneNumberLength(
                      event.target.value,
                      country || defaultCountry
                    )
                  )
                }
                {...antiAutofillProps}
                readOnly
                onFocus={preventAutofill}
                className={mobileInput}
                required
              />
              </div>
            </div>
          </div>

          <div className={mobileFieldWrap}>
            <label className="block text-xs font-medium text-slate-500">Password</label>
            <div className={mobileInputBox}>
            <input
              type="text"
              name={fieldNames.password}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...antiAutofillProps}
              readOnly
              onFocus={preventAutofill}
              style={showPassword ? undefined : { WebkitTextSecurity: "disc" }}
              className={mobileInput}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-3 text-pink-500 hover:text-pink-600 focus:outline-none dark:opacity-70 dark:hover:opacity-100"
            >
              {showPassword ? (
                <img src={hide} alt="Hide" className="w-5 h-5 dark:invert" />
              ) : (
                <img src={view} alt="Show" className="w-5 h-5 dark:invert" />
              )}
            </button>
            </div>
          </div>

          <div className={mobileFieldWrap}>
            <label className="block text-xs font-medium text-slate-500">Confirm Password</label>
            <div className={mobileInputBox}>
            <input
              type="text"
              name={fieldNames.confirmPassword}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              {...antiAutofillProps}
              readOnly
              onFocus={preventAutofill}
              style={showPassword ? undefined : { WebkitTextSecurity: "disc" }}
              className={mobileInput}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-3 text-pink-500 hover:text-pink-600 focus:outline-none dark:opacity-70 dark:hover:opacity-100"
            >
              {showPassword ? (
                <img src={hide} alt="Hide" className="w-5 h-5 dark:invert" />
              ) : (
                <img src={view} alt="Show" className="w-5 h-5 dark:invert" />
              )}
            </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isEmailInvalid}
            className="mt-6 w-full rounded-lg bg-linear-to-r from-pink-500 to-purple-600 py-3 text-base font-bold text-white shadow-lg transition-all duration-200 hover:from-pink-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-8 sm:text-lg dark:shadow-[0_14px_34px_rgba(219,39,119,0.34)]"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="text-center text-sm font-bold text-slate-500">
            Already have an account?{" "}
            <button type="button" onClick={handleLoginClick} className="text-pink-500 hover:text-pink-600">
              Log In
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default RegisterPage;
