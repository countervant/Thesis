import jwt from "jsonwebtoken";
import User from "../model/userModel.js";
import { sendTwoFactorCode } from "../utils/email.js";
import {
  generateOtp,
  hashOtp,
  maskEmail,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  verifyOtpHash,
} from "../utils/otp.js";

const otpFields = "+twoFactorCodeHash +twoFactorExpiresAt +twoFactorAttempts +twoFactorLastSentAt +twoFactorPurpose";
const logSecurityEvent = (event, userId, details = "") =>
  console.info(`[security] ${event} user=${userId}${details ? ` ${details}` : ""}`);

const accessToken = (id) => jwt.sign({ id, type: "access" }, process.env.JWT_SECRET, { expiresIn: "30d" });
const temporaryToken = (id) => jwt.sign({ id, type: "two-factor" }, process.env.JWT_SECRET, { expiresIn: "10m" });

const publicUser = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  twoFactorEnabled: Boolean(user.twoFactorEnabled),
  twoFactorSetupRequired: user.role === "admin" && !user.twoFactorEnabled,
});

const clearOtp = (user) => {
  user.twoFactorCodeHash = undefined;
  user.twoFactorExpiresAt = undefined;
  user.twoFactorAttempts = 0;
  user.twoFactorLastSentAt = undefined;
  user.twoFactorPurpose = undefined;
};

const sendOtp = async (user, purpose, enforceCooldown = false) => {
  const now = Date.now();
  if (enforceCooldown && user.twoFactorLastSentAt) {
    const remaining = OTP_RESEND_COOLDOWN_MS - (now - user.twoFactorLastSentAt.getTime());
    if (remaining > 0) {
      const error = new Error(`Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another code.`);
      error.status = 429;
      error.retryAfter = Math.ceil(remaining / 1000);
      throw error;
    }
  }

  const code = generateOtp();
  user.twoFactorCodeHash = hashOtp(code);
  user.twoFactorExpiresAt = new Date(now + OTP_TTL_MS);
  user.twoFactorAttempts = 0;
  user.twoFactorLastSentAt = new Date(now);
  user.twoFactorPurpose = purpose;
  await user.save({ validateModifiedOnly: true });

  try {
    await sendTwoFactorCode({ to: user.email, code, purpose });
  } catch (error) {
    clearOtp(user);
    await user.save({ validateModifiedOnly: true }).catch(() => {});
    throw error;
  }

  logSecurityEvent("2fa_code_sent", user._id, `purpose=${purpose}`);
  return {
    maskedEmail: maskEmail(user.email),
    expiresAt: user.twoFactorExpiresAt,
    resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS),
  };
};

const readTemporaryToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== "two-factor") throw new Error("Invalid verification session");
  return decoded;
};

const validateCode = async (user, code, purpose) => {
  if (!/^\d{6}$/.test(String(code || ""))) {
    return { status: 400, message: "Enter the complete 6-digit code." };
  }
  if (!user.twoFactorCodeHash || user.twoFactorPurpose !== purpose) {
    return { status: 400, message: "This verification code is no longer valid." };
  }
  if (!user.twoFactorExpiresAt || user.twoFactorExpiresAt.getTime() <= Date.now()) {
    clearOtp(user);
    await user.save({ validateModifiedOnly: true });
    return { status: 410, message: "This verification code has expired." };
  }
  if ((user.twoFactorAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    return { status: 429, message: "Too many incorrect attempts. Request a new code." };
  }
  if (!verifyOtpHash(code, user.twoFactorCodeHash)) {
    user.twoFactorAttempts = (user.twoFactorAttempts || 0) + 1;
    const locked = user.twoFactorAttempts >= OTP_MAX_ATTEMPTS;
    if (locked) {
      user.twoFactorCodeHash = undefined;
      user.twoFactorExpiresAt = undefined;
    }
    await user.save({ validateModifiedOnly: true });
    logSecurityEvent("2fa_code_rejected", user._id, `attempt=${user.twoFactorAttempts}`);
    return {
      status: locked ? 429 : 400,
      message: locked ? "Too many incorrect attempts. Request a new code." : "The verification code is incorrect.",
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - user.twoFactorAttempts),
    };
  }
  return null;
};

export const login = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ message: "Please provide email and password" });

  try {
    const user = await User.findOne({ email }).select("password role email isActive twoFactorEnabled");
    if (!user || !(await user.matchPassword(password)) || user.isActive === false) {
      logSecurityEvent("login_rejected", user?._id || "unknown");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.twoFactorEnabled) {
      const otpUser = await User.findById(user._id).select(otpFields);
      const delivery = await sendOtp(otpUser, "login");
      return res.status(200).json({
        requiresTwoFactor: true,
        temporaryToken: temporaryToken(user._id),
        ...delivery,
      });
    }

    logSecurityEvent("login_succeeded", user._id, "twoFactor=false");
    return res.status(200).json({ ...publicUser(user), token: accessToken(user._id) });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Login is temporarily unavailable. Please try again." });
  }
};

export const verifyLoginTwoFactor = async (req, res) => {
  try {
    const decoded = readTemporaryToken(req.body?.temporaryToken);
    const user = await User.findById(decoded.id).select(`email role twoFactorEnabled ${otpFields}`);
    if (!user?.twoFactorEnabled) return res.status(401).json({ message: "Invalid verification session." });
    const validationError = await validateCode(user, req.body?.code, "login");
    if (validationError) return res.status(validationError.status).json(validationError);

    clearOtp(user);
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateModifiedOnly: true });
    logSecurityEvent("2fa_login_verified", user._id);
    return res.json({ ...publicUser(user), token: accessToken(user._id) });
  } catch (error) {
    const expired = error?.name === "TokenExpiredError";
    return res.status(expired ? 410 : 401).json({ message: expired ? "Your verification session has expired. Sign in again." : "Invalid verification session." });
  }
};

export const resendLoginTwoFactor = async (req, res) => {
  try {
    const decoded = readTemporaryToken(req.body?.temporaryToken);
    const user = await User.findById(decoded.id).select(`email twoFactorEnabled ${otpFields}`);
    if (!user?.twoFactorEnabled) return res.status(401).json({ message: "Invalid verification session." });
    const delivery = await sendOtp(user, "login", true);
    return res.json({ message: "A new code was sent.", ...delivery });
  } catch (error) {
    if (error.retryAfter) res.set("Retry-After", String(error.retryAfter));
    const expired = error?.name === "TokenExpiredError";
    return res.status(error.status || (expired ? 410 : 401)).json({ message: expired ? "Your verification session has expired. Sign in again." : error.message || "Unable to resend the code." });
  }
};

export const getTwoFactorStatus = async (req, res) => {
  const user = await User.findById(req.user._id).select("email role twoFactorEnabled").lean();
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({
    enabled: Boolean(user.twoFactorEnabled),
    required: user.role === "admin",
    method: "Email",
    maskedEmail: maskEmail(user.email),
  });
};

export const requestEnableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(`password email role twoFactorEnabled ${otpFields}`);
    if (!req.body?.password || !(await user.matchPassword(req.body.password))) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    if (user.twoFactorEnabled) return res.status(409).json({ message: "Two-factor authentication is already enabled." });
    const delivery = await sendOtp(user, "enable", true);
    logSecurityEvent("2fa_enable_requested", user._id);
    return res.json({ message: "Verification code sent.", ...delivery });
  } catch (error) {
    console.error("Enable 2FA request error:", error);
    return res.status(error.status || 500).json({ message: error.message || "Unable to start two-factor setup." });
  }
};

export const verifyEnableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(`email role twoFactorEnabled ${otpFields}`);
    if (user.twoFactorEnabled) return res.status(409).json({ message: "Two-factor authentication is already enabled." });
    const validationError = await validateCode(user, req.body?.code, "enable");
    if (validationError) return res.status(validationError.status).json(validationError);
    user.twoFactorEnabled = true;
    clearOtp(user);
    await user.save({ validateModifiedOnly: true });
    logSecurityEvent("2fa_enabled", user._id);
    return res.json({ message: "Two-factor authentication is now enabled.", enabled: true });
  } catch (error) {
    console.error("Enable 2FA verification error:", error);
    return res.status(500).json({ message: "Unable to verify the code." });
  }
};

export const disableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select(`password role twoFactorEnabled ${otpFields}`);
  if (user.role === "admin") return res.status(403).json({ message: "Two-factor authentication is required for Admin accounts." });
  if (!req.body?.password || !(await user.matchPassword(req.body.password))) {
    return res.status(401).json({ message: "Current password is incorrect." });
  }
  user.twoFactorEnabled = false;
  clearOtp(user);
  await user.save({ validateModifiedOnly: true });
  logSecurityEvent("2fa_disabled", user._id);
  return res.json({ message: "Two-factor authentication has been disabled.", enabled: false });
};
