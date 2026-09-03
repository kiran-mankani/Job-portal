const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  sendApplicationNotification,
  sendInterviewNotification,
    sendPasswordResetNotification,
     sendOtpNotification,

} = require("../controllers/notificationController");

// ==========================================
// Application Email Notification
// ==========================================

/**
 * @swagger
 * /api/notifications/application-email:
 *   post:
 *     summary: Send application email
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 example: candidate@gmail.com
 *               candidateName:
 *                 type: string
 *                 example: Kiran
 *               jobTitle:
 *                 type: string
 *                 example: MERN Developer
 *               companyName:
 *                 type: string
 *                 example: ABC Technologies
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Email sending failed
 */

router.post(
  "/application-email",
  protect,
  sendApplicationNotification
);
// ==========================================
// Interview Email Notification
// ==========================================

/**
 * @swagger
 * /api/notifications/interview-email:
 *   post:
 *     summary: Send interview email notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - candidateName
 *               - jobTitle
 *               - interviewDate
 *               - interviewTime
 *               - interviewType
 *             properties:
 *               to:
 *                 type: string
 *                 example: candidate@gmail.com
 *               candidateName:
 *                 type: string
 *                 example: Kiran
 *               jobTitle:
 *                 type: string
 *                 example: MERN Developer
 *               interviewDate:
 *                 type: string
 *                 example: 2026-09-05
 *               interviewTime:
 *                 type: string
 *                 example: 10:30 AM
 *               interviewType:
 *                 type: string
 *                 example: Online
 *               interviewLink:
 *                 type: string
 *                 example: https://meet.google.com/abc-defg-hij
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Email sending failed
 */

router.post(
  "/interview-email",
  protect,
  sendInterviewNotification
);

// ==========================================
// Password Reset Email
// ==========================================

/**
 * @swagger
 * /api/notifications/password-reset-email:
 *   post:
 *     summary: Send password reset email
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - name
 *               - resetLink
 *             properties:
 *               to:
 *                 type: string
 *                 example: candidate@gmail.com
 *               name:
 *                 type: string
 *                 example: Kiran
 *               resetLink:
 *                 type: string
 *                 example: http://localhost:5173/reset-password/abc123
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Email sending failed
 */

router.post(
  "/password-reset-email",
  protect,
  sendPasswordResetNotification
);

// ==========================================
// 42. OTP Email
// ==========================================

router.post(
  "/otp-email",
  protect,
  sendOtpNotification
);

module.exports = router;