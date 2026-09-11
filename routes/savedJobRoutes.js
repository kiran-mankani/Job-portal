const express = require("express");

const {
  getSavedJobs,
  checkSavedJob,
} = require("../controllers/savedJobController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// GET SAVED JOBS
// GET /api/jobs/saved
// ======================================================

router.get(
  "/saved",
  protect,
  authorizeRoles("candidate"),
  getSavedJobs
);

// ======================================================
// CHECK SAVED JOB
// GET /api/jobs/:id/saved
// ======================================================

router.get(
  "/:id/saved",
  protect,
  authorizeRoles("candidate"),
  checkSavedJob
);

module.exports = router;