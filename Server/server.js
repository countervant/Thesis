import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Resolve .env relative to this file so it works regardless of cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { dbConnect } from "./config/dbConnect.js";
import auth from "./routes/auth.js";

const app = express();
const port = process.env.PORT || 5000;

// --------------- Security ---------------
app.use(helmet());

// CORS – accept origins from env or fall back to common dev ports
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:3001",
    ];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Global rate limiter – 100 requests per 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  }),
);

// --------------- Performance ---------------
app.use(compression());
app.use(express.json({ limit: "1mb" }));

// --------------- Routes ---------------
app.use("/api/auth", auth);
app.use("/api/user", auth); // Back-compat alias

// --------------- Global error handler ---------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal server error" });
});

// --------------- Start ---------------
dbConnect();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
