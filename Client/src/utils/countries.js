export const countryOptions = [
  { name: "Philippines", dialCode: "+63", code: "PH" },
  { name: "United States", dialCode: "+1", code: "US" },
  { name: "Canada", dialCode: "+1", code: "CA" },
  { name: "United Kingdom", dialCode: "+44", code: "GB" },
  { name: "Australia", dialCode: "+61", code: "AU" },
  { name: "Japan", dialCode: "+81", code: "JP" },
  { name: "South Korea", dialCode: "+82", code: "KR" },
  { name: "Singapore", dialCode: "+65", code: "SG" },
  { name: "Malaysia", dialCode: "+60", code: "MY" },
  { name: "Indonesia", dialCode: "+62", code: "ID" },
  { name: "Thailand", dialCode: "+66", code: "TH" },
  { name: "Vietnam", dialCode: "+84", code: "VN" },
  { name: "India", dialCode: "+91", code: "IN" },
  { name: "China", dialCode: "+86", code: "CN" },
  { name: "Hong Kong", dialCode: "+852", code: "HK" },
  { name: "Taiwan", dialCode: "+886", code: "TW" },
  { name: "United Arab Emirates", dialCode: "+971", code: "AE" },
  { name: "Saudi Arabia", dialCode: "+966", code: "SA" },
  { name: "Germany", dialCode: "+49", code: "DE" },
  { name: "France", dialCode: "+33", code: "FR" },
  { name: "Italy", dialCode: "+39", code: "IT" },
  { name: "Spain", dialCode: "+34", code: "ES" },
  { name: "Brazil", dialCode: "+55", code: "BR" },
  { name: "Mexico", dialCode: "+52", code: "MX" },
  { name: "South Africa", dialCode: "+27", code: "ZA" },
];

export const defaultCountry = countryOptions[0].name;

const countryFlagIcons = import.meta.glob("../assets/countryflag/*.png", {
  eager: true,
  import: "default",
});

const countryAliases = {
  PH: "Philippines",
  USA: "United States",
  UK: "United Kingdom",
  UAE: "United Arab Emirates",
};

const normalizeCountryName = (countryName) => {
  const value = String(countryName || "").trim();
  return countryAliases[value.toUpperCase()] || value;
};

const getCountryOption = (countryName) => {
  const normalizedCountry = normalizeCountryName(countryName);

  return countryOptions.find(
    (country) =>
      country.name.toLowerCase() === normalizedCountry.toLowerCase() ||
      country.code === normalizedCountry.toUpperCase()
  );
};

export const getCountryDialCode = (countryName) =>
  getCountryOption(countryName)?.dialCode || countryOptions[0].dialCode;

export const getCountryFlag = (countryName) => {
  const code = getCountryOption(countryName)?.code?.toLowerCase();
  return code ? countryFlagIcons[`../assets/countryflag/${code}.png`] || "" : "";
};

export const applyCountryDialCode = (phone, countryName, previousCountryName) => {
  const nextDialCode = getCountryDialCode(countryName);
  const previousDialCode = getCountryDialCode(previousCountryName);
  const trimmedPhone = String(phone || "").trim();

  if (!trimmedPhone || trimmedPhone === previousDialCode) {
    return nextDialCode;
  }

  if (trimmedPhone.startsWith(previousDialCode)) {
    const remainingPhone = trimmedPhone.slice(previousDialCode.length).trim();
    return [nextDialCode, remainingPhone].filter(Boolean).join("");
  }

  if (trimmedPhone.startsWith(`${previousDialCode} `)) {
    return `${nextDialCode} ${trimmedPhone.slice(previousDialCode.length).trim()}`;
  }

  return trimmedPhone;
};

export const ensureCountryDialCode = (phone, countryName) => {
  const dialCode = getCountryDialCode(countryName);
  const value = String(phone || "").trim();

  if (!value || value === "+") {
    return dialCode;
  }

  if (value.startsWith(dialCode)) {
    const remainingPhone = value.slice(dialCode.length).replace(/\D/g, "");
    return `${dialCode}${remainingPhone.replace(/^0+/, "")}`;
  }

  const digits = value.replace(/\D/g, "");
  const dialDigits = dialCode.replace(/\D/g, "");

  if (digits.startsWith(dialDigits)) {
    const nationalNumber = digits.slice(dialDigits.length);
    return `+${dialDigits}${nationalNumber.replace(/^0+/, "")}`;
  }

  return `${dialCode}${digits.replace(/^0+/, "")}`;
};
