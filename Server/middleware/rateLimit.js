const MAX_RATE_LIMIT_KEYS = 10_000;

export const createRateLimiter = ({
  max,
  windowMs,
  message = "Too many requests. Please try again later.",
  keyGenerator,
  requestCost,
}) => {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = String(
      keyGenerator?.(req) || req.ip || req.socket?.remoteAddress || "unknown"
    );
    const cost = Math.max(1, Math.floor(Number(requestCost?.(req)) || 1));
    let entry = requests.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      requests.delete(key);
      requests.set(key, entry);
    }

    if (entry.count + cost > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    entry.count += cost;

    if (requests.size > MAX_RATE_LIMIT_KEYS) {
      for (const [storedKey, storedEntry] of requests) {
        if (storedEntry.resetAt <= now || requests.size > MAX_RATE_LIMIT_KEYS) {
          requests.delete(storedKey);
        }
        if (requests.size <= MAX_RATE_LIMIT_KEYS) break;
      }
    }

    return next();
  };
};
