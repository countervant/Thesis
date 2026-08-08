import crypto from "crypto";

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
  const { updatedAt, ...profile } = user;
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
