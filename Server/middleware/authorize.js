// Role-based middleware for authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(req.user.role)) {
      console.warn(
        `[auth] Role denied for ${req.method} ${req.originalUrl}: '${req.user.role}' not in [${roles.join(", ")}]`
      );
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};
