import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ForgotPasswordkey from "../assets/ForgotPassword-key.png";
import AuthenticationHelper from "./AuthenticationHelper";
import { authAPI } from "../services/api.js";

const ForgotPasswordcom = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? "" : "Enter a valid email";
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

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
      <div className="w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 py-12 md:py-0">
        <img
          src={ForgotPasswordkey}
          alt="Forgot Password Key"
          className="w-32 h-32"
        />
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-wide uppercase mt-10"
          style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
        >
          Forgot Password?
        </h1>
        <h2>Enter Your Gmail so we can reset your password</h2>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8 mt-10"
        >
          <div className="border-b border-black mb-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={handleEmailChange}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
          </div>
          {emailError && <p className="text-sm text-red-500">{emailError}</p>}
          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={isEmailInvalid || loading}
            className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600
           hover:to-purple-700 transition-all duration-200 shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>

        <div className="w-100 max-w-sm sm:max-w-md space-y-6 sm:space-y-8 mt-5">
          <AuthenticationHelper
            link="/"
            Label="Back to Login"
            Label1=""
          />
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordcom;
