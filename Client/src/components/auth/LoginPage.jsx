import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
import view from "../../assets/view.png";
import hide from "../../assets/hide.png";
import AuthenticationHelper from "./AuthenticationHelper.jsx";
import { authAPI } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { validateEmail } from "../../utils/emailValidation.js";

const dashboardPathByRole = {
  client: "/client/dashboard",
  employee: "/employee/dashboard",
  admin: "/admin/dashboard",
};

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
      login({ id: data.id, email: data.email, role: data.role }, data.token);
      resetForm();
      navigate(dashboardPathByRole[data.role] || "/client/dashboard", {
        replace: true,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError("Incorrect credentials");
      } else {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isEmailInvalid = !email || !!emailError;

  return (
    <>
      <div
        className={`con order-${order} md:order-${order1} flex min-h-screen w-full items-center justify-center bg-gray-100 px-6 py-12 sm:px-10 md:w-1/2 md:px-12 md:py-0 dark:bg-[#111111]`}
      >
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-6 bg-transparent sm:max-w-md sm:space-y-8 dark:max-w-[528px] dark:rounded-2xl dark:border dark:border-pink-200/90 dark:px-10 dark:py-12 dark:shadow-[0_0_42px_rgba(219,39,119,0.22)]"
          autoComplete="off"
        >
          <div className="mb-8 flex flex-col items-center sm:mb-10">
            <img
              src={logo}
              alt="CLIENTRA"
              className="h-32 w-32 object-contain sm:h-40 sm:w-40 md:h-44 md:w-44"
            />
            <h2
              className="mt-0 text-2xl font-bold uppercase tracking-wide text-neutral-950 sm:text-3xl dark:text-white"
              style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
            >
              LOG IN
            </h2>
          </div>

          {error && (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:mb-6 dark:rounded-lg dark:border-red-400/60 dark:bg-red-500/10 dark:text-sm dark:font-semibold dark:text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-6 sm:space-y-8">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
                autoComplete="off"
                className="w-full border-0 border-b border-black bg-transparent pb-2 text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:border-white/40 dark:bg-[#283241] dark:text-white dark:placeholder:text-white/85"
                required
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-500 dark:font-semibold dark:text-red-300">{emailError}</p>
              )}
            </div>

            <div className="flex items-center border-b-2 border-gray-400 dark:border-white/40 dark:bg-[#283241]">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="min-w-0 flex-1 border-0 bg-transparent pb-2 text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-white/85"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="grid pb-2 pl-3 text-pink-500 transition hover:text-pink-600 dark:opacity-70 dark:hover:opacity-100"
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

          <button
            type="submit"
            disabled={loading || isEmailInvalid}
            className="mt-6 w-full rounded-lg bg-linear-to-r from-pink-500 to-purple-600 py-3 text-base font-medium text-white shadow-lg transition-all duration-200 hover:from-pink-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-8 sm:text-lg dark:shadow-[0_14px_34px_rgba(219,39,119,0.34)] dark:hover:brightness-110"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div>
            <AuthenticationHelper
              link="/register"
              Label="Create Account"
              Label1="Forgot Password?"
            />
          </div>
        </form>
      </div>
    </>
  );
};

export default LoginPage;
