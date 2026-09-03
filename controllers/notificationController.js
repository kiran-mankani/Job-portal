const {
  sendApplicationEmail,
    sendInterviewEmail,
    sendPasswordResetEmail,
  sendOtpEmail,

} = require("../utils/emailService");

// ==========================================
// Application Email Notification
// POST /api/notifications/application-email
// ==========================================

/**
 * @swagger
 * /api/notifications/application-email:
 *   post:
 *     summary: Send application email notification
 *     description: Sends an email notification to a candidate after applying for a job
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
 *               - companyName
 *             properties:
 *               to:
 *                 type: string
 *                 example: candidate@gmail.com
 *               candidateName:
 *                 type: string
 *                 example: Kiran
 *               jobTitle:
 *                 type: string
 *                 example: MERN Stack Developer
 *               companyName:
 *                 type: string
 *                 example: ABC Technologies
 *     responses:
 *       200:
 *         description: Application email sent successfully
 *       400:
 *         description: Required fields are missing
 *       500:
 *         description: Failed to send application email
 */

const sendApplicationNotification = async (req, res) => {
  try {
    const {
      to,
      candidateName,
      jobTitle,
      companyName,
    } = req.body;

    if (
      !to ||
      !candidateName ||
      !jobTitle ||
      !companyName
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await sendApplicationEmail({
      to,
      candidateName,
      jobTitle,
      companyName,
    });

    res.status(200).json({
      success: true,
      message: "Application email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error(
      "Send Application Notification Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to send application email",
      error: error.message,
    });
  }
};
// ==========================================
// Interview Email Notification
// POST /api/notifications/interview-email
// ==========================================

/**
 * @swagger
 * /api/notifications/interview-email:
 *   post:
 *     summary: Send interview email notification
 *     description: Sends interview schedule details to a candidate
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
 *                 example: MERN Stack Developer
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
 *         description: Interview email sent successfully
 *       400:
 *         description: Required fields are missing
 *       500:
 *         description: Failed to send interview email
 */

const sendInterviewNotification = async (req, res) => {
  try {
    const {
      to,
      candidateName,
      jobTitle,
      interviewDate,
      interviewTime,
      interviewType,
      interviewLink,
    } = req.body;

    if (
      !to ||
      !candidateName ||
      !jobTitle ||
      !interviewDate ||
      !interviewTime ||
      !interviewType
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required",
      });
    }

    const result = await sendInterviewEmail({
      to,
      candidateName,
      jobTitle,
      interviewDate,
      interviewTime,
      interviewType,
      interviewLink,
    });

    res.status(200).json({
      success: true,
      message: "Interview email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error(
      "Send Interview Notification Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to send interview email",
      error: error.message,
    });
  }
};

// ==========================================
// Password Reset Email Notification
// POST /api/notifications/password-reset-email
// ==========================================

/**
 * @swagger
 * /api/notifications/password-reset-email:
 *   post:
 *     summary: Send password reset email
 *     description: Sends a password reset link to the user's email
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
 *         description: Password reset email sent successfully
 *       400:
 *         description: Required fields are missing
 *       500:
 *         description: Failed to send password reset email
 */

const sendPasswordResetNotification = async (req, res) => {
  try {
    const {
      to,
      name,
      resetLink,
    } = req.body;

    if (!to || !name || !resetLink) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await sendPasswordResetEmail({
      to,
      name,
      resetLink,
    });

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error(
      "Send Password Reset Notification Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: error.message,
    });
  }
};

// ==========================================
// OTP Email Notification
// POST /api/notifications/otp-email
// ==========================================

/**
 * @swagger
 * /api/notifications/otp-email:
 *   post:
 *     summary: Send OTP email
 *     description: Sends an OTP verification code to the user's email
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
 *               - otp
 *             properties:
 *               to:
 *                 type: string
 *                 example: candidate@gmail.com
 *               name:
 *                 type: string
 *                 example: Kiran
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP email sent successfully
 *       400:
 *         description: Required fields are missing
 *       500:
 *         description: Failed to send OTP email
 */

const sendOtpNotification = async (req, res) => {
  try {
    const {
      to,
      name,
      otp,
    } = req.body;

    if (!to || !name || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await sendOtpEmail({
      to,
      name,
      otp,
    });

    res.status(200).json({
      success: true,
      message: "OTP email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error(
      "Send OTP Notification Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to send OTP email",
      error: error.message,
    });
  }
};
module.exports = {
  sendApplicationNotification,
  sendInterviewNotification,
  sendPasswordResetNotification,
    sendOtpNotification,
};