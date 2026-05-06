import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/CLIENTRA.png";
import view from "../../assets/view.png";
import hide from "../../assets/hide.png";
import AuthenticationHelper from "./AuthenticationHelper.jsx";
import { authAPI } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

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

    setLoading(true);

    try {
      const data = await authAPI.login(email, password);
      login({ id: data.id, email: data.email, role: data.role }, data.token);
      resetForm();
      navigate(dashboardPathByRole[data.role] || "/client/dashboard");
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

  useEffect(() => {
    resetForm();
    const timer = setTimeout(resetForm, 100);
    return () => clearTimeout(timer);
  }, [resetForm]);

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

        <form onSubmit={handleSubmit} className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8" autoComplete="off">
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
                autoComplete="off"
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
              autoComplete="current-password"
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
            className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600
           hover:to-purple-700 transition-all duration-200 shadow-lg mt-6 sm:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing In..." : "Sign In"}
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
