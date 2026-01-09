import mongoose from "mongoose";

const connectDB = async () => {
 try{
     const connect = await mongoose.connect(process.env.MONGO_URI);
     console.log(`MongoDB Connected: ${connect.connection.host}, ${connect.connection.name}`);
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
 }
};

export default connectDB;