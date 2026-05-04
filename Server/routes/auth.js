import express from "express";
import User from "../model/userModel.js";
import { protect } from "../middleware/protectedjwt.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";


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

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ message: "Email service not configured" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Email is not registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = Date.now() + 1000 * 60 * 10; // 10 minutes
    await user.save();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      from: process.env.GMAIL_USER,
      subject: "Your password reset code",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f7fb; padding: 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
                  <tr>
                    <td style="text-align: center; padding-bottom: 12px;">
                      <div style="display: inline-block; padding: 10px 14px; border-radius: 14px; background: linear-gradient(135deg, #ff72a1, #8c6ff0); color: #fff; font-weight: 700; letter-spacing: 0.5px;">
                        Reset Request
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; color: #1f2937; font-size: 22px; font-weight: 700; padding: 4px 0 8px;">
                      Here is your OTP
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; color: #4b5563; font-size: 15px; padding: 0 16px 18px;">
                      Use this one-time code to reset your password. It will expire in 10 minutes.
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding: 10px 0 24px;">
                      <div style="display: inline-block; letter-spacing: 6px; font-size: 30px; font-weight: 800; color: #111827; background: #f5f3ff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 24px;">
                        ${otp}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; color: #6b7280; font-size: 13px; padding-bottom: 6px;">
                      If you did not request this, you can ignore this email.
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; color: #9ca3af; font-size: 12px;">
                      This is an automated message. Please do not reply.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

    res.status(200).json({ message: "If that email is registered, reset instructions have been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Unable to send reset email" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const isValid =
      user.resetPasswordOTP === hashedOTP &&
      user.resetPasswordOTPExpires &&
      user.resetPasswordOTPExpires > Date.now();

    if (!isValid) {
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    user.password = password;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Unable to reset password" });
  }
});

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