export const countryOptions = [
  { name: "Philippines", dialCode: "+63" },
  { name: "United States", dialCode: "+1" },
  { name: "Canada", dialCode: "+1" },
  { name: "United Kingdom", dialCode: "+44" },
  { name: "Australia", dialCode: "+61" },
  { name: "Japan", dialCode: "+81" },
  { name: "South Korea", dialCode: "+82" },
  { name: "Singapore", dialCode: "+65" },
  { name: "Malaysia", dialCode: "+60" },
  { name: "Indonesia", dialCode: "+62" },
  { name: "Thailand", dialCode: "+66" },
  { name: "Vietnam", dialCode: "+84" },
  { name: "India", dialCode: "+91" },
  { name: "China", dialCode: "+86" },
  { name: "Hong Kong", dialCode: "+852" },
  { name: "Taiwan", dialCode: "+886" },
  { name: "United Arab Emirates", dialCode: "+971" },
  { name: "Saudi Arabia", dialCode: "+966" },
  { name: "Germany", dialCode: "+49" },
  { name: "France", dialCode: "+33" },
  { name: "Italy", dialCode: "+39" },
  { name: "Spain", dialCode: "+34" },
  { name: "Brazil", dialCode: "+55" },
  { name: "Mexico", dialCode: "+52" },
  { name: "South Africa", dialCode: "+27" },
];

export const defaultCountry = countryOptions[0].name;

export const getCountryDialCode = (countryName) =>
  countryOptions.find((country) => country.name === countryName)?.dialCode ||
  countryOptions[0].dialCode;

export const applyCountryDialCode = (phone, countryName, previousCountryName) => {
  const nextDialCode = getCountryDialCode(countryName);
  const previousDialCode = getCountryDialCode(previousCountryName);
  const trimmedPhone = String(phone || "").trim();

  if (!trimmedPhone || trimmedPhone === previousDialCode) {
    return nextDialCode;
  }

  if (trimmedPhone.startsWith(`${previousDialCode} `)) {
    return `${nextDialCode} ${trimmedPhone.slice(previousDialCode.length).trim()}`;
  }

  return trimmedPhone;
};
