import express from "express";
import User from "../model/userModel.js";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getPhoneValidationMessage } from "../utils/phoneValidation.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";


const router = express.Router();
const emailRegex =
  /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const isValidEmail = (email) => {
  const trimmedEmail = email.trim();
  return (
    trimmedEmail.length <= 254 &&
    !trimmedEmail.includes("..") &&
    emailRegex.test(trimmedEmail)
  );
};

// Register route
router.post("/register", async (req, res) => {
  const {
    firstName,
    middleInitial = "",
    lastName,
    companyName = "",
    email,
    password,
    phone = "",
    country = "Philippines",
  } = req.body;

  try {
    if (!firstName || !lastName || !companyName || !email || !password) {
      return res
        .status(400)
        .json({
          message: "Please provide first name, last name, company name, email, and password",
        });
    }

    const trimmedFirstName = firstName.trim();
    const trimmedMiddleInitial = middleInitial.trim();
    const trimmedLastName = lastName.trim();
    const trimmedCompanyName = companyName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedFirstName || !trimmedLastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required" });
    }

    if (!trimmedCompanyName) {
      return res.status(400).json({ message: "Company name is required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Enter a valid email" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        message: "Password must include uppercase, lowercase, and number characters",
      });
    }

    const phoneValidation = getPhoneValidationMessage(phone, country);
    if (phoneValidation) {
      return res.status(400).json({ message: phoneValidation });
    }

    const userExists = await User.exists({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      firstName: trimmedFirstName,
      middleInitial: trimmedMiddleInitial,
      lastName: trimmedLastName,
      companyName: trimmedCompanyName,
      email: normalizedEmail,
      password,
      phone: phone.trim(),
      country: country.trim() || "Philippines",
    });
    const token = generateToken(user._id);
    res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      middleInitial: user.middleInitial,
      lastName: user.lastName,
      companyName: user.companyName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      country: user.country,
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
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
   const normalizedEmail = email.trim().toLowerCase();
   if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email" });
   }
   const user = await User.findOne({ email: normalizedEmail }).select("password role email");

    if(!user || !(await user.matchPassword(password))){
        return res.status(401).json({message: "Invalid email or password"});
    }
    const token = generateToken(user._id);
    res.status(200).json({id: user._id, email: user.email, role: user.role, token});
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

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email" });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ message: "Email service not configured" });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });

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
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email" });
    }

    const user = await User.findOne({ email: normalizedEmail });
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

    router.patch("/presence", protect, async (req, res) => {
      try {
        const isOnline = req.body?.isOnline !== false;
        const user = await User.findByIdAndUpdate(
          req.user._id,
          {
            isOnline,
            lastSeen: new Date(),
          },
          {
            new: true,
            select: "firstName lastName email role avatar companyName isActive isOnline lastSeen",
          }
        ).lean();

        res.status(200).json(user);
      } catch (error) {
        console.error("Update presence error:", error);
        res.status(500).json({ message: "Unable to update presence" });
      }
    });

    router.get("/online-team", protect, async (req, res) => {
      try {
        const onlineSince = new Date(Date.now() - 2 * 60 * 1000);
        const users = await User.find({
          role: { $in: ["admin", "employee"] },
          $or: [
            { _id: req.user._id },
            {
              isOnline: true,
              lastSeen: { $gte: onlineSince },
              isActive: { $ne: false },
            },
          ],
        })
          .select("firstName lastName email role avatar companyName isActive isOnline lastSeen")
          .sort({ lastSeen: -1, firstName: 1, lastName: 1 })
          .maxTimeMS(8000)
          .lean();

        res.status(200).json(users);
      } catch (error) {
        console.error("Get online team error:", error);
        res.status(500).json({ message: "Unable to fetch online team" });
      }
    });

    router.get("/users/:id", protect, async (req, res) => {
      try {
        const user = await User.findById(req.params.id).select(
          "firstName middleInitial lastName companyName email phone country role avatar position isActive"
        ).lean();

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
      } catch (error) {
        console.error("Get public profile error:", error);
        res.status(500).json({ message: "Unable to load profile" });
      }
    });

    router.put("/me", protect, async (req, res) => {
      try {
        const user = await User.findById(req.user._id);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const {
          firstName,
          middleInitial,
          lastName,
          companyName,
          email,
          phone,
          country,
          position,
          avatar,
          password,
        } = req.body;

        if (firstName !== undefined) {
          if (!firstName.trim()) {
            return res.status(400).json({ message: "First name is required" });
          }
          user.firstName = firstName.trim();
        }

        if (lastName !== undefined) {
          if (!lastName.trim()) {
            return res.status(400).json({ message: "Last name is required" });
          }
          user.lastName = lastName.trim();
        }

        if (middleInitial !== undefined) user.middleInitial = middleInitial.trim();

        if (companyName !== undefined) user.companyName = companyName.trim();

        if (email !== undefined) {
          const normalizedEmail = email.trim().toLowerCase();

          if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Enter a valid email" });
          }

          const emailOwner = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: user._id },
          });

          if (emailOwner) {
            return res.status(400).json({ message: "Email is already used" });
          }

          user.email = normalizedEmail;
        }

        if (phone !== undefined) {
          const phoneValidation = getPhoneValidationMessage(phone, country ?? user.country);
          if (phoneValidation) {
            return res.status(400).json({ message: phoneValidation });
          }
          user.phone = phone.trim();
        }
        if (country !== undefined) user.country = country.trim() || "Philippines";
        if (position !== undefined) user.position = position.trim();
        if (avatar !== undefined) user.avatar = avatar;

        if (password) {
          if (password.length < 8) {
            return res
              .status(400)
              .json({ message: "Password must be at least 8 characters" });
          }

          if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({
              message: "Password must include uppercase, lowercase, and number characters",
            });
          }

          user.password = password;
        }

        await user.save();

        res.status(200).json({
          id: user._id,
          _id: user._id,
          firstName: user.firstName,
          middleInitial: user.middleInitial,
          lastName: user.lastName,
          companyName: user.companyName,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          country: user.country,
          position: user.position,
          isActive: user.isActive,
        });
      } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Unable to update profile" });
      }
    });

    router.get("/assignees", protect, async (req, res) => {
      try {
        const employees = await User.find({
          role: "employee",
          isActive: true,
          _id: { $ne: req.user._id },
        })
          .select("firstName lastName email role")
          .sort({ firstName: 1, lastName: 1 })
          .lean();

        res.status(200).json([
          {
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            role: req.user.role,
            isSelf: true,
          },
          ...employees,
        ]);
      } catch (error) {
        console.error("Get assignees error:", error);
        res.status(500).json({ message: "Unable to fetch assignees" });
      }
    });

    router.get("/employees", protect, authorize("admin"), async (req, res) => {
      try {
        const { page, limit, skip } = getPagination(req.query);
        const search = String(req.query.search || "").trim();
        const query = {
          role: "employee",
          ...(req.query.isActive === "true"
            ? { isActive: true }
            : req.query.isActive === "false"
              ? { isActive: false }
              : {}),
          ...(search
            ? {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { position: { $regex: search, $options: "i" } },
                ],
              }
            : {}),
        };
        const [employees, total] = await Promise.all([
          User.find(query)
          .select("firstName lastName email phone country position role avatar isActive")
          .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .maxTimeMS(8000)
          .lean(),
          User.countDocuments(query).maxTimeMS(8000),
        ]);

        res.status(200).json(pagedResponse({ data: employees, page, limit, total, key: "employees" }));
      } catch (error) {
        console.error("Get employees error:", error);
        res.status(500).json({ message: "Unable to fetch employees" });
      }
    });

    router.post("/employees", protect, authorize("admin"), async (req, res) => {
      try {
        const {
          firstName,
          lastName,
          email,
          password,
          phone = "",
          country = "Philippines",
          position = "",
          isActive = true,
        } = req.body;

        if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
          return res.status(400).json({
            message: "First name, last name, email, and password are required",
          });
        }

        if (password.length < 8) {
          return res
            .status(400)
            .json({ message: "Password must be at least 8 characters" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
          return res.status(400).json({ message: "Enter a valid email" });
        }

        const phoneValidation = getPhoneValidationMessage(phone, country);
        if (phoneValidation) {
          return res.status(400).json({ message: phoneValidation });
        }

        const userExists = await User.exists({ email: normalizedEmail });

        if (userExists) {
          return res.status(400).json({ message: "User already exists" });
        }

        const employee = await User.create({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
          phone: phone.trim(),
          country: country.trim() || "Philippines",
          position: position.trim(),
          role: "employee",
          isActive: true,
        });

        res.status(201).json({
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          country: employee.country,
          position: employee.position,
          role: employee.role,
          avatar: employee.avatar,
          isActive: employee.isActive,
        });
      } catch (error) {
        console.error("Create employee error:", error);
        res.status(500).json({ message: "Unable to create employee" });
      }
    });

    router.put("/employees/:id", protect, authorize("admin"), async (req, res) => {
      try {
        const employee = await User.findOne({
          _id: req.params.id,
          role: "employee",
        });

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        const {
          firstName,
          lastName,
          email,
          phone,
          country,
          position,
          isActive,
          password,
        } = req.body;

        if (firstName !== undefined) employee.firstName = firstName.trim();
        if (lastName !== undefined) employee.lastName = lastName.trim();
        if (email !== undefined) {
          const normalizedEmail = email.trim().toLowerCase();
          if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Enter a valid email" });
          }
          employee.email = normalizedEmail;
        }
        if (phone !== undefined) {
          const phoneValidation = getPhoneValidationMessage(phone, country ?? employee.country);
          if (phoneValidation) {
            return res.status(400).json({ message: phoneValidation });
          }
          employee.phone = phone.trim();
        }
        if (country !== undefined) employee.country = country.trim() || "Philippines";
        if (position !== undefined) employee.position = position.trim();
        if (isActive !== undefined) employee.isActive = isActive;
        if (password) {
          if (password.length < 8) {
            return res
              .status(400)
              .json({ message: "Password must be at least 8 characters" });
          }
          employee.password = password;
        }

        await employee.save();

        res.status(200).json({
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          country: employee.country,
          position: employee.position,
          role: employee.role,
          avatar: employee.avatar,
          isActive: employee.isActive,
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(400).json({ message: "Email is already used" });
        }
        console.error("Update employee error:", error);
        res.status(500).json({ message: "Unable to update employee" });
      }
    });

    router.delete("/employees/:id", protect, authorize("admin"), async (req, res) => {
      try {
        const employee = await User.findOneAndDelete({
          _id: req.params.id,
          role: "employee",
        });

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        res.status(200).json({ message: "Employee deleted" });
      } catch (error) {
        console.error("Delete employee error:", error);
        res.status(500).json({ message: "Unable to delete employee" });
      }
    });

    // generate JWT token
      const generateToken = (id) => {
       return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d',
       });

      }

    export default router;
