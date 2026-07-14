import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';

const AUTH_USER_CACHE_MS = Number(process.env.AUTH_USER_CACHE_MS) || 30000;
const authUserCache = new Map();
const authUserFields =
  "firstName middleInitial lastName companyName email phone country role position avatar coverPhoto isActive isOnline lastSeen twoFactorEnabled createdAt updatedAt";

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
    return cached.promise || cached.user;
  }

  const promise = User.findById(userId)
    .select(authUserFields)
    .maxTimeMS(8000)
    .lean()
    .then((user) => {
      if (user) {
        authUserCache.set(userId, {
          user,
          expiresAt: Date.now() + AUTH_USER_CACHE_MS,
        });
      } else {
        authUserCache.delete(userId);
      }
      return user;
    })
    .catch((error) => {
      authUserCache.delete(userId);
      throw error;
    });

  authUserCache.set(userId, {
    promise,
    expiresAt: now + AUTH_USER_CACHE_MS,
  });

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
