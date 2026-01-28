import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
import view from "../../assets/view.png";
import hide from "../../assets/hide.png";
import AuthenticationHelper from "./AuthenticationHelper.jsx";
import { authAPI } from "../../services/api.js";

const RegisterPage = ({ order, order1 }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState("Client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const userTypes = ["Admin", "Employee", "Client"];

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
    setError("");

    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await authAPI.register(email, password, userType);
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

        <div className="flex gap-4 mb-4">
          {userTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setUserType(type)}
              className={`px-4 py-2 rounded text-black bg-white transition-colors duration-300 ${
                userType === type
                  ? "bg-linear-to-r from-[#EF35A2] to-[#9E1DF4] text-white"
                  : "shadow-[10px_10px_20px] shadow-gray-500 hover:shadow-[#EF35A2]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
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
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <div className="border-b-2 border-gray-400 flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-pink-500 hover:text-pink-600 focus:outline-none pb-2 pl-3"
              aria-label={showPassword ? "Hide password" : "Show password"}
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
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="text-pink-500 hover:text-pink-600 focus:outline-none pb-2 pl-3"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? (
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
