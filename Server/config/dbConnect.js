import mongoose from "mongoose";


export const dbConnect = async () => {
    try {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);

    }catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
}