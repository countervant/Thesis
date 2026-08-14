import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import {
  MAX_STORED_AVATAR_BYTES,
  optimizeAvatarDataUrl,
  parseAvatarDataUrl,
} from "../utils/avatar.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../.env") });

const maxStoredCharacters = Math.ceil((MAX_STORED_AVATAR_BYTES * 4) / 3) + 64;

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    autoCreate: false,
    autoIndex: false,
    maxPoolSize: 2,
    minPoolSize: 0,
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 120000,
  });

  const users = await User.find({
    $expr: {
      $gt: [
        { $strLenBytes: { $ifNull: ["$avatar", ""] } },
        maxStoredCharacters,
      ],
    },
  })
    .select("avatar")
    .maxTimeMS(60000);

  if (!users.length) {
    console.log("No oversized avatars found.");
  }

  for (const user of users) {
    const beforeBytes = parseAvatarDataUrl(user.avatar)?.buffer.length || 0;
    user.avatar = await optimizeAvatarDataUrl(user.avatar);
    const afterBytes = parseAvatarDataUrl(user.avatar)?.buffer.length || 0;
    await user.save({ validateModifiedOnly: true });
    console.log(
      `Optimized avatar ${user._id}: ${Math.round(beforeBytes / 1024)}KB -> ${Math.round(afterBytes / 1024)}KB`
    );
  }
} catch (error) {
  console.error("Avatar optimization failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch((error) => {
    console.warn("Unable to disconnect cleanly after avatar optimization:", error);
  });
}
