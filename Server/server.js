import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
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

const parseOrigins = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...parseOrigins(process.env.CORS_ORIGINS, process.env.FRONTEND_URL),
    ...defaultOrigins,
  ]),
];

console.log("[startup] Allowed CORS origins:", allowedOrigins.join(", "));

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[cors] Blocked origin: ${origin}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.status(isDbConnected() ? 200 : 503).json({
    ok: isDbConnected(),
    database: isDbConnected() ? "connected" : "disconnected",
  });
});

app.use("/api/database", databaseDiagnostics);

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
