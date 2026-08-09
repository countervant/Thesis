const API_BASE_URL = String(import.meta.env.VITE_API_URL || "/api")
  .trim()
  .replace(/\/+$/, "");

// The API returns same-origin paths so local development can use Vite's proxy.
// When production uses a separate API host, point those paths at VITE_API_URL.
export const resolveApiAssetUrl = (source) => {
  const value = String(source || "").trim();
  if (!value.startsWith("/api/")) return value;
  if (!API_BASE_URL || API_BASE_URL === "/api") return value;

  return `${API_BASE_URL}${value.slice(4)}`;
};
