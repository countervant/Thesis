import crypto from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

export const normalizeBackupCode = (code) =>
  String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const generateBackupCodes = () => {
  const codes = new Set();
  while (codes.size < BACKUP_CODE_COUNT) {
    const value = Array.from({ length: 8 }, () =>
      BACKUP_CODE_ALPHABET[crypto.randomInt(0, BACKUP_CODE_ALPHABET.length)]
    ).join("");
    codes.add(`${value.slice(0, 4)}-${value.slice(4)}`);
  }
  return [...codes];
};

export const hashBackupCode = (code) =>
  crypto
    .createHmac("sha256", otpSecret())
    .update(`backup:${normalizeBackupCode(code)}`)
    .digest("hex");

export const verifyBackupCodeHash = (code, expectedHash) => {
  if (!expectedHash || normalizeBackupCode(code).length !== 8) return false;
  const received = Buffer.from(hashBackupCode(code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

export const maskEmail = (email = "") => {
  const [name = "", domain = ""] = String(email).split("@");
  if (!domain) return "your registered email";
  const visible = name.slice(0, Math.min(4, Math.max(1, name.length - 1)));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};
