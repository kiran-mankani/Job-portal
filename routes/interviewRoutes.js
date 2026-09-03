const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  scheduleInterview,
  getCandidateInterviews,
  getRecruiterInterviews,
  updateInterview,
  cancelInterview,
} = require("../controllers/interviewController");

const router = express.Router();

// ==========================================
// 25. RECRUITER SCHEDULE INTERVIEW
// POST /api/interviews
// ==========================================

/**
 * @swagger
 * /api/interviews:
 *   post:
 *     summary: Recruiter Schedule Interview
 *     description: Allows a recruiter to schedule an interview for a candidate.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *               - candidateId
 *               - date
 *               - mode
 *             properties:
 *               applicationId:
 *                 type: string
 *                 example: 68b123456789abcdef123456
 *               candidateId:
 *                 type: string
 *                 example: 68b123456789abcdef123456
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-05T10:00:00.000Z
 *               duration:
 *                 type: number
 *                 example: 30
 *               mode:
 *                 type: string
 *                 enum:
 *                   - online
 *                   - offline
 *                 example: online
 *               meetingLink:
 *                 type: string
 *                 example: https://meet.google.com/abc-defg-hij
 *               location:
 *                 type: string
 *                 example: Karachi Office
 *               notes:
 *                 type: string
 *                 example: Technical interview
 *     responses:
 *       201:
 *         description: Interview scheduled successfully
 *       400:
 *         description: Required fields are missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only recruiters can schedule interviews
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  protect,
  authorizeRoles("recruiter"),
  scheduleInterview
);

// ==========================================
// 26. CANDIDATE VIEW INTERVIEWS
// GET /api/interviews/my-interviews
// ==========================================

/**
 * @swagger
 * /api/interviews/my-interviews:
 *   get:
 *     summary: Candidate View Interviews
 *     description: Returns all interviews scheduled for the logged-in candidate.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Candidate interviews fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only candidates can view interviews
 *       500:
 *         description: Server error
 */

router.get(
  "/my-interviews",
  protect,
  authorizeRoles("candidate"),
  getCandidateInterviews
);

// ==========================================
// 27. RECRUITER VIEW INTERVIEWS
// GET /api/interviews/recruiter-interviews
// ==========================================

/**
 * @swagger
 * /api/interviews/recruiter-interviews:
 *   get:
 *     summary: Recruiter View Interviews
 *     description: Returns all interviews scheduled by the currently logged-in recruiter.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter interviews fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only recruiters can view their interviews
 *       500:
 *         description: Server error
 */

router.get(
  "/recruiter-interviews",
  protect,
  authorizeRoles("recruiter"),
  getRecruiterInterviews
);

// ==========================================
// 28. UPDATE / RESCHEDULE INTERVIEW
// PUT /api/interviews/:id
// ==========================================

/**
 * @swagger
 * /api/interviews/{id}:
 *   put:
 *     summary: Update or reschedule an interview
 *     description: Update interview date, duration, meeting link, notes, or status.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Interview MongoDB ID
 *         schema:
 *           type: string
 *           example: "68b5c123456789abcdef1234"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-05T15:00:00.000Z"
 *               duration:
 *                 type: number
 *                 example: 60
 *               meetingLink:
 *                 type: string
 *                 example: "https://meet.google.com/abc-defg-hij"
 *               notes:
 *                 type: string
 *                 example: "Interview rescheduled to Saturday"
 *               status:
 *                 type: string
 *                 enum:
 *                   - scheduled
 *                   - completed
 *                   - cancelled
 *                 example: scheduled
 *     responses:
 *       200:
 *         description: Interview updated/rescheduled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You are not authorized to update this interview
 *       404:
 *         description: Interview not found
 *       500:
 *         description: Server error
 */

router.put(
  "/:id",
  protect,
  authorizeRoles("recruiter"),
  updateInterview
);

// ==========================================
// 29. CANCEL INTERVIEW
// PATCH /api/interviews/:id/cancel
// ==========================================

/**
 * @swagger
 * /api/interviews/{id}/cancel:
 *   patch:
 *     summary: Cancel an interview
 *     description: Cancel a scheduled interview.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Interview MongoDB ID
 *         schema:
 *           type: string
 *           example: "68b5c123456789abcdef1234"
 *     responses:
 *       200:
 *         description: Interview cancelled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You are not authorized to cancel this interview
 *       404:
 *         description: Interview not found
 *       500:
 *         description: Server error
 */

router.patch(
  "/:id/cancel",
  protect,
  authorizeRoles("recruiter"),
  cancelInterview
);

module.exports = router;