// Role-based middleware for authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(req.user.type)) {
      return res.status(403).json({
        message: `User role '${req.user.type}' is not authorized to access this route`,
      });
    }

    next();
  };
};
