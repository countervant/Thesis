import express from "express";
import User from "../model/userModel.js";
import { protect } from "../middleware/protectedjwt.js";
import jwt from "jsonwebtoken";


const router = express.Router();

// Register route
router.post("/register", async (req, res) => {
  const { email, password, type } = req.body;
  // Default type to "Client" if not provided
  const userType = type || "Client";

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    // Validate type
    if (!["Admin", "Employee", "Client"].includes(userType)) {
      return res
        .status(400)
        .json({ message: "Invalid type. Must be Admin, Employee, or Client" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ email, password, type: userType });
    const token = generateToken(user._id);
    res.status(201).json({ id: user._id, email: user.email, type: user.type, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try{
  if (!email || !password) {    
    return res
    .status(400)
    .json({ message: "Please provide email and password" });
  }
   const user = await User.findOne({ email });

    if(!user || !(await user.matchPassword(password))){
        return res.status(401).json({message: "Invalid email or password"});
    }
    const token = generateToken(user._id);
    res.status(200).json({id: user._id, email: user.email, type: user.type, token});
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}
);

    router.get('/me', protect,  async (req, res) => {
      res.status(200).json(req.user);
     }
    );

    // generate JWT token
      const generateToken = (id) => {
       return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d',
       });

      }

    export default router;