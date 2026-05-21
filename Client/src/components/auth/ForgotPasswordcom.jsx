import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForgotPasswordkey from "../../assets/ForgotPassword-key.png";
import AuthenticationHelper from "./AuthenticationHelper";
import { authAPI } from "../../services/api.js";
import { validateEmail } from "../../utils/emailValidation.js";

const ForgotPasswordcom = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const emailInputRef = useRef(null);
  const emailFieldNameRef = useRef(`forgot_contact_${Date.now()}`);
  const hasUserInteractedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (e) => {
    hasUserInteractedRef.current = true;
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  useEffect(() => {
    sessionStorage.setItem("clientraSuppressLoginAutofillOnce", "true");
  }, []);

  useEffect(() => {
    const clearBrowserPrefill = () => {
      if (hasUserInteractedRef.current) return;

      setEmail("");
      setEmailError("");
      formRef.current?.querySelectorAll("input").forEach((input) => {
        input.value = "";
      });

      if (emailInputRef.current) {
        emailInputRef.current.value = "";
      }
    };

    clearBrowserPrefill();
    const timeoutIds = [50, 250, 800, 1500, 3000].map((delay) =>
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateEmail(email);
    setEmailError(validation);
    if (validation) return;

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");
      await authAPI.forgotPassword(email);
      setMessage("If that email is registered, we sent reset instructions.");
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Email is not registered";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isEmailInvalid = !email || !!emailError;

  return (
    <>
      <div className="relative z-20 flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 px-3 py-8 md:min-h-screen md:w-1/2 md:px-12 md:py-0 dark:bg-[#111111]">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="w-full max-w-lg space-y-5 rounded-[2.25rem] bg-white px-6 py-8 shadow-[0_18px_35px_rgba(15,23,42,0.16)] sm:max-w-md sm:space-y-8 md:max-w-sm md:bg-transparent md:px-0 md:py-0 md:shadow-none dark:bg-[#141414] dark:md:max-w-[528px] dark:md:rounded-2xl dark:md:border dark:md:border-pink-200/90 dark:md:px-10 dark:md:py-12 dark:md:shadow-[0_0_42px_rgba(219,39,119,0.22)]"
          autoComplete="new-password"
          data-form-type="other"
        >
          <div className="mb-5 flex flex-col items-center sm:mb-10">
            <img
              src={ForgotPasswordkey}
              alt="Forgot Password Key"
              className="h-20 w-20 object-contain sm:h-32 sm:w-32 md:h-36 md:w-36"
            />
            <h1
              className="mt-2 text-center text-2xl font-bold uppercase tracking-wide text-neutral-950 sm:text-3xl dark:text-white"
              style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
            >
              Forgot Password?
            </h1>
            <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-white/80">
              Enter your email so we can send a reset code.
            </p>
          </div>

          <div>
            <div className="relative">
            <input
              ref={emailInputRef}
              type="email"
              name={emailFieldNameRef.current}
              placeholder="Enter your email"
              value={email}
              onChange={handleEmailChange}
              onFocus={(event) => {
                event.currentTarget.removeAttribute("readOnly");
              }}
              disabled={loading}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              readOnly
              className="login-autofill-fix h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-gray-800 outline-none placeholder:text-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 md:text-base dark:border-white/40 dark:bg-[#1f2937] dark:text-white dark:placeholder:text-white/85"
              required
            />
            </div>
          </div>
          {emailError && <p className="text-sm text-red-500">{emailError}</p>}
          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={isEmailInvalid || loading}
            className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600
           hover:to-purple-700 transition-all duration-200 shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>

          <div className="pt-1 md:pt-0">
            <AuthenticationHelper
              link="/"
              Label="Back to Login"
              Label1=""
              mobileInline
            />
          </div>
        </form>
      </div>
    </>
  );
};

export default ForgotPasswordcom;
