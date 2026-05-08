// models/Client.js

import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "Philippines",
      trim: true,
    },

    service: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    address: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
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

const Client = mongoose.model("Client", clientSchema);

export default Client;
