export const emailRegex =
  /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export const isValidEmail = (email) => {
  const trimmedEmail = email.trim();
  return (
    trimmedEmail.length <= 254 &&
    !trimmedEmail.includes("..") &&
    emailRegex.test(trimmedEmail)
  );
};

export const validateEmail = (email) => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return "Email is required";
  }

  return isValidEmail(trimmedEmail) ? "" : "Enter a valid email address";
};
