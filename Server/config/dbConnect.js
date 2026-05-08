import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

export const dbConnect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      readPreference: "secondaryPreferred",
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    return conn;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;
