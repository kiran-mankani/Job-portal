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

// =====================================================
// RECRUITER SCHEDULE INTERVIEW
// POST /api/interviews
// =====================================================

/**
 * @swagger
 * /api/interviews:
 *   post:
 *     summary: Schedule an interview
 *     description: Allows a recruiter to schedule an interview for a candidate's application.
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
 *                 example: 68b223456789abcdef123456
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-15T10:00:00.000Z
 *               duration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
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
 *         description: Invalid request, date, mode, or application state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only recruiters can schedule interviews
 *       404:
 *         description: Application, candidate, or job not found
 *       409:
 *         description: A scheduled interview already exists for this application
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  protect,
  authorizeRoles("recruiter"),
  scheduleInterview
);

// =====================================================
// CANDIDATE VIEW INTERVIEWS
// GET /api/interviews/my-interviews
// =====================================================

/**
 * @swagger
 * /api/interviews/my-interviews:
 *   get:
 *     summary: Get candidate interviews
 *     description: Returns interviews scheduled for the authenticated candidate.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - scheduled
 *             - completed
 *             - cancelled
 *     responses:
 *       200:
 *         description: Candidate interviews fetched successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only candidates can view their interviews
 *       500:
 *         description: Server error
 */

router.get(
  "/my-interviews",
  protect,
  authorizeRoles("candidate"),
  getCandidateInterviews
);

// =====================================================
// RECRUITER VIEW INTERVIEWS
// GET /api/interviews/recruiter-interviews
// =====================================================

/**
 * @swagger
 * /api/interviews/recruiter-interviews:
 *   get:
 *     summary: Get recruiter interviews
 *     description: Returns interviews scheduled by the authenticated recruiter.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - scheduled
 *             - completed
 *             - cancelled
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum:
 *             - online
 *             - offline
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search candidate or related job information.
 *     responses:
 *       200:
 *         description: Recruiter interviews fetched successfully
 *       400:
 *         description: Invalid query parameters
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

// =====================================================
// UPDATE / RESCHEDULE INTERVIEW
// PUT /api/interviews/:id
// =====================================================

/**
 * @swagger
 * /api/interviews/{id}:
 *   put:
 *     summary: Update or reschedule an interview
 *     description: Allows the owning recruiter to update date, duration, mode, meeting details, notes, or status.
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
 *           example: 68b5c123456789abcdef1234
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-20T15:00:00.000Z
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: Backward-compatible alias for date.
 *                 example: 2026-09-20T15:00:00.000Z
 *               duration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *                 example: 60
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
 *                 example: Lahore Office
 *               notes:
 *                 type: string
 *                 example: Interview rescheduled to Saturday
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
 *       400:
 *         description: Invalid interview data or invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the owning recruiter can update this interview
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

// =====================================================
// CANCEL INTERVIEW
// PATCH /api/interviews/:id/cancel
// =====================================================

/**
 * @swagger
 * /api/interviews/{id}/cancel:
 *   patch:
 *     summary: Cancel an interview
 *     description: Allows the owning recruiter to cancel a scheduled interview.
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
 *           example: 68b5c123456789abcdef1234
 *     responses:
 *       200:
 *         description: Interview cancelled successfully
 *       400:
 *         description: Interview is already cancelled or completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the owning recruiter can cancel this interview
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

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;