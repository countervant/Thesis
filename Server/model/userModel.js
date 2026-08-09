import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "employee", "client"],
      default: "client",
      required: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleInitial: {
      type: String,
      default: "",
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    avatar: {
      type: String,
      default: "",
    },

    coverPhoto: {
      type: String,
      default: "",
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

    position: {
      type: String,
      default: "",
      trim: true,
    },

    birthday: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Prefer not to say"],
      default: "Prefer not to say",
    },

    skillGroups: {
      technical: { type: [String], default: [] },
      soft: { type: [String], default: [] },
      other: { type: [String], default: [] },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    showOnlineStatus: {
      type: Boolean,
      default: true,
    },

    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ["Everyone", "Team Only", "Only Me"],
        default: "Everyone",
      },
      activityVisibility: {
        type: Boolean,
        default: true,
      },
      personalInformation: {
        type: String,
        enum: ["Everyone", "Team Only", "Only Me"],
        default: "Only Me",
      },
    },

    lastSeen: {
      type: Date,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    resetPasswordOTP: {
      type: String,
    },

    resetPasswordOTPExpires: {
      type: Date,
    },

    // Login/setup OTPs are always stored as keyed hashes, never as plaintext.
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorCodeHash: {
      type: String,
      select: false,
    },

    twoFactorExpiresAt: {
      type: Date,
      select: false,
    },

    twoFactorAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    twoFactorLastSentAt: {
      type: Date,
      select: false,
    },

    twoFactorPurpose: {
      type: String,
      enum: ["login", "enable"],
      select: false,
    },

    // Recovery codes are one-time credentials. Only keyed hashes are persisted.
    backupCodeHashes: {
      type: [String],
      default: [],
      select: false,
    },

    // Trusted-device tokens are random, stored only as hashes, and expire automatically.
    trustedDevices: {
      type: [
        {
          tokenHash: {
            type: String,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
          lastUsedAt: {
            type: Date,
            default: Date.now,
          },
          expiresAt: {
            type: Date,
            required: true,
          },
        },
      ],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// HASH PASSWORD
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// MATCH PASSWORD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(
    enteredPassword,
    this.password
  );
};

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ role: 1, isActive: 1, firstName: 1, lastName: 1 });
userSchema.index({ role: 1, isOnline: 1, lastSeen: -1 });

const User = mongoose.model("User", userSchema);

export default User;
