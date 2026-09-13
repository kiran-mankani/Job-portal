const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getCandidateDashboard,
  getRecruiterDashboard,
  getAdminDashboard,
} = require("../controllers/dashboardController");

// ==========================================
// Candidate Dashboard
// GET /api/dashboard/candidate
// ==========================================
router.get(
  "/candidate",
  protect,
  authorizeRoles("candidate"),
  getCandidateDashboard
);

// ==========================================
// Recruiter Dashboard
// GET /api/dashboard/recruiter
// ==========================================
router.get(
  "/recruiter",
  protect,
  authorizeRoles("recruiter"),
  getRecruiterDashboard
);

// ==========================================
// Admin Dashboard
// GET /api/dashboard/admin
// ==========================================
router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  getAdminDashboard
);

module.exports = router;