export const normalizePhoneNumber = (phone = "") =>
  String(phone).trim().replace(/[^\d+]/g, "");

export const isValidPhoneNumber = (phone = "") => {
  const trimmedPhone = String(phone).trim();

  if (!trimmedPhone) {
    return true;
  }

  if (!/^\+?[\d\s().-]+$/.test(trimmedPhone)) {
    return false;
  }

  if ((trimmedPhone.match(/\+/g) || []).length > 1) {
    return false;
  }

  if (trimmedPhone.includes("+") && !trimmedPhone.startsWith("+")) {
    return false;
  }

  const digits = trimmedPhone.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return false;
  }

  if (/^0+$/.test(digits)) {
    return false;
  }

  return true;
};
