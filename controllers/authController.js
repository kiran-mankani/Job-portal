// ==========================================
// IMPORT PACKAGES
// ==========================================

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// ==========================================
// EMAIL SERVICE
// ==========================================


// ==========================================
// EMAIL SERVICE
// ==========================================

const { sendOtpEmail } = require("../services/emailService");
// ==========================================
// 1. CANDIDATE REGISTRATION
// POST /api/auth/register
// ==========================================

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and phone are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "candidate",
    });

    return res.status(201).json({
      success: true,
      message: "Candidate registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// ==========================================
// 2. RECRUITER REGISTRATION
// POST /api/auth/recruiter-register
// ==========================================

const registerRecruiter = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and phone are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "recruiter",
    });

    return res.status(201).json({
      success: true,
      message: "Recruiter registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Recruiter Registration Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during recruiter registration",
      error: error.message,
    });
  }
};

// ==========================================
// 3. LOGIN
// POST /api/auth/login
// ==========================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// ==========================================
// 4. FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const otpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpiry;

    await user.save();
await sendOtpEmail({
  to: email,
  otp,
});

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send password reset OTP",
      error: error.message,
    });
  }
};

// ==========================================
// 5. RESEND OTP
// POST /api/auth/resend-otp
// ==========================================

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

   await sendOtpEmail({
  to: user.email,
  otp,
});
    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

// ==========================================
// 6. VERIFY OTP
// POST /api/auth/verify-otp
// ==========================================

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (!user.resetPasswordOTP) {
      return res.status(400).json({
        success: false,
        message: "No password reset OTP found",
      });
    }

    if (
      !user.resetPasswordOTPExpires ||
      user.resetPasswordOTPExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

   if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying OTP",
      error: error.message,
    });
  }
};

// ==========================================
// 7. RESET PASSWORD
// POST /api/auth/reset-password
// ==========================================

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while resetting password",
      error: error.message,
    });
  }
};

// ==========================================
// 8. GET CURRENT USER / PROFILE
// GET /api/auth/me
// ==========================================

const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Current user fetched successfully",
      user: req.user,
    });
  } catch (error) {
    console.error("Get Current User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching current user",
      error: error.message,
    });
  }
};
// ==========================================
// 9. UPDATE PROFILE
// PUT /api/auth/profile
// ==========================================

const updateProfile = async (req, res) => {
  try {
    // Frontend se updated data lena
    const { name, phone } = req.body;

    // Logged-in user ko find karna
    const user = await User.findById(req.user._id);

    // User nahi mila
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Name update
    if (name) {
      user.name = name;
    }

    // Phone update
    if (phone) {
      user.phone = phone;
    }

    // Database mein save
    await user.save();

    // Updated user frontend ko bhejna
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
      error: error.message,
    });
  }
};

// ==========================================
// 9. LOGOUT
// POST /api/auth/logout
// ==========================================

const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT AUTH CONTROLLERS
// ==========================================

module.exports = {
  registerUser,
  registerRecruiter,
  loginUser,
  forgotPassword,
  resendOTP,
  verifyOTP,
  resetPassword,
  getCurrentUser,
  logoutUser,
  updateProfile,
};