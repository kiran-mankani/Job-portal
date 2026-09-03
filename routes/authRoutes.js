const express = require("express");



const protect = require("../middleware/authMiddleware");

const {
 
  registerUser,
  registerRecruiter,
  loginUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
  resendOTP,
  logoutUser,
  getCurrentUser,
    updateProfile,

} = require("../controllers/authController");

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new candidate
 *     description: Creates a new candidate account.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum:
 *                   - candidate
 *     responses:
 *       201:
 *         description: Candidate registered successfully
 *       400:
 *         description: Required fields are missing
 *       409:
 *         description: Email is already registered
 *       500:
 *         description: Server error
 */

// Candidate Registration API


// Candidate Registration API
// POST /api/auth/register
router.post("/register", registerUser);/**
 * @swagger
 * /api/auth/recruiter-register:
 *   post:
 *     summary: Register a new recruiter
 *     description: Creates a new recruiter account in the job portal.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recruiter registered successfully
 *       400:
 *         description: Required fields are missing
 *       409:
 *         description: Email is already registered
 *       500:
 *         description: Server error during recruiter registration
 */

// Recruiter Registration API
// POST /api/auth/recruiter-register
router.post("/recruiter-register", registerRecruiter);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login candidate or recruiter
 *     description: Authenticates a candidate or recruiter and returns a JWT token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Email or password is missing
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Server error during login
 */

// Login API
// POST /api/auth/login
router.post("/login", loginUser);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset OTP
 *     description: Sends a 6-digit OTP to the registered user's email address.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset OTP sent successfully
 *       400:
 *         description: Email is required
 *       404:
 *         description: No account found with this email
 *       500:
 *         description: Failed to send password reset OTP
 */

// Forgot Password API
// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);
/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     description: Verifies the OTP sent to the user's registered email.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP received by email
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

// Verify OTP API
// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOTP);
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Updates the user's password after OTP verification.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid request or password
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

// Reset Password API
// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     description: Returns the user associated with the JWT token.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched successfully
 *       401:
 *         description: Missing, invalid, or expired token
 *       500:
 *         description: Server error
 */

// Get current logged-in user
// GET /api/auth/me

router.get("/me", protect, getCurrentUser);
/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update logged-in user's profile
 *     description: Updates only the name and phone number of the currently logged-in user. Email and role cannot be changed.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Kiran Mankani
 *               phone:
 *                 type: string
 *                 example: "03001234567"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 64abc123456789
 *                     name:
 *                       type: string
 *                       example: Kiran Mankani
 *                     email:
 *                       type: string
 *                       example: kiran@gmail.com
 *                     phone:
 *                       type: string
 *                       example: "03001234567"
 *                     role:
 *                       type: string
 *                       example: candidate
 *       401:
 *         description: Missing, invalid, or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error while updating profile
 */

// Update logged-in user's profile
// PUT /api/auth/profile
router.put("/profile", protect, updateProfile);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend password reset OTP
 *     description: Sends a new 6-digit OTP to the user's registered email.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: candidate999@gmail.com
 *     responses:
 *       200:
 *         description: New OTP sent successfully
 *       400:
 *         description: Email is required
 *       404:
 *         description: No account found with this email
 *       500:
 *         description: Failed to resend OTP
 */
router.post("/resend-otp", resendOTP);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     description: Logs out the current user.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       500:
 *         description: Server error during logout
 */
router.post("/logout", logoutUser);

module.exports = router;