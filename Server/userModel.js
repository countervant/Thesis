import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Admin", "Employee", "Client"],
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

    password: {
        type: String,
        required: true,
    },
});

const userModel = mongoose.model("User", userSchema);
export default userModel;