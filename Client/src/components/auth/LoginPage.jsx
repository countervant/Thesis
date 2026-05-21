import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
import mobileLogo from "../../assets/CLIENTRA2.png";
import view from "../../assets/view.png";
import hide from "../../assets/hide.png";
import AuthenticationHelper from "./AuthenticationHelper.jsx";
import { authAPI } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { getAuthErrorMessage } from "../../utils/authErrors.js";
import { validateEmail } from "../../utils/emailValidation.js";

const dashboardPathByRole = {
  client: "/client/dashboard",
  employee: "/employee/dashboard",
  admin: "/admin/dashboard",
};

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const LoginPage = ({ order, order1 }) => {
  const formRef = useRef(null);
  const emailFieldNameRef = useRef(`login_contact_${Date.now()}`);
  const passwordFieldNameRef = useRef(`login_secret_${Date.now()}`);
  const [suppressCredentialAutofill] = useState(
    () => sessionStorage.getItem("clientraSuppressLoginAutofillOnce") === "true"
  );
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const hasUserInteractedRef = useRef(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const resetForm = useCallback(() => {
    setEmail("");
    setEmailError("");
    setPassword("");
    setShowPassword(false);
    setHasSubmitted(false);
  }, []);

  useEffect(() => {
    const clearBrowserPrefill = () => {
      if (!suppressCredentialAutofill) return;
      if (hasUserInteractedRef.current) return;

      resetForm();
      formRef.current?.querySelectorAll("input").forEach((input) => {
        input.value = "";
      });

      if (emailInputRef.current) {
        emailInputRef.current.value = "";
      }
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
    };

    if (suppressCredentialAutofill) {
      sessionStorage.removeItem("clientraSuppressLoginAutofillOnce");
    }

    clearBrowserPrefill();
    const timeoutIds = [50, 250, 800, 1500, 3000, 5000].map((delay) =>
      window.setTimeout(clearBrowserPrefill, delay)
    );
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        window.setTimeout(clearBrowserPrefill, 0);
      }
    };

    window.addEventListener("pageshow", clearBrowserPrefill);
    window.addEventListener("focus", clearBrowserPrefill);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.removeEventListener("pageshow", clearBrowserPrefill);
      window.removeEventListener("focus", clearBrowserPrefill);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetForm, suppressCredentialAutofill]);

  const handleEmailChange = (e) => {
    hasUserInteractedRef.current = true;
    const value = e.target.value;
    setEmail(value);
    setEmailError(hasSubmitted ? validateEmail(value) : "");
  };

  const handlePasswordChange = (e) => {
    hasUserInteractedRef.current = true;
    setPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setHasSubmitted(true);

    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) return;

    setLoading(true);

    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem("token", data.token);

      let profile = null;
      try {
        profile = await authAPI.getMe();
      } catch (profileError) {
        console.warn("[auth] Unable to refresh profile after login", profileError);
      }

      const role = normalizeRole(profile?.role || profile?.type || data.role);
      const userData = profile
        ? {
            id: profile._id || profile.id || data.id,
            ...profile,
            role,
          }
        : { id: data.id, email: data.email, role };

      if (!role) {
        localStorage.removeItem("token");
        setError("Login succeeded, but this account has no role. Please ask the admin to check the account role in the database.");
        return;
      }

      login(userData, data.token);
      sessionStorage.setItem("clientraBackLockedAfterLogin", "true");
      resetForm();
      navigate(dashboardPathByRole[role] || "/dashboard", {
        replace: true,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError("Incorrect credentials");
      } else {
        setError(getAuthErrorMessage(err, "Login failed. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`con order-${order} md:order-${order1} relative z-20 -mt-20 flex w-full flex-1 flex-col items-center justify-start bg-transparent px-3 pb-5 pt-0 sm:px-10 md:mt-0 md:min-h-screen md:w-1/2 md:justify-center md:bg-gray-100 md:px-12 md:py-0 dark:md:bg-[#111111]`}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="min-h-[500px] w-full max-w-lg space-y-5 rounded-[2.25rem] bg-white px-6 py-8 shadow-[0_18px_35px_rgba(15,23,42,0.16)] sm:max-w-md sm:space-y-8 md:min-h-0 md:max-w-sm md:bg-transparent md:px-0 md:py-0 md:shadow-none dark:bg-[#141414] dark:md:max-w-[528px] dark:md:rounded-2xl dark:md:border dark:md:border-pink-200/90 dark:md:px-10 dark:md:py-12 dark:md:shadow-[0_0_42px_rgba(219,39,119,0.22)]"
          autoComplete={suppressCredentialAutofill ? "new-password" : "on"}
          data-form-type="other"
        >
          <div className="mb-5 flex flex-col items-center sm:mb-10">
            <picture>
              <source media="(min-width: 768px)" srcSet={logo} />
              <img
                src={mobileLogo}
                alt="CLIENTRA"
                className="h-14 w-14 object-contain sm:h-24 sm:w-24 md:h-44 md:w-44"
              />
            </picture>
            <h2
              className="mt-4 text-2xl font-bold uppercase tracking-wide text-neutral-950 sm:mt-5 sm:text-3xl md:mt-0 dark:text-white"
              style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
            >
              LOG IN
            </h2>
            <p className="mt-2 text-center text-sm font-medium text-slate-500 md:hidden">
              Welcome back! Please sign in to continue.
            </p>
          </div>

          {error && (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:mb-6 dark:rounded-lg dark:border-red-400/60 dark:bg-red-500/10 dark:text-sm dark:font-semibold dark:text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-5 sm:space-y-8">
            <div>
              <div className="relative">
              <input
                ref={emailInputRef}
                type="email"
                name={suppressCredentialAutofill ? emailFieldNameRef.current : "username"}
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
                onFocus={(event) => {
                  event.currentTarget.removeAttribute("readOnly");
                  hasUserInteractedRef.current = true;
                }}
                disabled={loading}
                autoComplete={suppressCredentialAutofill ? "new-password" : "username"}
                autoCorrect={suppressCredentialAutofill ? "off" : undefined}
                autoCapitalize={suppressCredentialAutofill ? "none" : undefined}
                spellCheck={suppressCredentialAutofill ? "false" : undefined}
                data-lpignore={suppressCredentialAutofill ? "true" : undefined}
                data-1p-ignore={suppressCredentialAutofill ? "true" : undefined}
                data-bwignore={suppressCredentialAutofill ? "true" : undefined}
                readOnly={suppressCredentialAutofill}
                className="login-autofill-fix h-12 w-full rounded-none border-0 border-b-2 border-slate-300 bg-transparent px-0 text-sm font-medium text-gray-800 outline-none placeholder:text-slate-400 focus:border-pink-400 focus:ring-0 md:text-base dark:border-white/40 dark:text-white dark:placeholder:text-white/85"
                required
              />
              </div>
              {emailError && (
                <p className="mt-2 text-xs text-red-500 md:text-sm dark:font-semibold dark:text-red-300">{emailError}</p>
              )}
            </div>

            <div>
              <div className="relative flex h-12 items-center border-b-2 border-slate-300 bg-transparent focus-within:border-pink-400 dark:border-white/40">
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                name={suppressCredentialAutofill ? passwordFieldNameRef.current : "password"}
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                onFocus={(event) => {
                  event.currentTarget.removeAttribute("readOnly");
                  hasUserInteractedRef.current = true;
                }}
                disabled={loading}
                autoComplete={suppressCredentialAutofill ? "new-password" : "current-password"}
                autoCorrect={suppressCredentialAutofill ? "off" : undefined}
                autoCapitalize={suppressCredentialAutofill ? "none" : undefined}
                spellCheck={suppressCredentialAutofill ? "false" : undefined}
                data-lpignore={suppressCredentialAutofill ? "true" : undefined}
                data-1p-ignore={suppressCredentialAutofill ? "true" : undefined}
                data-bwignore={suppressCredentialAutofill ? "true" : undefined}
                readOnly={suppressCredentialAutofill}
                className="login-autofill-fix min-w-0 flex-1 border-0 bg-transparent px-0 pr-2 text-sm font-medium text-gray-800 outline-none placeholder:text-slate-400 focus:ring-0 md:text-base dark:text-white dark:placeholder:text-white/85"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="grid pl-4 text-pink-500 transition hover:text-pink-600 dark:opacity-70 dark:hover:opacity-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <img src={hide} alt="" className="h-5 w-5 dark:invert" />
                ) : (
                  <img src={view} alt="" className="h-5 w-5 dark:invert" />
                )}
              </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-linear-to-r from-pink-500 to-purple-600 py-3 text-base font-bold text-white shadow-lg transition-all duration-200 hover:from-pink-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-8 md:text-lg dark:shadow-[0_14px_34px_rgba(219,39,119,0.34)] dark:hover:brightness-110"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="flex items-center gap-3 pt-1 text-sm font-medium text-slate-500 md:hidden">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="pt-1 md:pt-0">
            <AuthenticationHelper
              link="/register"
              Label="Create Account"
              Label1="Forgot Password?"
              mobileInline
            />
          </div>
        </form>
        <p className="mt-auto pt-8 text-center text-xs font-medium text-slate-500 md:hidden">
          &copy; 2026 Dream Light Visual. All rights reserved.
        </p>
        <p className="absolute bottom-8 hidden text-center text-xs font-medium text-slate-500 md:block">
          &copy; 2026 Dream Light Visual. All rights reserved.
        </p>
      </div>
    </>
  );
};

export default LoginPage;
