import React, { useState } from "react";
import logo from "../assets/CLIENTRA.png";
import view from "../assets/view.png";
import hide from "../assets/hide.png";
import AuthenticationHelper from "./AuthenticationHelper.jsx";
const LoginPage = ({ order, order1 }) => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationMessage = validateEmail(email);
    setEmailError(validationMessage);
    if (validationMessage) return;
    // TODO: hook up real sign-in logic when available
  };

  const isEmailInvalid = !email || !!emailError;
  return (
    <>
      <div
        className={`con order-${order} md:order-${order1} w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 py-12 md:py-0`}
      >
        <img
          src={logo}
          alt="CLIENTRA"
          className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain"
        />
        <h2
          className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-10 tracking-wide uppercase"
          style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
        >
          LOG IN
        </h2>

        <form
          className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <div className="border-b border-black mb-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
                className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <div className="border-b-2 border-gray-400 flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
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
            disabled={isEmailInvalid}
            className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600
           hover:to-purple-700 transition-all duration-200 shadow-lg mt-6 sm:mt-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Sign In
          </button>

          <AuthenticationHelper
            link="/register"
            Label="Create Account"
            Label1="Forgot Password?"
          />
        </form>
      </div>
    </>
  );
};

export default LoginPage;
