// models/Client.js

import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    contactPerson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 40,
    },

    country: {
      type: String,
      default: "Philippines",
      trim: true,
      maxlength: 100,
    },

    service: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ createdAt: -1 });
clientSchema.index({ email: 1 });
clientSchema.index({ assignedEmployee: 1 });
clientSchema.index({ isActive: 1, createdAt: -1 });

const Client = mongoose.model("Client", clientSchema);

export default Client;
