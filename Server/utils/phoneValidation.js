const phoneRules = {
  Philippines: { dialCode: "63", localLengths: [11], internationalLengths: [12] },
  "United States": { dialCode: "1", localLengths: [10], internationalLengths: [11] },
  Canada: { dialCode: "1", localLengths: [10], internationalLengths: [11] },
  "United Kingdom": { dialCode: "44", localLengths: [11], internationalLengths: [12] },
  Australia: { dialCode: "61", localLengths: [10], internationalLengths: [11] },
  Japan: { dialCode: "81", localLengths: [10, 11], internationalLengths: [11, 12] },
  "South Korea": { dialCode: "82", localLengths: [10, 11], internationalLengths: [11, 12] },
  Singapore: { dialCode: "65", localLengths: [8], internationalLengths: [10] },
  Malaysia: { dialCode: "60", localLengths: [10, 11], internationalLengths: [11, 12] },
  Indonesia: { dialCode: "62", localLengths: [10, 11, 12, 13], internationalLengths: [11, 12, 13, 14] },
  Thailand: { dialCode: "66", localLengths: [10], internationalLengths: [11] },
  Vietnam: { dialCode: "84", localLengths: [10], internationalLengths: [11] },
  India: { dialCode: "91", localLengths: [10], internationalLengths: [12] },
  China: { dialCode: "86", localLengths: [11], internationalLengths: [13] },
  "Hong Kong": { dialCode: "852", localLengths: [8], internationalLengths: [11] },
  Taiwan: { dialCode: "886", localLengths: [10], internationalLengths: [12] },
  "United Arab Emirates": { dialCode: "971", localLengths: [9, 10], internationalLengths: [12] },
  "Saudi Arabia": { dialCode: "966", localLengths: [10], internationalLengths: [12] },
  Germany: { dialCode: "49", localLengths: [10, 11], internationalLengths: [11, 12, 13] },
  France: { dialCode: "33", localLengths: [10], internationalLengths: [11] },
  Italy: { dialCode: "39", localLengths: [10], internationalLengths: [12] },
  Spain: { dialCode: "34", localLengths: [9], internationalLengths: [11] },
  Brazil: { dialCode: "55", localLengths: [10, 11], internationalLengths: [12, 13] },
  Mexico: { dialCode: "52", localLengths: [10], internationalLengths: [12] },
  "South Africa": { dialCode: "27", localLengths: [10], internationalLengths: [11] },
};

const countryAliases = {
  PH: "Philippines",
  USA: "United States",
  UK: "United Kingdom",
  UAE: "United Arab Emirates",
};

const getCountryName = (country = "Philippines") => {
  const value = String(country || "Philippines").trim();
  return countryAliases[value.toUpperCase()] || value || "Philippines";
};

const getPhoneRule = (country) =>
  phoneRules[getCountryName(country)] || phoneRules.Philippines;

export const normalizePhoneNumber = (phone = "") =>
  String(phone)
    .trim()
    .replace(/\s*(?:ext\.?|extension|x)\s*\d+\s*$/i, "")
    .replace(/[^\d+]/g, "");

export const getPhoneValidationMessage = (phone = "", country = "Philippines") => {
  const trimmedPhone = String(phone).trim();
  const rule = getPhoneRule(country);
  const countryName = getCountryName(country);

  if (!trimmedPhone) {
    return "Enter a phone number.";
  }

  const normalizedPhone = normalizePhoneNumber(trimmedPhone);

  if (!/^\+?\d+$/.test(normalizedPhone)) {
    return "Phone number can only contain numbers and one leading +.";
  }

  if ((normalizedPhone.match(/\+/g) || []).length > 1) {
    return "Phone number can only contain one leading +.";
  }

  const digits = normalizedPhone.replace(/\D/g, "");
  const allowedLengths = normalizedPhone.startsWith("+")
    ? rule.internationalLengths
    : rule.localLengths;

  if (normalizedPhone.startsWith("+") && !digits.startsWith(rule.dialCode)) {
    return `Phone number must start with +${rule.dialCode} for ${countryName}.`;
  }

  if (normalizedPhone.startsWith("+")) {
    const nationalNumber = digits.slice(rule.dialCode.length);
    if (nationalNumber.startsWith("0")) {
      return `Remove the leading 0 after +${rule.dialCode}.`;
    }
  }

  if (!allowedLengths.includes(digits.length)) {
    return `${countryName} phone number must be ${allowedLengths.join(" or ")} digits.`;
  }

  if (/^0+$/.test(digits) || /^(\d)\1+$/.test(digits)) {
    return "Enter a real phone number.";
  }

  return "";
};

export const isValidPhoneNumber = (phone = "", country = "Philippines") =>
  !getPhoneValidationMessage(phone, country);
