import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

export const dbConnect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  try {
    console.log("[database] Connecting to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
    });
    console.log(`[database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    return conn;
  } catch (error) {
    console.error("[database] Connection error:", error);
    throw error;
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;

mongoose.connection.on("disconnected", () => {
  console.warn("[database] MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("[database] MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("[database] MongoDB runtime error:", error);
});
