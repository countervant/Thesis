import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";

import { dbConnect, isDbConnected } from "./config/dbConnect.js";
import auth from "./routes/auth.js";
import budgets from "./routes/budgets.js";
import clients from "./routes/clients.js";
import calendar from "./routes/calendar.js";
import leaveRequests from "./routes/leaveRequests.js";
import tasks from "./routes/tasks.js";
import newsfeed from "./routes/newsfeed.js";
import messages from "./routes/messages.js";
import dashboard from "./routes/dashboard.js";
import users from "./routes/users.js";
import databaseDiagnostics from "./routes/databaseDiagnostics.js";

// Resolve .env relative to this file so it works regardless of cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";
const clientDistPath = path.resolve(__dirname, "../Client/dist");

app.disable("x-powered-by");
app.set("trust proxy", 1);

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not set`);
  }

  return value.trim();
};

const validateRuntimeConfig = () => {
  requireEnv("MONGODB_URI");
  const jwtSecret = requireEnv("JWT_SECRET");

  if (isProduction && jwtSecret === "replace_this_with_a_long_random_secret") {
    throw new Error("JWT_SECRET must be changed before production deployment");
  }
};

validateRuntimeConfig();

// CORS – accept origins from env or fall back to common dev ports
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, "");

const parseOrigins = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map(normalizeOrigin)
    .filter(Boolean);

const parseOriginPatterns = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => new RegExp(pattern));

const allowedOrigins = [
  ...new Set([
    ...parseOrigins(process.env.CORS_ORIGINS, process.env.FRONTEND_URL),
    ...(isProduction ? [] : defaultOrigins),
  ]),
];
const allowedOriginPatterns = parseOriginPatterns(process.env.CORS_ORIGIN_PATTERNS);

console.log(
  "[startup] Allowed CORS origins:",
  allowedOrigins.length ? allowedOrigins.join(", ") : "same-origin only"
);
console.log(
  "[startup] Allowed CORS origin patterns:",
  allowedOriginPatterns.length ? allowedOriginPatterns.map((pattern) => pattern.source).join(", ") : "none"
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const normalizedOrigin = origin ? normalizeOrigin(origin) : "";

      if (
        !origin ||
        allowedOrigins.includes(normalizedOrigin) ||
        allowedOriginPatterns.some((pattern) => pattern.test(normalizedOrigin))
      ) {
        return callback(null, true);
      }

      console.warn(`[cors] Blocked origin: ${normalizedOrigin}`);
      return callback(new Error(`Origin ${normalizedOrigin} is not allowed by CORS`));
    },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.status(isDbConnected() ? 200 : 503).json({
    ok: isDbConnected(),
    database: isDbConnected() ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/database", (req, res, next) => {
  if (!isProduction) {
    return next();
  }

  if (process.env.ENABLE_DATABASE_DIAGNOSTICS !== "true") {
    return res.status(404).json({ message: "API route not found" });
  }

  const expectedToken = process.env.DATABASE_DIAGNOSTICS_TOKEN;
  const providedToken = req.get("x-diagnostics-token");

  if (!expectedToken || providedToken !== expectedToken) {
    return res.status(403).json({ message: "Diagnostics are not available" });
  }

  return next();
}, databaseDiagnostics);

app.use("/api", (req, res, next) => {
  if (!isDbConnected()) {
    console.error(`[database] Request blocked while disconnected: ${req.method} ${req.originalUrl}`);
    return res.status(503).json({ message: "Database unavailable" });
  }

  return next();
});

app.use("/api/auth", auth);
// Back-compat / alternate base path (some clients call this as /api/user/*)
app.use("/api/user", auth);
app.use("/api/budgets", budgets);
app.use("/api/clients", clients);
app.use("/api/calendar", calendar);
app.use("/api/leave-requests", leaveRequests);
app.use("/api/tasks", tasks);
app.use("/api/newsfeed", newsfeed);
app.use("/api/messages", messages);
app.use("/api/dashboard", dashboard);
app.use("/api/users", users);

app.use("/api", (req, res) => {
  console.warn(`[route] No API route matched: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "API route not found" });
});

if (isProduction) {
  if (fs.existsSync(clientDistPath)) {
    app.use(
      express.static(clientDistPath, {
        maxAge: "1y",
        immutable: true,
        index: false,
      })
    );

    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  } else {
    console.warn(`[startup] Client build not found at ${clientDistPath}; serving API only`);
  }
}

app.use((error, req, res, next) => {
  console.error(`[server] Unhandled error for ${req.method} ${req.originalUrl}:`, error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    message: error.message || "Server error",
  });
});

try {
  await dbConnect();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch (error) {
  console.error("[startup] Server failed to start:", error);
  process.exit(1);
}
