export const getPasswordValidationMessage = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (new TextEncoder().encode(password).length > 72) {
    return "Password must be 72 bytes or fewer.";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include uppercase, lowercase, and number characters.";
  }

  return "";
};
