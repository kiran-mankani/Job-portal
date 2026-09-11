
const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getAllJobs,
  updateJob,
  getSingleJob,
  searchJobs,
  filterJobs,
  getRecruiterOwnJobs,
  createJob,
  deleteJob,
} = require("../controllers/jobController");

const {
  saveJob,
  unsaveJob,
  getSavedJobs,
  checkSavedJob,
} = require("../controllers/savedJobController");

const router = express.Router();

// ======================================================
// Swagger Tags
// ======================================================

/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job management and job discovery APIs
 */

// ======================================================
// CREATE JOB
// POST /api/jobs
// ======================================================

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Post a new job
 *     description: Create a new job posting. Only authenticated recruiters can create jobs.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - company
 *               - location
 *               - description
 *               - skills
 *               - jobType
 *             properties:
 *               title:
 *                 type: string
 *                 example: Senior React Developer
 *               company:
 *                 type: string
 *                 example: ABC Technologies
 *               location:
 *                 type: string
 *                 example: Karachi
 *               description:
 *                 type: string
 *                 example: We are looking for a skilled React developer to join our team.
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - React
 *                   - JavaScript
 *                   - Node.js
 *                   - MongoDB
 *               salary:
 *                 type: string
 *                 example: PKR 150000 - 250000
 *               minSalary:
 *                 type: number
 *                 example: 150000
 *               maxSalary:
 *                 type: number
 *                 example: 250000
 *               jobType:
 *                 type: string
 *                 enum:
 *                   - full-time
 *                   - part-time
 *                   - internship
 *                   - contract
 *                   - freelance
 *                 example: full-time
 *               category:
 *                 type: string
 *                 example: Software Development
 *               experienceLevel:
 *                 type: string
 *                 enum:
 *                   - Entry Level
 *                   - Mid Level
 *                   - Senior Level
 *                   - Lead
 *                 example: Mid Level
 *     responses:
 *       201:
 *         description: Job posted successfully
 *       400:
 *         description: Required fields are missing or invalid
 *       401:
 *         description: Missing, invalid, or expired token
 *       403:
 *         description: Only recruiters can post jobs
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  protect,
  authorizeRoles("recruiter"),
  createJob
);

// ======================================================
// GET ALL ACTIVE JOBS
// GET /api/jobs
// ======================================================

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get active jobs
 *     description: Returns paginated active job postings with optional search and filters.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title, company, description, location, or skills
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum:
 *             - full-time
 *             - part-time
 *             - internship
 *             - contract
 *             - freelance
 *         description: Filter by job type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by job category
 *       - in: query
 *         name: experienceLevel
 *         schema:
 *           type: string
 *         description: Filter by experience level
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of jobs per page
 *     responses:
 *       200:
 *         description: Jobs fetched successfully
 *       500:
 *         description: Server error
 */

router.get(
  "/",
  getAllJobs
);

// ======================================================
// SEARCH JOBS
// GET /api/jobs/search
// ======================================================

/**
 * @swagger
 * /api/jobs/search:
 *   get:
 *     summary: Search active jobs
 *     description: Search active jobs by keyword across title, company, description, location, and skills.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         example: developer
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         example: Karachi
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum:
 *             - full-time
 *             - part-time
 *             - internship
 *             - contract
 *             - freelance
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Jobs searched successfully
 *       400:
 *         description: Search keyword is required
 *       500:
 *         description: Server error
 */

router.get(
  "/search",
  searchJobs
);

// ======================================================
// FILTER JOBS
// GET /api/jobs/filter
// ======================================================

/**
 * @swagger
 * /api/jobs/filter:
 *   get:
 *     summary: Filter active jobs
 *     description: Filter active jobs using location, job type, category, experience level, and salary range.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         example: Karachi
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum:
 *             - full-time
 *             - part-time
 *             - internship
 *             - contract
 *             - freelance
 *         example: full-time
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         example: Software Development
 *       - in: query
 *         name: experienceLevel
 *         schema:
 *           type: string
 *         example: Mid Level
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 50000
 *       - in: query
 *         name: maxSalary
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 150000
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Jobs filtered successfully
 *       500:
 *         description: Server error
 */

router.get(
  "/filter",
  filterJobs
);

// ======================================================
// RECRUITER OWN JOBS
// GET /api/jobs/my-jobs
// ======================================================

/**
 * @swagger
 * /api/jobs/my-jobs:
 *   get:
 *     summary: Get recruiter jobs
 *     description: Returns jobs posted by the currently authenticated recruiter.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter jobs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Recruiter role required
 *       500:
 *         description: Server error
 */

router.get(
  "/my-jobs",
  protect,
  authorizeRoles("recruiter"),
  getRecruiterOwnJobs
);

// ======================================================
// GET SAVED JOBS
// GET /api/jobs/saved
//
// IMPORTANT:
// This route MUST come before GET /:id.
// Otherwise "saved" can be treated as a job ID.
// ======================================================

/**
 * @swagger
 * /api/jobs/saved:
 *   get:
 *     summary: Get saved jobs
 *     description: Get all jobs saved by the authenticated candidate.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved jobs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Candidate role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.get(
  "/saved",
  protect,
  authorizeRoles("candidate"),
  getSavedJobs
);

// ======================================================
// SAVE JOB
// POST /api/jobs/:id/save
// ======================================================

/**
 * @swagger
 * /api/jobs/{id}/save:
 *   post:
 *     summary: Save a job
 *     description: Save a job to the authenticated candidate's saved jobs.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job saved successfully
 *       400:
 *         description: Job already saved or inactive
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Candidate role required
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

router.post(
  "/:id/save",
  protect,
  authorizeRoles("candidate"),
  saveJob
);

// ======================================================
// REMOVE SAVED JOB
// DELETE /api/jobs/:id/save
// ======================================================

/**
 * @swagger
 * /api/jobs/{id}/save:
 *   delete:
 *     summary: Remove saved job
 *     description: Remove a job from the authenticated candidate's saved jobs.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job removed from saved jobs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Candidate role required
 *       500:
 *         description: Server error
 */

router.delete(
  "/:id/save",
  protect,
  authorizeRoles("candidate"),
  unsaveJob
);

// ======================================================
// CHECK SAVED JOB
// GET /api/jobs/:id/saved
// ======================================================

/**
 * @swagger
 * /api/jobs/{id}/saved:
 *   get:
 *     summary: Check whether a job is saved
 *     description: Check if the authenticated candidate has saved a specific job.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Saved status returned successfully
 *       400:
 *         description: Invalid job ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Candidate role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.get(
  "/:id/saved",
  protect,
  authorizeRoles("candidate"),
  checkSavedJob
);

// ======================================================
// SINGLE JOB
// GET /api/jobs/:id
// ======================================================

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a single job
 *     description: Get one job by its ID.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job fetched successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

router.get(
  "/:id",
  getSingleJob
);

// ======================================================
// UPDATE JOB
// PUT /api/jobs/:id
// ======================================================

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update recruiter job
 *     description: Update a job owned by the currently authenticated recruiter.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       400:
 *         description: Invalid job data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only update your own jobs
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

router.put(
  "/:id",
  protect,
  authorizeRoles("recruiter"),
  updateJob
);

// ======================================================
// DELETE JOB
// DELETE /api/jobs/:id
// ======================================================

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete recruiter job
 *     description: Delete a job owned by the authenticated recruiter.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only delete your own jobs
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

router.delete(
  "/:id",
  protect,
  authorizeRoles("recruiter"),
  deleteJob
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;

