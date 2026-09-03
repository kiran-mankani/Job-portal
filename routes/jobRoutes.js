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

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job management APIs
 */

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Post a new job
 *     description: Allows an authenticated recruiter to post a new job.
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
 *                 example: Frontend Developer
 *               company:
 *                 type: string
 *                 example: ABC Technologies
 *               location:
 *                 type: string
 *                 example: Karachi
 *               description:
 *                 type: string
 *                 example: We are looking for a frontend developer.
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - React
 *                   - CSS
 *                   - Git
 *               salary:
 *                 type: string
 *                 example: PKR 100,000 - 150,000
 *               jobType:
 *                 type: string
 *                 enum:
 *                   - full-time
 *                   - part-time
 *                   - internship
 *                   - contract
 *                 example: full-time
 *     responses:
 *       201:
 *         description: Job posted successfully
 *       400:
 *         description: Required fields are missing
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

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all active jobs
 *     description: Returns all active jobs.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by job title or company
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter jobs by location
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum:
 *             - full-time
 *             - part-time
 *             - internship
 *             - contract
 *         description: Filter jobs by job type
 *     responses:
 *       200:
 *         description: Jobs fetched successfully
 *       500:
 *         description: Server error
 */
router.get("/", getAllJobs);

/**
 * @swagger
 * /api/jobs/search:
 *   get:
 *     summary: Search Jobs
 *     description: Search jobs by title, description, or location.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         example: developer
 *     responses:
 *       200:
 *         description: Jobs searched successfully
 *       400:
 *         description: Search keyword is required
 *       500:
 *         description: Server error
 */
router.get("/search", searchJobs);

/**
 * @swagger
 * /api/jobs/filter:
 *   get:
 *     summary: Filter Jobs
 *     description: Filter jobs using location, job type, category, experience level, and salary.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: location
 *         required: false
 *         schema:
 *           type: string
 *         example: Karachi
 *
 *       - in: query
 *         name: jobType
 *         required: false
 *         schema:
 *           type: string
 *         example: full-time
 *
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         example: Software
 *
 *       - in: query
 *         name: experienceLevel
 *         required: false
 *         schema:
 *           type: string
 *         example: Mid-level
 *
 *       - in: query
 *         name: minSalary
 *         required: false
 *         schema:
 *           type: number
 *         example: 50000
 *
 *       - in: query
 *         name: maxSalary
 *         required: false
 *         schema:
 *           type: number
 *         example: 150000
 *     responses:
 *       200:
 *         description: Jobs filtered successfully
 *       500:
 *         description: Server error
 */
router.get("/filter", filterJobs);

/**
 * @swagger
 * /api/jobs/my-jobs:
 *   get:
 *     summary: Recruiter Get Own Jobs
 *     description: Get all jobs posted by the currently logged-in recruiter.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter's jobs fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/my-jobs",
  protect,
  authorizeRoles("recruiter"),
  getRecruiterOwnJobs
);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get Single Job
 *     description: Get a single job by its ID.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 6a98232bd2d6c7f347c9d538
 *     responses:
 *       200:
 *         description: Job fetched successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getSingleJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update Job
 *     description: Allows a recruiter to update their own job.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Senior MERN Stack Developer
 *               description:
 *                 type: string
 *                 example: We are looking for a senior MERN developer.
 *               company:
 *                 type: string
 *                 example: ABC Technologies
 *               location:
 *                 type: string
 *                 example: Karachi
 *               salary:
 *                 type: string
 *                 example: 150000 - 200000 PKR
 *               jobType:
 *                 type: string
 *                 enum:
 *                   - full-time
 *                   - part-time
 *                   - contract
 *                   - internship
 *                   - remote
 *                 example: full-time
 *               experience:
 *                 type: string
 *                 example: 3-5 years
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - React
 *                   - Node.js
 *                   - MongoDB
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - closed
 *                 example: active
 *     responses:
 *       200:
 *         description: Job updated successfully
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

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete Job
 *     description: Allows a recruiter to delete their own job.
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
 *         description: Server error while deleting job
 */
router.delete(
  "/:id",
  protect,
  authorizeRoles("recruiter"),
  deleteJob
);

module.exports = router;