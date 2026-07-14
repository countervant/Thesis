import crypto from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const otpSecret = () => process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;

export const hashOtp = (otp) =>
  crypto.createHmac("sha256", otpSecret()).update(String(otp)).digest("hex");

export const verifyOtpHash = (otp, expectedHash) => {
  if (!expectedHash) return false;
  const received = Buffer.from(hashOtp(otp), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

export const maskEmail = (email = "") => {
  const [name = "", domain = ""] = String(email).split("@");
  if (!domain) return "your registered email";
  const visible = name.slice(0, Math.min(4, Math.max(1, name.length - 1)));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};
