import express from "express";
import mongoose from "mongoose";

import { validateMongoAtlasFlow } from "../config/dbConnect.js";
import User from "../model/userModel.js";

const router = express.Router();

router.get("/diagnostics", async (req, res) => {
  try {
    const result = await validateMongoAtlasFlow();
    res.status(result.ok ? 200 : 503).json(result);
  } catch (error) {
    console.error("[database:diagnostic] Unexpected diagnostics failure:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      ok: false,
      message: "MongoDB diagnostics failed unexpectedly",
      error: {
        name: error.name,
        message: error.message,
      },
    });
  }
});

router.get("/test-query", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error("[database:test-query] MongoDB is not connected", {
        readyState: mongoose.connection.readyState,
      });

      return res.status(503).json({
        ok: false,
        message: "MongoDB is not connected",
        readyState: mongoose.connection.readyState,
      });
    }

    const startedAt = Date.now();
    const [userCount, sampleUsers] = await Promise.all([
      User.countDocuments({}).maxTimeMS(8000),
      User.find({})
        .select("firstName lastName email role createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .maxTimeMS(8000)
        .lean(),
    ]);

    console.log("[database:test-query] Test query succeeded", {
      durationMS: Date.now() - startedAt,
      userCount,
      sampleSize: sampleUsers.length,
    });

    return res.status(200).json({
      ok: true,
      durationMS: Date.now() - startedAt,
      databaseName: mongoose.connection.name,
      userCount,
      sampleUsers,
    });
  } catch (error) {
    console.error("[database:test-query] Test query failed:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      message: "MongoDB test query failed",
      error: {
        name: error.name,
        message: error.message,
      },
    });
  }
});

export default router;
