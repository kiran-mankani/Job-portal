const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const uploadCVMiddleware = require("../middleware/uploadMiddleware");
const {
  applyForJob,
   uploadCV,
     getMyApplications,
      getApplicationDetails,
      getRecruiterApplications,
      updateApplicationStatus,
      withdrawApplication,
} = require("../controllers/applicationController");

/**
 * @swagger
 * /api/applications/{jobId}/apply:
 *   post:
 *     summary: Candidate Apply for Job
 *     description: Allows a candidate to apply for a specific job.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coverLetter:
 *                 type: string
 *                 example: I am interested in this position.
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Already applied for this job
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only candidates can apply
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

router.post(
  "/:jobId/apply",
  protect,
  authorizeRoles("candidate"),
  applyForJob
);

/**
 * @swagger
 * /api/applications/{applicationId}/cv:
 *   post:
 *     summary: Upload CV
 *     description: Allows a candidate to upload a CV for their job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cv
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: CV file in PDF, DOC, or DOCX format
 *     responses:
 *       200:
 *         description: CV uploaded successfully
 *       400:
 *         description: CV file is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only upload CV for your own application
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:applicationId/cv",
  protect,
  authorizeRoles("candidate"),
  uploadCVMiddleware.single("cv"),
  uploadCV
);
/**
 * @swagger
 * /api/applications/my-applications:
 *   get:
 *     summary: Candidate View Applications
 *     description: Returns all applications submitted by the currently logged-in candidate.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Applications fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only candidates can view their applications
 *       500:
 *         description: Server error
 */
router.get(
  "/my-applications",
  protect,
  authorizeRoles("candidate"),
  getMyApplications
);
/**
 * @swagger
 * /api/applications/{applicationId}:
 *   get:
 *     summary: Candidate View Application Details
 *     description: Returns the details of a specific application belonging to the logged-in candidate.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *         example: 68b123456789abcdef123456
 *     responses:
 *       200:
 *         description: Application details fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only view your own application
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:applicationId",
  protect,
  authorizeRoles("candidate"),
  getApplicationDetails
);
/**
 * @swagger
 * /api/applications/recruiter:
 *   get:
 *     summary: Recruiter View Applications
 *     description: Returns all applications submitted for jobs posted by the logged-in recruiter.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter applications fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only recruiters can view applications
 *       500:
 *         description: Server error
 */
router.get(
  "/recruiter",
  protect,
  authorizeRoles("recruiter"),
  getRecruiterApplications
);
/**
 * @swagger
 * /api/applications/{applicationId}/status:
 *   put:
 *     summary: Recruiter Update Application Status
 *     description: Allows a recruiter to update the status of an application for their own job.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - pending
 *                   - reviewing
 *                   - shortlisted
 *                   - rejected
 *                   - hired
 *                 example: shortlisted
 *     responses:
 *       200:
 *         description: Application status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only update applications for your own jobs
 *       404:
 *         description: Application or job not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:applicationId/status",
  protect,
  authorizeRoles("recruiter"),
  updateApplicationStatus
);
/**
 * @swagger
 * /api/applications/{applicationId}/withdraw:
 *   put:
 *     summary: Withdraw Application
 *     description: Allows a candidate to withdraw their own job application.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *         example: 68b123456789abcdef123456
 *     responses:
 *       200:
 *         description: Application withdrawn successfully
 *       400:
 *         description: Application cannot be withdrawn
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only withdraw your own application
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:applicationId/withdraw",
  protect,
  authorizeRoles("candidate"),
  withdrawApplication
);

module.exports = router;
