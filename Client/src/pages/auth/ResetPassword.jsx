import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Welcome from "../../components/auth/Welcome.jsx";
import { authAPI } from "../../services/api.js";
import AuthenticationHelper from "../../components/auth/AuthenticationHelper.jsx";
import hideIcon from "../../assets/hide.png";
import viewIcon from "../../assets/view.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get("email") || "";
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!otp.trim()) {
      setError("OTP is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(email.trim(), otp.trim(), password);
      setMessage("Password reset successfully. You can now log in.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResendMessage("");

    if (!email.trim()) {
      setError("Email is required to resend the code");
      return;
    }

    try {
      setResendLoading(true);
      await authAPI.forgotPassword(email.trim());
      setResendMessage("If that email is registered, a new code was sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen md:flex-row">
      <div className="hidden md:block md:w-1/2">
        <Welcome text="Reset Password" />
      </div>
      <div className="w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 py-12 md:py-0">
        <h2
          className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-10 tracking-wide uppercase"
          style={{ fontFamily: "'Bruno Ace SC', sans-serif" }}
        >
          Set New Password
        </h2>

        <form onSubmit={handleSubmit} className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          {resendMessage && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              {resendMessage}
            </div>
          )}

          <div className="border-b-2 border-gray-400">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
          </div>

          <div className="border-b-2 border-gray-400">
            <input
              type="text"
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-transparent border-none outline-none pb-2 text-gray-800 placeholder-gray-400"
              required
            />
          </div>

          <div className="relative border-b-2 border-gray-400">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-none outline-none pb-2 pr-16 text-gray-800 placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1"
            >
              <img
                src={showPassword ? hideIcon : viewIcon}
                alt={showPassword ? "Hide password" : "Show password"}
                className="w-5 h-5"
              />
            </button>
          </div>

          <div className="relative border-b-2 border-gray-400">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent border-none outline-none pb-2 pr-16 text-gray-800 placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1"
            >
              <img
                src={showConfirmPassword ? hideIcon : viewIcon}
                alt={showConfirmPassword ? "Hide password" : "Show password"}
                className="w-5 h-5"
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-medium text-base sm:text-lg bg-linear-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg mt-6 sm:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
        <div className="w-full max-w-sm sm:max-w-md mt-5 space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full py-2 rounded-lg text-pink-600 border border-pink-200 hover:bg-pink-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading ? "Resending..." : "Resend Code"}
          </button>
          <AuthenticationHelper
            link="/"
            Label="Back to Login"
            Label1=""
          />
        </div>
      </div>
     
    </div>
  );
};

export default ResetPassword;
