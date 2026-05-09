import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";

import { dbConnect, isDbConnected } from "./config/dbConnect.js";
import auth from "./routes/auth.js";
import budgets from "./routes/budgets.js";
import clients from "./routes/clients.js";
import tasks from "./routes/tasks.js";
import newsfeed from "./routes/newsfeed.js";
import messages from "./routes/messages.js";

// Resolve .env relative to this file so it works regardless of cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 5000;

// CORS – accept origins from env or fall back to common dev ports
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.status(isDbConnected() ? 200 : 503).json({
    ok: isDbConnected(),
    database: isDbConnected() ? "connected" : "disconnected",
  });
});

app.use("/api", (req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({ message: "Database unavailable" });
  }

  return next();
});

app.use("/api/auth", auth);
// Back-compat / alternate base path (some clients call this as /api/user/*)
app.use("/api/user", auth);
app.use("/api/budgets", budgets);
app.use("/api/clients", clients);
app.use("/api/tasks", tasks);
app.use("/api/newsfeed", newsfeed);
app.use("/api/messages", messages);

try {
  await dbConnect();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch {
  process.exit(1);
}
