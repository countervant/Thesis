import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../models/Admin/Clientmodel.js";
import "../models/Admin/budgetmodel.js";
import "../models/Admin/taskmodel.js";
import "../models/Employee/budgetPlannerModel.js";
import "../models/calendarDepartmentModel.js";
import "../models/calendarEventModel.js";
import "../models/leaveRequestModel.js";
import "../models/messageModel.js";
import "../models/newsfeedModel.js";
import "../models/userModel.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../.env") });

const mongoUri = String(process.env.MONGODB_URI || "").trim();

try {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(mongoUri, {
    autoCreate: false,
    autoIndex: false,
    maxPoolSize: 2,
    minPoolSize: 0,
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 120000,
  });

  const modelNames = mongoose.modelNames().sort();
  console.log(`[database:indexes] Creating declared indexes for ${modelNames.length} models`);

  for (const modelName of modelNames) {
    const model = mongoose.model(modelName);
    await model.createIndexes();
    console.log(`[database:indexes] ${modelName}: complete`);
  }

  console.log("[database:indexes] Index creation completed");
} catch (error) {
  console.error("[database:indexes] Index creation failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch((error) => {
    console.warn("Unable to disconnect cleanly after index creation:", error);
  });
}
