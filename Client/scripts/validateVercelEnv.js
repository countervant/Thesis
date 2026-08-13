import process from "node:process";

const apiUrl = String(process.env.VITE_API_URL || "").trim();

try {
  const parsedUrl = new URL(apiUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("unsupported protocol");
} catch {
  console.error(
    "Vercel requires VITE_API_URL to be an absolute HTTP(S) URL for the separately hosted API."
  );
  process.exitCode = 1;
}
