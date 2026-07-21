import User from "../model/userModel.js";
import { getPhoneValidationMessage, toE164PhoneNumber } from "../utils/phoneValidation.js";
import {
  generateOtp,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  verifyOtpHash,
} from "../utils/otp.js";
import { sendPhoneVerificationCode } from "../utils/sms.js";

const verificationFields = "+phoneVerificationCodeHash +phoneVerificationExpiresAt +phoneVerificationAttempts +phoneVerificationLastSentAt +phoneVerificationPendingPhone";

const maskPhone = (phone = "") => {
  const normalized = String(phone || "");
  if (normalized.length <= 4) return normalized || "your recovery phone";
  return `${normalized.slice(0, 3)}${"*".repeat(Math.max(4, normalized.length - 7))}${normalized.slice(-4)}`;
};

const clearVerificationCode = (user) => {
  user.phoneVerificationCodeHash = undefined;
  user.phoneVerificationExpiresAt = undefined;
  user.phoneVerificationAttempts = 0;
  user.phoneVerificationLastSentAt = undefined;
  user.phoneVerificationPendingPhone = undefined;
};

export const getRecoveryPhoneStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("phone country phoneVerifiedAt").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const phone = user.phone ? toE164PhoneNumber(user.phone, user.country) : "";
    res.status(200).json({
      hasPhone: Boolean(phone),
      maskedPhone: phone ? maskPhone(phone) : "",
      verified: Boolean(phone && user.phoneVerifiedAt),
      verifiedAt: user.phoneVerifiedAt || null,
    });
  } catch (error) {
    console.error("Get recovery phone status error:", error);
    res.status(500).json({ message: "Unable to load recovery phone status" });
  }
};

export const requestRecoveryPhoneCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(`phone country phoneVerifiedAt ${verificationFields}`);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.phone) return res.status(400).json({ message: "Add a recovery phone number in your Profile first." });

    const validationMessage = getPhoneValidationMessage(user.phone, user.country);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    const now = Date.now();
    if (user.phoneVerificationLastSentAt) {
      const remaining = OTP_RESEND_COOLDOWN_MS - (now - user.phoneVerificationLastSentAt.getTime());
      if (remaining > 0) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another code.`,
          retryAfter: Math.ceil(remaining / 1000),
        });
      }
    }

    const phone = toE164PhoneNumber(user.phone, user.country);
    const code = generateOtp();
    user.phoneVerificationCodeHash = hashOtp(code);
    user.phoneVerificationExpiresAt = new Date(now + OTP_TTL_MS);
    user.phoneVerificationAttempts = 0;
    user.phoneVerificationLastSentAt = new Date(now);
    user.phoneVerificationPendingPhone = phone;
    await user.save({ validateModifiedOnly: true });

    let delivery;
    try {
      delivery = await sendPhoneVerificationCode({ to: phone, code });
    } catch (error) {
      clearVerificationCode(user);
      await user.save({ validateModifiedOnly: true }).catch(() => {});
      throw error;
    }

    res.status(200).json({
      maskedPhone: maskPhone(phone),
      expiresAt: user.phoneVerificationExpiresAt,
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS),
      ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {}),
    });
  } catch (error) {
    console.error("Request recovery phone verification error:", error);
    res.status(error.status || 500).json({ message: error.message || "Unable to send the verification code" });
  }
};

export const verifyRecoveryPhoneCode = async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: "Enter the complete 6-digit code." });

    const user = await User.findById(req.user._id).select(`phone country phoneVerifiedAt ${verificationFields}`);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.phoneVerificationCodeHash || !user.phoneVerificationPendingPhone) {
      return res.status(400).json({ message: "Request a new verification code first." });
    }
    if (!user.phoneVerificationExpiresAt || user.phoneVerificationExpiresAt.getTime() <= Date.now()) {
      clearVerificationCode(user);
      await user.save({ validateModifiedOnly: true });
      return res.status(410).json({ message: "This verification code has expired." });
    }

    const currentPhone = toE164PhoneNumber(user.phone, user.country);
    if (currentPhone !== user.phoneVerificationPendingPhone) {
      clearVerificationCode(user);
      await user.save({ validateModifiedOnly: true });
      return res.status(409).json({ message: "The recovery phone changed. Request a new code." });
    }
    if ((user.phoneVerificationAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect attempts. Request a new code." });
    }
    if (!verifyOtpHash(code, user.phoneVerificationCodeHash)) {
      user.phoneVerificationAttempts = (user.phoneVerificationAttempts || 0) + 1;
      const locked = user.phoneVerificationAttempts >= OTP_MAX_ATTEMPTS;
      if (locked) {
        user.phoneVerificationCodeHash = undefined;
        user.phoneVerificationExpiresAt = undefined;
      }
      await user.save({ validateModifiedOnly: true });
      return res.status(locked ? 429 : 400).json({
        message: locked ? "Too many incorrect attempts. Request a new code." : "The verification code is incorrect.",
        attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - user.phoneVerificationAttempts),
      });
    }

    user.phoneVerifiedAt = new Date();
    clearVerificationCode(user);
    await user.save({ validateModifiedOnly: true });
    res.status(200).json({ verified: true, verifiedAt: user.phoneVerifiedAt, maskedPhone: maskPhone(currentPhone) });
  } catch (error) {
    console.error("Verify recovery phone error:", error);
    res.status(500).json({ message: "Unable to verify the recovery phone" });
  }
};
