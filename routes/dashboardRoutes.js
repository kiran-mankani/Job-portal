const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getCandidateDashboard,
    getRecruiterDashboard,
  getAdminDashboard,
}
 = require("../controllers/dashboardController");

// ==========================================
// Candidate Dashboard
// GET /api/dashboard/candidate
// ==========================================

/**
 * @swagger
 * /api/dashboard/candidate:
 *   get:
 *     summary: Get Candidate Dashboard
 *     description: Get candidate profile, application statistics, recent applications and upcoming interviews.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Candidate dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Server error
 */
router.get("/candidate", protect, getCandidateDashboard);
/**
 * @swagger
 * /api/dashboard/recruiter:
 *   get:
 *     summary: Get Recruiter Dashboard
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recruiter not found
 *       500:
 *         description: Server error
 */
router.get("/recruiter", protect, getRecruiterDashboard);
/**
 * @swagger
 * /api/dashboard/admin:
 *   get:
 *     summary: Get Admin Dashboard
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get("/admin", protect, getAdminDashboard);



module.exports = router;