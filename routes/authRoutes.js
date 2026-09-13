
const express = require("express");

const protect = require("../middleware/authMiddleware");

const uploadResume = require("../middleware/uploadMiddleware");

const uploadProfileImageMiddleware = require(
  "../middleware/uploadProfileImageMiddleware"
);

const {
  registerUser,
  registerRecruiter,
  loginUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
  resendOTP,
  changePassword,
  logoutUser,
  getCurrentUser,
  updateProfile,
  uploadResume: uploadResumeController,
  uploadProfileImage,
  convertToRecruiter,
  downloadResume,
} = require("../controllers/authController");

const router = express.Router();

// ==========================================
// CANDIDATE REGISTRATION
// POST /api/auth/register
// ==========================================

router.post(
  "/register",
  registerUser
);

// ==========================================
// RECRUITER REGISTRATION
// POST /api/auth/recruiter-register
// ==========================================

router.post(
  "/recruiter-register",
  registerRecruiter
);

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

router.post(
  "/login",
  loginUser
);

// ==========================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================

router.post(
  "/forgot-password",
  forgotPassword
);

// ==========================================
// VERIFY OTP
// POST /api/auth/verify-otp
// ==========================================

router.post(
  "/verify-otp",
  verifyOTP
);

// ==========================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ==========================================

router.post(
  "/reset-password",
  resetPassword
);

// ==========================================
// GET CURRENT USER
// GET /api/auth/me
// ==========================================

router.get(
  "/me",
  protect,
  getCurrentUser
);

// ==========================================
// UPDATE PROFILE
// PUT /api/auth/profile
// ==========================================

router.put(
  "/profile",
  protect,
  updateProfile
);

// ==========================================
// CHANGE PASSWORD
// PUT /api/auth/change-password
// ==========================================

router.put(
  "/change-password",
  protect,
  changePassword
);

// ==========================================
// UPLOAD RESUME
// POST /api/auth/profile/resume
//
// Frontend field: resume
// Database field: user.profile.resume
// ==========================================

router.post(
  "/profile/resume",
  protect,
  uploadResume.single("resume"),
  uploadResumeController
);

// ==========================================
// DOWNLOAD RESUME
// GET /api/auth/profile/resume/download
//
// Protected route.
// Resume is downloaded through the backend
// instead of directly from Cloudinary.
// ==========================================

router.get(
  "/profile/resume/download",
  protect,
  downloadResume
);

// ==========================================
// UPLOAD PROFILE IMAGE / DP
// POST /api/auth/profile/image
// ==========================================

router.post(
  "/profile/image",
  protect,
  uploadProfileImageMiddleware.single("profileImage"),
  uploadProfileImage
);

// ==========================================
// RESEND OTP
// POST /api/auth/resend-otp
// ==========================================

router.post(
  "/resend-otp",
  resendOTP
);

// ==========================================
// CONVERT CANDIDATE TO RECRUITER
// PUT /api/auth/convert-to-recruiter
// ==========================================

router.put(
  "/convert-to-recruiter",
  protect,
  convertToRecruiter
);

// ==========================================
// LOGOUT
// POST /api/auth/logout
// ==========================================

router.post(
  "/logout",
  logoutUser
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;
