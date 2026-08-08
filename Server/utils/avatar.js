import crypto from "crypto";
import sharp from "sharp";

const avatarCache = new Map();
const MAX_AVATAR_CACHE_ENTRIES = 100;
const MAX_AVATAR_CACHE_BYTES = 24 * 1024 * 1024;
const MAX_AVATAR_UPLOAD_BYTES = 6 * 1024 * 1024;
export const MAX_STORED_AVATAR_BYTES = 512 * 1024;
let avatarCacheBytes = 0;

const getAvatarSecret = () => process.env.JWT_SECRET || "";
const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  if (entity._id) return String(entity._id);
  if (typeof entity.id === "string") return entity.id;
  return String(entity);
};

const getAvatarVersion = (user) => {
  const updatedAt = new Date(user?.updatedAt || 0).getTime();
  return Number.isFinite(updatedAt) ? String(updatedAt) : "0";
};

const createAvatarSignature = (userId, version) =>
  crypto
    .createHmac("sha256", getAvatarSecret())
    .update(`avatar:${userId}:${version}`)
    .digest("hex");

const getAvatarCacheKey = (userId, version) => `${userId}:${version}`;

export const getCachedAvatar = (userId, version) => {
  const key = getAvatarCacheKey(userId, version);
  const entry = avatarCache.get(key);

  if (!entry) return { hit: false, avatar: null };

  avatarCache.delete(key);
  avatarCache.set(key, entry);
  return { hit: true, avatar: entry.avatar };
};

export const setCachedAvatar = (userId, version, value) => {
  const key = getAvatarCacheKey(userId, version);
  const avatar = parseAvatarDataUrl(value);
  const bytes = avatar?.buffer.length || 0;
  const previous = avatarCache.get(key);

  if (previous) avatarCacheBytes -= previous.bytes;
  avatarCache.delete(key);
  avatarCache.set(key, { avatar, bytes });
  avatarCacheBytes += bytes;

  while (
    avatarCache.size > MAX_AVATAR_CACHE_ENTRIES ||
    avatarCacheBytes > MAX_AVATAR_CACHE_BYTES
  ) {
    const oldestKey = avatarCache.keys().next().value;
    const oldest = avatarCache.get(oldestKey);
    avatarCacheBytes -= oldest?.bytes || 0;
    avatarCache.delete(oldestKey);
  }

  return avatar;
};

export const getAvatarUrl = (user) => {
  const userId = getEntityId(user);
  if (!userId || !getAvatarSecret()) return "";

  const version = getAvatarVersion(user);
  const signature = createAvatarSignature(userId, version);
  return `/api/auth/users/${userId}/avatar?v=${version}&signature=${signature}`;
};

export const withAvatarUrl = (user) => {
  // A Mongoose ObjectId exposes an `_id` getter that points to itself. It is
  // still only a reference, not a populated user, so do not spread it into a
  // profile object or replace its normal string JSON representation.
  if (
    !user ||
    typeof user !== "object" ||
    typeof user.toHexString === "function" ||
    !user._id
  ) {
    return user;
  }

  const userId = getEntityId(user);
  const version = getAvatarVersion(user);
  if (Object.prototype.hasOwnProperty.call(user, "avatar")) {
    setCachedAvatar(userId, version, user.avatar);
  }

  const profile = { ...user };
  delete profile.updatedAt;
  delete profile.avatar;
  return { ...profile, avatar: getAvatarUrl(user) };
};

export const isValidAvatarSignature = (userId, version, signature) => {
  if (!userId || !version || !signature || !getAvatarSecret()) return false;

  const expected = Buffer.from(createAvatarSignature(userId, version), "hex");
  const received = Buffer.from(String(signature), "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

export const parseAvatarDataUrl = (value) => {
  const match = String(value || "").match(
    /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/
  );
  if (!match) return null;

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
  };
};

export const optimizeAvatarDataUrl = async (value) => {
  if (value === "") return "";

  const avatar = parseAvatarDataUrl(value);
  if (!avatar) {
    const error = new Error("Avatar must be a PNG, JPEG, WebP, or GIF image");
    error.status = 400;
    throw error;
  }

  if (avatar.buffer.length > MAX_AVATAR_UPLOAD_BYTES) {
    const error = new Error("Avatar image must be 6MB or smaller");
    error.status = 413;
    throw error;
  }

  let optimized = await sharp(avatar.buffer, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize(512, 512, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  if (optimized.length > MAX_STORED_AVATAR_BYTES) {
    optimized = await sharp(optimized)
      .webp({ quality: 68, effort: 5 })
      .toBuffer();
  }

  return `data:image/webp;base64,${optimized.toString("base64")}`;
};
