export const isValidPhoneNumber = (phone = "") => {
  const trimmedPhone = String(phone).trim();

  if (!trimmedPhone) {
    return true;
  }

  const phoneWithoutExtension = trimmedPhone.replace(
    /\s*(?:ext\.?|extension|x)\s*\d+\s*$/i,
    ""
  );

  if (!/^\+?[\d\s().-]+$/.test(phoneWithoutExtension)) {
    return false;
  }

  if ((phoneWithoutExtension.match(/\+/g) || []).length > 1) {
    return false;
  }

  if (phoneWithoutExtension.includes("+") && !phoneWithoutExtension.startsWith("+")) {
    return false;
  }

  const digits = phoneWithoutExtension.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return false;
  }

  if (phoneWithoutExtension.startsWith("+") && digits.startsWith("0")) {
    return false;
  }

  if (/^0+$/.test(digits)) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  return true;
};
