import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
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
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const resetForm = useCallback(() => {
    setEmail("");
    setEmailError("");
    setPassword("");
    setShowPassword(false);
  }, []);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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

  const isEmailInvalid = !email || !!emailError;

  return (
    <>
      <div
        className={`con order-${order} md:order-${order1} relative z-20 -mt-20 flex w-full items-start justify-center bg-transparent px-5 pb-8 pt-0 sm:px-10 md:mt-0 md:min-h-screen md:w-1/2 md:items-center md:bg-gray-100 md:px-12 md:py-0 dark:md:bg-[#111111]`}
      >
        <form
          onSubmit={handleSubmit}
          className="min-h-[500px] w-full max-w-sm space-y-5 rounded-[2.25rem] bg-white px-6 py-8 shadow-[0_18px_35px_rgba(15,23,42,0.16)] sm:max-w-md sm:space-y-8 md:min-h-0 md:max-w-sm md:bg-transparent md:px-0 md:py-0 md:shadow-none dark:bg-[#141414] dark:md:max-w-[528px] dark:md:rounded-2xl dark:md:border dark:md:border-pink-200/90 dark:md:px-10 dark:md:py-12 dark:md:shadow-[0_0_42px_rgba(219,39,119,0.22)]"
          autoComplete="off"
        >
          <div className="mb-5 flex flex-col items-center sm:mb-10">
            <img
              src={logo}
              alt="CLIENTRA"
              className="hidden object-contain md:block md:h-44 md:w-44"
            />
            <h2
              className="mt-0 text-2xl font-bold uppercase tracking-wide text-neutral-950 sm:text-3xl dark:text-white"
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
              <label className="mb-2 block text-sm font-medium text-slate-500 md:hidden">Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-pink-500 md:hidden">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                  </svg>
                </span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                autoComplete="off"
                className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-14 pr-4 text-sm font-medium text-gray-800 outline-none placeholder:text-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 md:h-auto md:rounded-none md:border-0 md:border-b md:border-black md:bg-transparent md:px-0 md:pb-2 md:text-base md:focus:border-black md:focus:ring-0 dark:border-white/40 dark:bg-[#1f2937] dark:text-white dark:placeholder:text-white/85 dark:md:bg-[#283241]"
                required
              />
              </div>
              {emailError && (
                <p className="mt-2 text-xs text-red-500 md:text-sm dark:font-semibold dark:text-red-300">{emailError}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-500 md:hidden">Password</label>
              <div className="relative flex h-12 items-center rounded-lg border border-slate-200 bg-white md:h-auto md:rounded-none md:border-0 md:border-b-2 md:border-gray-400 md:bg-transparent dark:border-white/40 dark:bg-[#1f2937] dark:md:bg-[#283241]">
                <span className="pointer-events-none absolute left-5 text-pink-500 md:hidden">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                  </svg>
                </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="min-w-0 flex-1 border-0 bg-transparent pl-14 pr-2 text-sm font-medium text-gray-800 outline-none placeholder:text-slate-400 focus:ring-0 md:pl-0 md:pb-2 md:text-base dark:text-white dark:placeholder:text-white/85"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="grid px-5 text-pink-500 transition hover:text-pink-600 md:pb-2 md:pl-3 md:pr-0 dark:opacity-70 dark:hover:opacity-100"
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
            disabled={loading || isEmailInvalid}
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
          <p className="pt-1 text-center text-xs font-medium text-slate-500 md:hidden">
            &copy; 2026 Dream Light Visual. All rights reserved.
          </p>
        </form>
      </div>
    </>
  );
};

export default LoginPage;
