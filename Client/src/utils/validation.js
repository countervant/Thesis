/**
 * Shared form-validation helpers.
 * Keeps validation logic in one place so every auth form behaves consistently.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;

/** Returns an error string or empty string when valid. */
export const validateEmail = (value) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Email is required";
  return EMAIL_RE.test(trimmed) ? "" : "Enter a valid email";
};

/** Returns an error string or empty string when valid. */
export const validatePassword = (value) => {
  if (!value) return "Password is required";
  if (value.length < PASSWORD_MIN)
    return `Password must be at least ${PASSWORD_MIN} characters`;
  return "";
};

/** Returns an error string or empty string when passwords match. */
export const validateConfirmPassword = (password, confirm) => {
  if (!confirm) return "Please confirm your password";
  return password === confirm ? "" : "Passwords do not match";
};
