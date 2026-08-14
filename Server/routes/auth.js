import express from "express";
import mongoose from "mongoose";
import User from "../model/userModel.js";
import Client from "../model/Admin/Clientmodel.js";
import { authorize } from "../middleware/authorize.js";
import { clearCachedAuthUser, protect } from "../middleware/protectedjwt.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getPhoneValidationMessage } from "../utils/phoneValidation.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";
import { getSafeSearchPattern } from "../utils/search.js";
import { sendPasswordResetCode } from "../utils/email.js";
import {
  getCachedAvatar,
  isValidAvatarSignature,
  optimizeAvatarDataUrl,
  setCachedAvatar,
  withAvatarUrl,
} from "../utils/avatar.js";
import {
  disableTwoFactor,
  getTwoFactorStatus,
  login,
  regenerateBackupCodes,
  requestEnableTwoFactor,
  resendLoginTwoFactor,
  verifyEnableTwoFactor,
  verifyLoginTwoFactor,
} from "../controllers/twoFactorController.js";
import { isUserOnline, PRESENCE_TIMEOUT_MS } from "../utils/presence.js";
import { getEmployeesOnApprovedLeave } from "../utils/leaveAvailability.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// generate JWT token
const generateToken = (id) =>
  jwt.sign({ id, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
const emailRegex =
  /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const isMongoTimeoutError = (error) =>
  error?.name === "MongoNetworkTimeoutError" ||
  error?.name === "MongoNetworkError" ||
  error?.name === "MongoServerSelectionError" ||
  String(error?.message || "").toLowerCase().includes("timed out");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_OTP_COOLDOWN_MS = 60 * 1000;
const RESET_OTP_MAX_ATTEMPTS = 5;
const genericResetMessage = "If that email is registered, reset instructions have been sent.";
const loginLimiter = createRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 });
const verificationLimiter = createRateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });
const passwordResetRequestLimiter = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const registrationLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

const findUserAvatar = (userId) =>
  User.findById(userId)
    .select("avatar")
    .maxTimeMS(8000)
    .lean();

const findUserAvatarWithRetry = async (userId) => {
  try {
    return await findUserAvatar(userId);
  } catch (error) {
    if (!isMongoTimeoutError(error)) throw error;
    await wait(500);
    return findUserAvatar(userId);
  }
};

const isValidEmail = (email) => {
  const trimmedEmail = email.trim();
  return (
    trimmedEmail.length <= 254 &&
    !trimmedEmail.includes("..") &&
    emailRegex.test(trimmedEmail)
  );
};

// Register route
router.post("/register", registrationLimiter, async (req, res) => {
  const {
    firstName,
    middleInitial = "",
    lastName,
    companyName = "",
    email,
    password,
    phone = "",
    country = "Philippines",
  } = req.body;

  try {
    if (!firstName || !lastName || !companyName || !email || !password) {
      return res
        .status(400)
        .json({
          message: "Please provide first name, last name, company name, email, and password",
        });
    }

    const trimmedFirstName = firstName.trim();
    const trimmedMiddleInitial = middleInitial.trim();
    const trimmedLastName = lastName.trim();
    const trimmedCompanyName = companyName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedFirstName || !trimmedLastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required" });
    }

    if (!trimmedCompanyName) {
      return res.status(400).json({ message: "Company name is required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Enter a valid email" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        message: "Password must include uppercase, lowercase, and number characters",
      });
    }

    const phoneValidation = getPhoneValidationMessage(phone, country);
    if (phoneValidation) {
      return res.status(400).json({ message: phoneValidation });
    }

    const userExists = await User.exists({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      firstName: trimmedFirstName,
      middleInitial: trimmedMiddleInitial,
      lastName: trimmedLastName,
      companyName: trimmedCompanyName,
      email: normalizedEmail,
      password,
      phone: phone.trim(),
      country: country.trim() || "Philippines",
    });
    const token = generateToken(user._id);
    res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      middleInitial: user.middleInitial,
      lastName: user.lastName,
      companyName: user.companyName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      country: user.country,
      showOnlineStatus: user.showOnlineStatus !== false,
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "Unable to register account" });
  }
});

router.post("/login", loginLimiter, login);
router.post("/verify-2fa", verificationLimiter, verifyLoginTwoFactor);
router.post("/resend-2fa", verificationLimiter, resendLoginTwoFactor);
router.get("/2fa-status", protect, getTwoFactorStatus);
router.post("/enable-2fa/request", protect, requestEnableTwoFactor);
router.post("/enable-2fa/verify", protect, verifyEnableTwoFactor);
router.post("/disable-2fa", protect, disableTwoFactor);
router.post("/backup-codes/regenerate", protect, regenerateBackupCodes);
router.post("/forgot-password", passwordResetRequestLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email" });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+trustedDevices +resetPasswordAttempts +resetPasswordLastSentAt"
    );

    if (!user) {
      return res.status(200).json({ message: genericResetMessage });
    }

    if (
      user.resetPasswordLastSentAt &&
      Date.now() - user.resetPasswordLastSentAt.getTime() < RESET_OTP_COOLDOWN_MS
    ) {
      return res.status(200).json({ message: genericResetMessage });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = new Date(Date.now() + RESET_OTP_TTL_MS);
    user.resetPasswordAttempts = 0;
    user.resetPasswordLastSentAt = new Date();
    await user.save({ validateModifiedOnly: true });

    try {
      await sendPasswordResetCode({ to: user.email, code: otp });
    } catch (error) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      user.resetPasswordLastSentAt = undefined;
      await user.save({ validateModifiedOnly: true }).catch((cleanupError) => {
        console.error("Unable to clear undelivered password reset code:", cleanupError);
      });
      throw error;
    }

    res.status(200).json({ message: genericResetMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(error.status || 500).json({ message: "Unable to send reset email" });
  }
});

router.post("/reset-password", verificationLimiter, async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  if (!/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ message: "OTP must be a 6-digit code" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({
      message: "Password must include uppercase, lowercase, and number characters",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+backupCodeHashes +resetPasswordAttempts +resetPasswordLastSentAt"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const consumedOtp = await User.updateOne(
      {
        _id: user._id,
        resetPasswordOTP: hashedOTP,
        resetPasswordOTPExpires: { $gt: new Date() },
        $or: [
          { resetPasswordAttempts: { $lt: RESET_OTP_MAX_ATTEMPTS } },
          { resetPasswordAttempts: { $exists: false } },
        ],
      },
      {
        $unset: {
          resetPasswordOTP: 1,
          resetPasswordOTPExpires: 1,
          resetPasswordLastSentAt: 1,
        },
        $set: { resetPasswordAttempts: 0 },
      }
    );

    if (consumedOtp.modifiedCount !== 1) {
      const failedAttempt = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { resetPasswordAttempts: { $lt: RESET_OTP_MAX_ATTEMPTS } },
            { resetPasswordAttempts: { $exists: false } },
          ],
        },
        { $inc: { resetPasswordAttempts: 1 } },
        { new: true }
      ).select("+resetPasswordAttempts");
      if ((failedAttempt?.resetPasswordAttempts || RESET_OTP_MAX_ATTEMPTS) >= RESET_OTP_MAX_ATTEMPTS) {
        await User.updateOne(
          { _id: user._id },
          { $unset: { resetPasswordOTP: 1, resetPasswordOTPExpires: 1 } }
        );
      }
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    user.password = password;
    user.trustedDevices = [];
    user.backupCodeHashes = [];
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordLastSentAt = undefined;
    await user.save();
    clearCachedAuthUser(user._id);

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Unable to reset password" });
  }
});

    router.get("/me", protect, async (req, res) => {
      const profile = { ...req.user };
      delete profile.passwordChangedAt;
      res.status(200).json(profile);
    });

    router.patch("/presence", protect, async (req, res) => {
      try {
        const requestedOnline = req.body?.isOnline !== false;
        const hasVisibilityPreference =
          typeof req.body?.showOnlineStatus === "boolean";
        const showOnlineStatus = hasVisibilityPreference
          ? req.body.showOnlineStatus
          : { $ifNull: ["$showOnlineStatus", true] };
        const user = await User.findByIdAndUpdate(
          req.user._id,
          [
            {
              $set: {
                ...(hasVisibilityPreference ? { showOnlineStatus } : {}),
                isOnline: requestedOnline ? showOnlineStatus : false,
                lastSeen: "$$NOW",
              },
            },
          ],
          {
            returnDocument: "after",
            select: "firstName lastName email role companyName isActive isOnline showOnlineStatus lastSeen",
            timestamps: false,
            updatePipeline: true,
          }
        ).lean();

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (hasVisibilityPreference) clearCachedAuthUser(req.user._id);

        res.status(200).json(user);
      } catch (error) {
        console.error("Update presence error:", error);
        res.status(500).json({ message: "Unable to update presence" });
      }
    });

    router.get("/online-team", protect, async (req, res) => {
      try {
        const onlineSince = new Date(Date.now() - PRESENCE_TIMEOUT_MS);
        const users = await User.find({
          role: { $in: ["admin", "employee"] },
          isOnline: true,
          showOnlineStatus: { $ne: false },
          lastSeen: { $gte: onlineSince },
          isActive: { $ne: false },
        })
          .select("firstName lastName email role companyName isActive isOnline showOnlineStatus lastSeen updatedAt")
          .sort({ lastSeen: -1, firstName: 1, lastName: 1 })
          .maxTimeMS(8000)
          .lean();

        res.status(200).json(users.map(withAvatarUrl));
      } catch (error) {
        console.error("Get online team error:", error);
        res.status(500).json({ message: "Unable to fetch online team" });
      }
    });

    router.get("/users/:id", protect, async (req, res) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: "Invalid user" });
        }

        const loadUser = async () => {
          const accountUser = await User.findById(req.params.id)
            .select("firstName middleInitial lastName companyName email phone country role avatar coverPhoto position birthday gender skillGroups isActive isOnline showOnlineStatus lastSeen privacySettings createdAt updatedAt")
            .maxTimeMS(30000)
            .lean();
          if (accountUser) return accountUser;

          const managedClient = await Client.findById(req.params.id)
            .select("companyName contactPerson email phone country service isActive createdAt updatedAt")
            .maxTimeMS(30000)
            .lean();
          if (!managedClient) return null;
          if (req.user.role !== "admin") {
            const accessError = new Error("This client profile is restricted to administrators");
            accessError.status = 403;
            throw accessError;
          }

          return {
            _id: managedClient._id,
            firstName: managedClient.contactPerson,
            lastName: "",
            companyName: managedClient.companyName,
            email: managedClient.email,
            phone: managedClient.phone,
            country: managedClient.country,
            role: "client",
            position: managedClient.service,
            isActive: managedClient.isActive,
            isOnline: false,
            privacySettings: {
              profileVisibility: "Everyone",
              activityVisibility: true,
              personalInformation: "Everyone",
            },
            skillGroups: { technical: [], soft: [], other: [] },
            createdAt: managedClient.createdAt,
            updatedAt: managedClient.updatedAt,
            isManagedClientProfile: true,
          };
        };

        let user;
        try {
          user = await loadUser();
        } catch (error) {
          if (!isMongoTimeoutError(error)) throw error;
          await wait(750);
          user = await loadUser();
        }

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const currentUserId = String(req.user._id || req.user.id || "");
        const isOwnProfile = String(user._id) === currentUserId;
        const privacy = user.privacySettings || {};
        const isSameTeam =
          req.user.role === "admin" ||
          (Boolean(req.user.companyName) && req.user.companyName === user.companyName);
        const canViewProfile =
          isOwnProfile ||
          privacy.profileVisibility !== "Only Me" &&
            (privacy.profileVisibility !== "Team Only" || isSameTeam);

        if (!canViewProfile) {
          return res.status(403).json({ message: "This profile is private" });
        }

        const canViewPersonalInformation =
          isOwnProfile ||
          privacy.personalInformation === "Everyone" ||
          (privacy.personalInformation === "Team Only" && isSameTeam);
        const publicProfile = { ...user };
        delete publicProfile.privacySettings;
        if (!canViewPersonalInformation) {
          delete publicProfile.email;
          delete publicProfile.phone;
          delete publicProfile.country;
          delete publicProfile.birthday;
          delete publicProfile.gender;
        }
        publicProfile.canViewActivity =
          isOwnProfile || privacy.activityVisibility !== false;
        publicProfile.isOnline = isUserOnline(publicProfile);

        res.status(200).json(withAvatarUrl(publicProfile));
      } catch (error) {
        if (error.status === 403) {
          return res.status(403).json({ message: error.message });
        }
        if (isMongoTimeoutError(error)) {
          return res.status(503).json({ message: "Profile is temporarily unavailable" });
        }

        console.error("Get public profile error:", error);
        res.status(500).json({ message: "Unable to load profile" });
      }
    });

    router.get("/users/:id/avatar", async (req, res) => {
      try {
        const { id } = req.params;
        const version = String(req.query.v || "");
        const signature = String(req.query.signature || "");

        if (
          !mongoose.Types.ObjectId.isValid(id) ||
          !isValidAvatarSignature(id, version, signature)
        ) {
          return res.status(404).end();
        }

        const cachedAvatar = getCachedAvatar(id, version);
        let avatar = cachedAvatar.avatar;

        if (!cachedAvatar.hit) {
          const user = await findUserAvatarWithRetry(id);
          if (!user) return res.status(404).end();
          avatar = setCachedAvatar(id, version, user.avatar);
        }

        if (!avatar?.buffer.length) {
          return res.status(404).end();
        }

        res.set({
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": avatar.contentType,
          "Content-Length": String(avatar.buffer.length),
          "X-Content-Type-Options": "nosniff",
        });
        return res.status(200).send(avatar.buffer);
      } catch (error) {
        if (isMongoTimeoutError(error)) {
          console.warn(`[avatar] Database timeout for user ${req.params.id}`);
          res.set("Retry-After", "2");
          return res.status(503).end();
        }

        console.error("Get user avatar error:", error);
        return res.status(500).end();
      }
    });

    router.put("/me", protect, async (req, res) => {
      try {
        const user = await User.findById(req.user._id).select("+trustedDevices");

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const {
          firstName,
          middleInitial,
          lastName,
          companyName,
          email,
          phone,
          country,
          position,
          birthday,
          gender,
          skillGroups,
          avatar,
          coverPhoto,
          currentPassword,
          password,
          privacySettings,
        } = req.body;

        if (firstName !== undefined) {
          if (!firstName.trim()) {
            return res.status(400).json({ message: "First name is required" });
          }
          user.firstName = firstName.trim();
        }

        if (lastName !== undefined) {
          if (!lastName.trim()) {
            return res.status(400).json({ message: "Last name is required" });
          }
          user.lastName = lastName.trim();
        }

        if (middleInitial !== undefined) user.middleInitial = middleInitial.trim();

        if (companyName !== undefined) user.companyName = companyName.trim();

        if (email !== undefined) {
          const normalizedEmail = email.trim().toLowerCase();

          if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Enter a valid email" });
          }

          const emailOwner = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: user._id },
          });

          if (emailOwner) {
            return res.status(400).json({ message: "Email is already used" });
          }

          user.email = normalizedEmail;
        }

        if (phone !== undefined) {
          const phoneValidation = getPhoneValidationMessage(phone, country ?? user.country);
          if (phoneValidation) {
            return res.status(400).json({ message: phoneValidation });
          }
          user.phone = phone.trim();
        }
        if (country !== undefined) user.country = country.trim() || "Philippines";
        if (position !== undefined) user.position = position.trim();
        if (birthday !== undefined) {
          if (!birthday) {
            user.birthday = undefined;
          } else {
            const parsedBirthday = new Date(`${birthday}T12:00:00.000Z`);
            if (Number.isNaN(parsedBirthday.getTime()) || parsedBirthday > new Date()) {
              return res.status(400).json({ message: "Enter a valid birthday" });
            }
            user.birthday = parsedBirthday;
          }
        }
        if (gender !== undefined) {
          const genderOptions = new Set(["Male", "Female", "Prefer not to say"]);
          if (!genderOptions.has(gender)) {
            return res.status(400).json({ message: "Invalid gender selection" });
          }
          user.gender = gender;
        }
        if (skillGroups !== undefined) {
          const normalizeSkills = (skills) =>
            Array.isArray(skills)
              ? [...new Set(skills.map((skill) => String(skill).trim()).filter(Boolean))].slice(0, 50)
              : [];
          user.skillGroups = {
            technical: normalizeSkills(skillGroups.technical),
            soft: normalizeSkills(skillGroups.soft),
            other: normalizeSkills(skillGroups.other),
          };
        }
        if (avatar !== undefined) {
          const isExistingAvatarUrl =
            typeof avatar === "string" &&
            /\/api\/auth\/users\/[a-f\d]{24}\/avatar\?/i.test(avatar);

          if (!isExistingAvatarUrl) {
            user.avatar = await optimizeAvatarDataUrl(avatar);
          }
        }
        if (coverPhoto !== undefined) user.coverPhoto = coverPhoto;
        if (privacySettings !== undefined) {
          const visibilityOptions = new Set(["Everyone", "Team Only", "Only Me"]);
          const profileVisibility = privacySettings?.profileVisibility;
          const personalInformation = privacySettings?.personalInformation;
          if (
            !visibilityOptions.has(profileVisibility) ||
            !visibilityOptions.has(personalInformation) ||
            typeof privacySettings?.activityVisibility !== "boolean"
          ) {
            return res.status(400).json({ message: "Invalid privacy settings" });
          }
          user.privacySettings = {
            profileVisibility,
            activityVisibility: privacySettings.activityVisibility,
            personalInformation,
          };
        }

        if (password) {
          if (!currentPassword) {
            return res.status(400).json({ message: "Current password is required" });
          }

          if (!(await user.matchPassword(currentPassword))) {
            return res.status(400).json({ message: "Current password is incorrect" });
          }

          if (password.length < 8) {
            return res
              .status(400)
              .json({ message: "Password must be at least 8 characters" });
          }

          if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({
              message: "Password must include uppercase, lowercase, and number characters",
            });
          }

          user.password = password;
          user.trustedDevices = [];
        }

        await user.save();
        clearCachedAuthUser(user._id);

        const updatedProfile = withAvatarUrl({
          id: user._id,
          _id: user._id,
          firstName: user.firstName,
          middleInitial: user.middleInitial,
          lastName: user.lastName,
          companyName: user.companyName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          updatedAt: user.updatedAt,
          coverPhoto: user.coverPhoto,
          phone: user.phone,
          country: user.country,
          position: user.position,
          birthday: user.birthday,
          gender: user.gender,
          skillGroups: user.skillGroups,
          isActive: user.isActive,
          isOnline: user.isOnline,
          showOnlineStatus: user.showOnlineStatus !== false,
          privacySettings: user.privacySettings,
          twoFactorEnabled: Boolean(user.twoFactorEnabled),
          createdAt: user.createdAt,
          lastSeen: user.lastSeen,
        });
        res.status(200).json(updatedProfile);
      } catch (error) {
        console.error("Update profile error:", error);
        res.status(error.status || 500).json({
          message: error.status ? error.message : "Unable to update profile",
        });
      }
    });

    router.patch("/me/deactivate", protect, async (req, res) => {
      try {
        const currentPassword = String(req.body?.currentPassword || "");
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }

        const user = await User.findById(req.user._id).select("password isActive isOnline lastSeen +trustedDevices");
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        if (!(await user.matchPassword(currentPassword))) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }

        user.isActive = false;
        user.isOnline = false;
        user.lastSeen = new Date();
        user.trustedDevices = [];
        await user.save({ validateModifiedOnly: true });
        clearCachedAuthUser(user._id);

        return res.status(200).json({ message: "Account deactivated" });
      } catch (error) {
        console.error("Deactivate account error:", error);
        return res.status(500).json({ message: "Unable to deactivate account" });
      }
    });

    router.get("/assignees", protect, async (req, res) => {
      try {
        const currentUserAssignee = {
          _id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          role: req.user.role,
          isSelf: true,
        };

        if (req.user.role === "client") {
          return res.status(200).json([currentUserAssignee]);
        }

        const employees = await User.find({
          role: "employee",
          isActive: true,
          _id: { $ne: req.user._id },
        })
          .select("firstName lastName email role")
          .sort({ firstName: 1, lastName: 1 })
          .lean();

        const approvedLeaves = await getEmployeesOnApprovedLeave(
          employees.map((employee) => employee._id)
        );
        const leaveByEmployeeId = new Map(
          approvedLeaves.map((leaveRequest) => [String(leaveRequest.employee), leaveRequest])
        );

        res.status(200).json([
          currentUserAssignee,
          ...employees.map((employee) => {
            const leaveRequest = leaveByEmployeeId.get(String(employee._id));
            return {
              ...employee,
              isOnLeave: Boolean(leaveRequest),
              leaveType: leaveRequest?.leaveType || "",
              leaveEndDate: leaveRequest?.endDate,
            };
          }),
        ]);
      } catch (error) {
        console.error("Get assignees error:", error);
        res.status(500).json({ message: "Unable to fetch assignees" });
      }
    });

    router.get("/employees", protect, authorize("admin"), async (req, res) => {
      try {
        const { page, limit, skip } = getPagination(req.query);
        const search = getSafeSearchPattern(req.query.search);
        const query = {
          role: "employee",
          ...(req.query.isActive === "true"
            ? { isActive: true }
            : req.query.isActive === "false"
              ? { isActive: false }
              : {}),
          ...(search
            ? {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { position: { $regex: search, $options: "i" } },
                ],
              }
            : {}),
        };
        const [employees, total] = await Promise.all([
          User.find(query)
          .select("firstName lastName email phone country position role isActive isOnline showOnlineStatus lastSeen createdAt updatedAt")
          .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .maxTimeMS(8000)
          .lean(),
          User.countDocuments(query).maxTimeMS(8000),
        ]);

        res.status(200).json(pagedResponse({
          data: employees.map((employee) =>
            withAvatarUrl({
              ...employee,
              isOnline: isUserOnline(employee),
            })
          ),
          page,
          limit,
          total,
          key: "employees",
        }));
      } catch (error) {
        console.error("Get employees error:", error);
        res.status(500).json({ message: "Unable to fetch employees" });
      }
    });

    router.post("/employees", protect, authorize("admin"), async (req, res) => {
      try {
        const {
          firstName,
          lastName,
          email,
          password,
          phone = "",
          country = "Philippines",
          position = "",
          isActive = true,
        } = req.body;

        if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
          return res.status(400).json({
            message: "First name, last name, email, and password are required",
          });
        }

        if (password.length < 8) {
          return res
            .status(400)
            .json({ message: "Password must be at least 8 characters" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
          return res.status(400).json({ message: "Enter a valid email" });
        }

        const phoneValidation = getPhoneValidationMessage(phone, country);
        if (phoneValidation) {
          return res.status(400).json({ message: phoneValidation });
        }

        const userExists = await User.exists({ email: normalizedEmail });

        if (userExists) {
          return res.status(400).json({ message: "User already exists" });
        }

        const employee = await User.create({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
          phone: phone.trim(),
          country: country.trim() || "Philippines",
          position: position.trim(),
          role: "employee",
          isActive: true,
        });

        res.status(201).json({
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          country: employee.country,
          position: employee.position,
          role: employee.role,
          avatar: employee.avatar,
          isActive: employee.isActive,
        });
      } catch (error) {
        console.error("Create employee error:", error);
        res.status(500).json({ message: "Unable to create employee" });
      }
    });

    router.put("/employees/:id", protect, authorize("admin"), async (req, res) => {
      try {
        const employee = await User.findOne({
          _id: req.params.id,
          role: "employee",
        }).select("+trustedDevices");

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        const {
          firstName,
          lastName,
          email,
          phone,
          country,
          position,
          isActive,
          password,
        } = req.body;

        if (firstName !== undefined) employee.firstName = firstName.trim();
        if (lastName !== undefined) employee.lastName = lastName.trim();
        if (email !== undefined) {
          const normalizedEmail = email.trim().toLowerCase();
          if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Enter a valid email" });
          }
          employee.email = normalizedEmail;
        }
        if (phone !== undefined) {
          const phoneValidation = getPhoneValidationMessage(phone, country ?? employee.country);
          if (phoneValidation) {
            return res.status(400).json({ message: phoneValidation });
          }
          employee.phone = phone.trim();
        }
        if (country !== undefined) employee.country = country.trim() || "Philippines";
        if (position !== undefined) employee.position = position.trim();
        if (isActive !== undefined) employee.isActive = isActive;
        if (password) {
          if (password.length < 8) {
            return res
              .status(400)
              .json({ message: "Password must be at least 8 characters" });
          }
          employee.password = password;
          employee.trustedDevices = [];
        }

        await employee.save();
        clearCachedAuthUser(employee._id);

        res.status(200).json({
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          country: employee.country,
          position: employee.position,
          role: employee.role,
          avatar: employee.avatar,
          isActive: employee.isActive,
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(400).json({ message: "Email is already used" });
        }
        console.error("Update employee error:", error);
        res.status(500).json({ message: "Unable to update employee" });
      }
    });

    router.delete("/employees/:id", protect, authorize("admin"), async (req, res) => {
      try {
        const employee = await User.findOneAndDelete({
          _id: req.params.id,
          role: "employee",
        });

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        clearCachedAuthUser(employee._id);

        res.status(200).json({ message: "Employee deleted" });
      } catch (error) {
        console.error("Delete employee error:", error);
        res.status(500).json({ message: "Unable to delete employee" });
      }
    });



    export default router;
