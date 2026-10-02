import mongoose from "mongoose";

export const validateObjectIdParam = (req, res, next, value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: "Invalid resource id" });
  }

  return next();
};
