import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';
import { withAvatarUrl } from '../utils/avatar.js';

const AUTH_USER_CACHE_MS = Number(process.env.AUTH_USER_CACHE_MS) || 30000;
const MAX_AUTH_USER_CACHE_ENTRIES = 500;
const authUserCache = new Map();
const authUserFields =
  "firstName middleInitial lastName companyName email phone country role position birthday gender skillGroups isActive isOnline showOnlineStatus privacySettings lastSeen twoFactorEnabled +passwordChangedAt createdAt updatedAt";
const adminTwoFactorSetupPaths = new Set([
  "/api/auth/2fa-status",
  "/api/auth/enable-2fa/request",
  "/api/auth/enable-2fa/verify",
  "/api/user/2fa-status",
  "/api/user/enable-2fa/request",
  "/api/user/enable-2fa/verify",
]);

export const canUseSetupOnlyTokenForPath = (setupOnly, requestPath) =>
  setupOnly !== true || adminTwoFactorSetupPaths.has(requestPath);

export const clearCachedAuthUser = (userId) => {
  if (userId) authUserCache.delete(String(userId));
};

export const wasTokenIssuedBeforePasswordChange = (issuedAtSeconds, passwordChangedAt) => {
  if (!passwordChangedAt) return false;

  const issuedAtMilliseconds = Number(issuedAtSeconds) * 1000;
  const passwordChangedAtMilliseconds = new Date(passwordChangedAt).getTime();
  if (!Number.isFinite(issuedAtMilliseconds) || Number.isNaN(passwordChangedAtMilliseconds)) {
    return true;
  }

  // JWT iat has one-second precision. Permit the token created in the same
  // second as a completed password change, but reject every older token.
  return issuedAtMilliseconds + 1000 < passwordChangedAtMilliseconds;
};

const setCachedAuthUser = (userId, entry) => {
  authUserCache.delete(userId);
  authUserCache.set(userId, entry);

  while (authUserCache.size > MAX_AUTH_USER_CACHE_ENTRIES) {
    authUserCache.delete(authUserCache.keys().next().value);
  }
};

const isDatabaseTimeout = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "MongoNetworkTimeoutError" ||
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongooseError" ||
    message.includes("timed out") ||
    message.includes("server selection") ||
    message.includes("connection")
  );
};

const getCachedUser = async (userId) => {
  const cached = authUserCache.get(userId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    setCachedAuthUser(userId, cached);
    return cached.promise || cached.user;
  }

  const requestEntry = {
    promise: null,
    expiresAt: now + AUTH_USER_CACHE_MS,
  };
  const promise = User.findById(userId)
    .select(authUserFields)
    .maxTimeMS(8000)
    .lean()
    .then((user) => {
      if (user) {
        const profile = withAvatarUrl(user);
        if (authUserCache.get(userId) === requestEntry) {
          setCachedAuthUser(userId, {
            user: profile,
            expiresAt: Date.now() + AUTH_USER_CACHE_MS,
          });
        }
        return profile;
      } else if (authUserCache.get(userId) === requestEntry) {
        authUserCache.delete(userId);
      }
      return user;
    })
    .catch((error) => {
      if (authUserCache.get(userId) === requestEntry) {
        authUserCache.delete(userId);
      }
      throw error;
    });

  requestEntry.promise = promise;
  setCachedAuthUser(userId, requestEntry);

  return promise;
};

export const protect = async (req, res, next) => {
  let token;

  if (!process.env.JWT_SECRET) {
    console.error('[auth] JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Server authentication is not configured' });
  }

  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
    try{
    token = req.headers.authorization.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.type && decoded.type !== "access") {
      return res.status(401).json({ message: 'Not authorized, full authentication required' });
    }
    req.user = await getCachedUser(decoded.id);

    if (!req.user) {
      console.warn(`[auth] Token user not found for ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    if (req.user.isActive === false) {
      clearCachedAuthUser(decoded.id);
      return res.status(401).json({ message: 'Account is inactive' });
    }
    if (wasTokenIssuedBeforePasswordChange(decoded.iat, req.user.passwordChangedAt)) {
      clearCachedAuthUser(decoded.id);
      return res.status(401).json({ message: 'Not authorized, password was changed' });
    }
    const requestPath = req.originalUrl.split("?", 1)[0];
    if (!canUseSetupOnlyTokenForPath(decoded.setupOnly, requestPath)) {
      return res.status(403).json({
        message: "Two-factor authentication setup is required for administrator accounts",
        code: "TWO_FACTOR_SETUP_REQUIRED",
      });
    }
    if (
      req.user.role === "admin" &&
      req.user.twoFactorEnabled !== true &&
      !adminTwoFactorSetupPaths.has(requestPath)
    ) {
      return res.status(403).json({
        message: "Two-factor authentication setup is required for administrator accounts",
        code: "TWO_FACTOR_SETUP_REQUIRED",
      });
    }

    return next();
    } catch (error){
      if (isDatabaseTimeout(error)) {
        console.error(`[database] Auth lookup failed for ${req.method} ${req.originalUrl}:`, error.message);
        return res.status(503).json({ message: 'Database unavailable' });
      }

      console.error(`[auth] Token failed for ${req.method} ${req.originalUrl}:`, error.message);
      return res.status(401).json({message: 'Not authorized, token failed'});
    }
}
console.warn(`[auth] Missing token for ${req.method} ${req.originalUrl}`);
return res.status(401).json({message: 'Not authorized, no token'});
}
