
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const uploadResumeMiddleware = require("../middleware/uploadMiddleware");

const {
  applyForJob,
  uploadResume,
  getMyApplications,
  getApplicationDetails,
  getRecruiterApplications,
  updateApplicationStatus,
  withdrawApplication,
} = require("../controllers/applicationController");

// =====================================================
// RECRUITER APPLICATIONS
// IMPORTANT:
// This must come before /:applicationId
// =====================================================

/**
 * @swagger
 * /api/applications/recruiter:
 *   get:
 *     summary: Get recruiter applications
 *     description: Returns applications submitted for jobs owned by the logged-in recruiter.
 *     tags:
 *       - Applications
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
 *             - pending
 *             - reviewing
 *             - shortlisted
 *             - rejected
 *             - hired
 *             - withdrawn
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filter by one of the recruiter's own job IDs.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search candidate name/email/phone or job title/company/location.
 *     responses:
 *       200:
 *         description: Recruiter applications fetched successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only recruiters can view recruiter applications
 *       500:
 *         description: Server error
 */

router.get(
  "/recruiter",
  protect,
  authorizeRoles("recruiter"),
  getRecruiterApplications
);

// =====================================================
// CANDIDATE APPLICATIONS
// =====================================================

/**
 * @swagger
 * /api/applications/my-applications:
 *   get:
 *     summary: Get candidate applications
 *     description: Returns applications submitted by the currently logged-in candidate.
 *     tags:
 *       - Applications
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
 *             - pending
 *             - reviewing
 *             - shortlisted
 *             - rejected
 *             - hired
 *             - withdrawn
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by job title, company, or location.
 *     responses:
 *       200:
 *         description: Applications fetched successfully
 *       400:
 *         description: Invalid query parameters
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

// =====================================================
// APPLY FOR JOB
// =====================================================

/**
 * @swagger
 * /api/applications/{jobId}/apply:
 *   post:
 *     summary: Apply for a job
 *     description: Allows an authenticated candidate to submit an application for an active job.
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
 *                 example: I am interested in this position and believe my skills match the role.
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Invalid job ID or job is not accepting applications
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only candidates can apply
 *       404:
 *         description: Job not found
 *       409:
 *         description: Candidate has already applied for this job
 *       500:
 *         description: Server error
 */

router.post(
  "/:jobId/apply",
  protect,
  authorizeRoles("candidate"),
  applyForJob
);

// =====================================================
// UPLOAD RESUME
// =====================================================

/**
 * @swagger
 * /api/applications/{applicationId}/resume:
 *   post:
 *     summary: Upload resume for an application
 *     description: Allows a candidate to upload a PDF, DOC, or DOCX resume to their own application.
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
 *               - resume
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume file in PDF, DOC, or DOCX format.
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 *       400:
 *         description: Resume file is missing or invalid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only candidates can upload resumes for their own application
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */

router.post(
  "/:applicationId/resume",
  protect,
  authorizeRoles("candidate"),
  uploadResumeMiddleware.single("resume"),
  uploadResume
);

// =====================================================
// UPDATE APPLICATION STATUS
// =====================================================

/**
 * @swagger
 * /api/applications/{applicationId}/status:
 *   put:
 *     summary: Update application status
 *     description: Allows a recruiter to update the status of an application belonging to one of their jobs.
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
 *         description: Invalid status or application transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the owning recruiter can update the application
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

// =====================================================
// WITHDRAW APPLICATION
// =====================================================

/**
 * @swagger
 * /api/applications/{applicationId}/withdraw:
 *   put:
 *     summary: Withdraw application
 *     description: Allows a candidate to withdraw their own application unless it has already been hired.
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
 *     responses:
 *       200:
 *         description: Application withdrawn successfully
 *       400:
 *         description: Application cannot be withdrawn
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the owner candidate can withdraw the application
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

// =====================================================
// APPLICATION DETAILS
// IMPORTANT:
// Keep this generic route LAST.
// Candidate can see own application.
// Recruiter can see applications for own jobs.
// Admin can also access details when using this controller.
// =====================================================

/**
 * @swagger
 * /api/applications/{applicationId}:
 *   get:
 *     summary: Get application details
 *     description: Returns application details. Candidates can view their own applications, while recruiters can view applications submitted to their own jobs.
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
 *     responses:
 *       200:
 *         description: Application details fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User does not have permission to view this application
 *       404:
 *         description: Application not found
 *       500:
 *         description: Server error
 */

router.get(
  "/:applicationId",
  protect,
  authorizeRoles(
    "candidate",
    "recruiter",
    "admin"
  ),
  getApplicationDetails
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;

