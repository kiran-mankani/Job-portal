const mongoose = require("mongoose");

const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

const { createNotification } = require("./notificationController");

// ==========================================
// HELPERS
// ==========================================

const isValidObjectId = (id) => {
  return Boolean(
    id && mongoose.Types.ObjectId.isValid(id)
  );
};

const getUserId = (user) => {
  if (!user) {
    return null;
  }

  if (user._id) {
    return user._id.toString();
  }

  if (user.id) {
    return user.id.toString();
  }

  return null;
};

const escapeRegex = (value) => {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const parsePage = (value) => {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
};

const parseLimit = (value) => {
  const limit = Number(value);

  if (!Number.isFinite(limit) || limit < 1) {
    return 10;
  }

  return Math.min(Math.floor(limit), 100);
};

const buildPagination = (page, limit, total) => {
  const pages =
    total > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    pages,
    hasNextPage:
      pages > 0 && page < pages,
    hasPrevPage:
      page > 1 && pages > 0,
  };
};

// ==========================================
// APPLICATION POPULATION
// ==========================================
//
// User resume is stored inside:
// user.profile.resume
//
// Recruiter company is now stored separately:
// user.companyId -> Company._id
// ==========================================

const applicationPopulate = [
  {
    path: "job",
    populate: {
      path: "recruiter",
      select:
        "name email phone profileImage companyId",
      populate: {
        path: "companyId",
        select:
          "name description location website logo",
      },
    },
  },
  {
    path: "candidate",
    select:
      "name email phone profileImage bio location headline skills education experience profile",
  },
];

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toLowerCase();
};

const allowedApplicationStatuses = [
  "pending",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
  "withdrawn",
];

const recruiterUpdateStatuses = [
  "pending",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
];

const safeCreateNotification = async (payload) => {
  try {
    await createNotification(payload);
  } catch (error) {
    console.error(
      "Create Application Notification Error:",
      error
    );
  }
};

// ==========================================
// APPLY FOR JOB
// POST /api/applications/:jobId/apply
// ==========================================

const applyForJob = async (req, res) => {
  try {
    // ------------------------------------------
    // Candidate-only action
    // ------------------------------------------

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can apply for jobs",
      });
    }

    const { jobId } = req.params;
    const { coverLetter = "" } = req.body || {};
    const candidateId = getUserId(req.user);

    // ------------------------------------------
    // Validate IDs
    // ------------------------------------------

    if (
      !jobId ||
      !isValidObjectId(jobId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated candidate is required",
      });
    }

    // ------------------------------------------
    // Check job
    // ------------------------------------------

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "This job is no longer accepting applications",
      });
    }

    // ------------------------------------------
    // Check duplicate application
    // ------------------------------------------

    const existingApplication =
      await Application.findOne({
        job: jobId,
        candidate: candidateId,
      });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message:
          "You have already applied for this job",
        application: existingApplication,
      });
    }

    // ------------------------------------------
    // Cover letter validation
    // ------------------------------------------

    let normalizedCoverLetter = "";

    if (
      coverLetter !== undefined &&
      coverLetter !== null
    ) {
      if (typeof coverLetter !== "string") {
        return res.status(400).json({
          success: false,
          message:
            "Cover letter must be a string",
        });
      }

      normalizedCoverLetter =
        coverLetter.trim();

      if (
        normalizedCoverLetter.length > 5000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cover letter cannot exceed 5000 characters",
        });
      }
    }

    // ------------------------------------------
    // Create application
    // ------------------------------------------

    const application =
      await Application.create({
        job: jobId,
        candidate: candidateId,
        coverLetter: normalizedCoverLetter,
        status: "pending",
      });

    // ------------------------------------------
    // Candidate notification
    // ------------------------------------------

    await safeCreateNotification({
      userId: candidateId,
      type: "application",
      title: "Application Submitted",
      message: `Your application for "${job.title}" at ${
        job.company || "the company"
      } has been submitted successfully.`,
      relatedId: application._id,
      relatedType: "Application",
    });

    // ------------------------------------------
    // Populate response
    // ------------------------------------------

    const populatedApplication =
      await Application.findById(
        application._id
      ).populate(applicationPopulate);

    return res.status(201).json({
      success: true,
      message:
        "Job application submitted successfully",
      application: populatedApplication,
    });
  } catch (error) {
    console.error(
      "Apply For Job Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You have already applied for this job",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors || {})
            .map((item) => item.message)
            .join(", ") ||
          "Application validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while applying for job",
    });
  }
};

// ==========================================
// UPLOAD RESUME
// POST /api/applications/:applicationId/resume
// ==========================================

const uploadResume = async (req, res) => {
  try {
    // ------------------------------------------
    // Candidate-only action
    // ------------------------------------------

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can upload resumes",
      });
    }

    const { applicationId } = req.params;

    if (
      !applicationId ||
      !isValidObjectId(applicationId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid application ID",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message:
          "Uploaded resume file could not be processed",
      });
    }

    // ------------------------------------------
    // Find application
    // ------------------------------------------

    const application =
      await Application.findById(
        applicationId
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // ------------------------------------------
    // Ownership check
    // ------------------------------------------

    if (
      !application.candidate ||
      application.candidate.toString() !==
        getUserId(req.user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only upload a resume for your own application",
      });
    }

    // ------------------------------------------
    // Related job
    // ------------------------------------------

    const job = await Job.findById(
      application.job
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Related job not found",
      });
    }

    // ------------------------------------------
    // Cloudinary upload
    // ------------------------------------------

    const streamUpload = () => {
      return new Promise(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                resource_type: "raw",
                folder: "job-portal/resumes",
                public_id: `${applicationId}-${Date.now()}`,
                use_filename: false,
                overwrite: false,
              },
              (error, result) => {
                if (error) {
                  return reject(error);
                }

                return resolve(result);
              }
            );

          stream.end(req.file.buffer);
        }
      );
    };

    const result =
      await streamUpload();

    if (
      !result ||
      !result.secure_url
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Resume upload failed",
      });
    }

    // ------------------------------------------
    // Save Resume URL
    // ------------------------------------------

    application.resume =
      result.secure_url;

    await application.save();

    // ------------------------------------------
    // Return updated application
    // ------------------------------------------

    const updatedApplication =
      await Application.findById(
        application._id
      ).populate(applicationPopulate);

    return res.status(200).json({
      success: true,
      message:
        "Resume uploaded successfully",
      resume: result.secure_url,
      application: updatedApplication,
    });
  } catch (error) {
    console.error(
      "Upload Resume Error:",
      error
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors || {})
            .map((item) => item.message)
            .join(", ") ||
          "Application validation failed",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}`,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while uploading resume",
    });
  }
};

// ==========================================
// GET MY APPLICATIONS
// GET /api/applications/my-applications
// ==========================================

const getMyApplications = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // Candidate-only action
    // ------------------------------------------

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can view their applications",
      });
    }

    const candidateId =
      getUserId(req.user);

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated candidate is required",
      });
    }

    const page = parsePage(
      req.query.page
    );

    const limit = parseLimit(
      req.query.limit
    );

    const {
      status = "",
      search = "",
    } = req.query;

    const filter = {
      candidate: candidateId,
    };

    // ------------------------------------------
    // Status filter
    // ------------------------------------------

    if (status) {
      const normalizedStatus =
        normalizeStatus(status);

      if (
        !allowedApplicationStatuses.includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid application status",
        });
      }

      filter.status =
        normalizedStatus;
    }

    // ------------------------------------------
    // Search filter
    // ------------------------------------------

    const cleanSearch =
      String(search || "").trim();

    if (cleanSearch) {
      const searchRegex =
        new RegExp(
          escapeRegex(cleanSearch),
          "i"
        );

      const matchingJobs =
        await Job.find({
          $or: [
            { title: searchRegex },
            { company: searchRegex },
            { location: searchRegex },
          ],
        }).select("_id");

      const matchingJobIds =
        matchingJobs.map(
          (job) => job._id
        );

      filter.job = {
        $in: matchingJobIds,
      };
    }

    // ------------------------------------------
    // Count
    // ------------------------------------------

    const total =
      await Application.countDocuments(
        filter
      );

    const skip =
      (page - 1) * limit;

    // ------------------------------------------
    // Fetch applications
    // ------------------------------------------

    const applications =
      await Application.find(filter)
        .populate(applicationPopulate)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
      success: true,
      message:
        "Applications fetched successfully",
      count: applications.length,
      total,
      applications,
      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
    });
  } catch (error) {
    console.error(
      "Get My Applications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching applications",
    });
  }
};

// ==========================================
// GET APPLICATION DETAILS
// GET /api/applications/:applicationId
// ==========================================

const getApplicationDetails = async (
  req,
  res
) => {
  try {
    const { applicationId } =
      req.params;

    if (
      !applicationId ||
      !isValidObjectId(applicationId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid application ID",
      });
    }

    const application =
      await Application.findById(
        applicationId
      ).populate(applicationPopulate);

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Application not found",
      });
    }

    const currentUserId =
      getUserId(req.user);

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    // ------------------------------------------
    // Candidate ownership
    // ------------------------------------------

    if (req.user.role === "candidate") {
      const candidateId =
        application.candidate?._id?.toString();

      if (
        !candidateId ||
        candidateId !== currentUserId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view your own application",
        });
      }
    }

    // ------------------------------------------
    // Recruiter ownership
    // ------------------------------------------

    else if (
      req.user.role === "recruiter"
    ) {
      const recruiterId =
        application.job?.recruiter?._id?.toString();

      if (
        !recruiterId ||
        recruiterId !== currentUserId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view applications for your own jobs",
        });
      }
    }

    // ------------------------------------------
    // Admin access
    // ------------------------------------------

    else if (
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this application",
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error(
      "Get Application Details Error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          `Invalid ${error.path}`,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching application details",
    });
  }
};

// ==========================================
// GET RECRUITER APPLICATIONS
// GET /api/applications/recruiter
// ==========================================

const getRecruiterApplications = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // Recruiter-only action
    // ------------------------------------------

    if (req.user?.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message:
          "Only recruiters can view recruiter applications",
      });
    }

    const recruiterId =
      getUserId(req.user);

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated recruiter is required",
      });
    }

    const page = parsePage(
      req.query.page
    );

    const limit = parseLimit(
      req.query.limit
    );

    const {
      status = "",
      jobId = "",
      search = "",
    } = req.query;

    // ------------------------------------------
    // Recruiter's jobs
    // ------------------------------------------

    const recruiterJobs =
      await Job.find({
        recruiter: recruiterId,
      }).select(
        "_id title company"
      );

    const recruiterJobIds =
      recruiterJobs.map(
        (job) => job._id
      );

    // ------------------------------------------
    // Base filter
    // ------------------------------------------

    const filter = {
      job: {
        $in: recruiterJobIds,
      },
    };

    // ------------------------------------------
    // Job filter
    // ------------------------------------------

    if (jobId) {
      if (
        !isValidObjectId(jobId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid job ID",
        });
      }

      const ownsJob =
        recruiterJobIds.some(
          (id) =>
            id.toString() ===
            String(jobId)
        );

      if (!ownsJob) {
        return res.status(403).json({
          success: false,
          message:
            "You can only filter applications for your own jobs",
        });
      }

      filter.job = jobId;
    }

    // ------------------------------------------
    // Status filter
    // ------------------------------------------

    if (status) {
      const normalizedStatus =
        normalizeStatus(status);

      if (
        !allowedApplicationStatuses.includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid application status",
        });
      }

      filter.status =
        normalizedStatus;
    }

    // ------------------------------------------
    // Search
    // ------------------------------------------

    const cleanSearch =
      String(search || "").trim();

    if (cleanSearch) {
      const searchRegex =
        new RegExp(
          escapeRegex(cleanSearch),
          "i"
        );

      const candidateIds =
        await User.find({
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ],
        }).select("_id");

      const matchingCandidateIds =
        candidateIds.map(
          (candidate) =>
            candidate._id
        );

      const matchingJobs =
        await Job.find({
          recruiter: recruiterId,
          $or: [
            { title: searchRegex },
            { company: searchRegex },
            { location: searchRegex },
          ],
        }).select("_id");

      const matchingJobIds =
        matchingJobs.map(
          (job) => job._id
        );

      // ------------------------------------------
      // If a specific job is selected,
      // search only candidate information
      // inside that job.
      // ------------------------------------------

      if (jobId) {
        filter.candidate = {
          $in: matchingCandidateIds,
        };
      } else {
        filter.$or = [
          {
            candidate: {
              $in: matchingCandidateIds,
            },
          },
          {
            job: {
              $in: matchingJobIds,
            },
          },
        ];
      }
    }

    // ------------------------------------------
    // Count
    // ------------------------------------------

    const total =
      await Application.countDocuments(
        filter
      );

    // ------------------------------------------
    // Fetch applications
    // ------------------------------------------

    const skip =
      (page - 1) * limit;

    const applications =
      await Application.find(filter)
        .populate(applicationPopulate)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
      success: true,
      message:
        "Recruiter applications fetched successfully",
      count: applications.length,
      total,
      applications,
      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
    });
  } catch (error) {
    console.error(
      "Get Recruiter Applications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching recruiter applications",
    });
  }
};

// ==========================================
// UPDATE APPLICATION STATUS
// PUT /api/applications/:applicationId/status
// ==========================================

const updateApplicationStatus = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // Recruiter-only action
    // ------------------------------------------

    if (req.user?.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message:
          "Only recruiters can update application status",
      });
    }

    const { applicationId } =
      req.params;

    const { status } =
      req.body || {};

    if (
      !applicationId ||
      !isValidObjectId(applicationId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid application ID",
      });
    }

    const normalizedStatus =
      normalizeStatus(status);

    if (
      !recruiterUpdateStatuses.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid application status",
        allowedStatuses:
          recruiterUpdateStatuses,
      });
    }

    // ------------------------------------------
    // Find application
    // ------------------------------------------

    const application =
      await Application.findById(
        applicationId
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Application not found",
      });
    }

    // ------------------------------------------
    // Find related job
    // ------------------------------------------

    const job =
      await Job.findById(
        application.job
      );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // ------------------------------------------
    // Recruiter ownership
    // ------------------------------------------

    if (
      !job.recruiter ||
      job.recruiter.toString() !==
        getUserId(req.user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only update applications for your own jobs",
      });
    }

    // ------------------------------------------
    // Prevent invalid transition
    // ------------------------------------------

    if (
      application.status ===
      "withdrawn"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A withdrawn application cannot be changed by the recruiter",
      });
    }

    const previousStatus =
      normalizeStatus(
        application.status
      );

    // ------------------------------------------
    // No-op update
    // ------------------------------------------

    if (
      previousStatus ===
      normalizedStatus
    ) {
      const unchangedApplication =
        await Application.findById(
          application._id
        ).populate(
          applicationPopulate
        );

      return res.status(200).json({
        success: true,
        message:
          "Application status is already up to date",
        application:
          unchangedApplication,
      });
    }

    application.status =
      normalizedStatus;

    await application.save();

    // ------------------------------------------
    // Candidate notification
    // ------------------------------------------

    const statusMessages = {
      pending:
        "Your application is pending review.",

      reviewing:
        "Your application is now being reviewed by the recruiter.",

      shortlisted:
        "Congratulations! Your application has been shortlisted.",

      rejected:
        "Your application status has been updated to rejected.",

      hired:
        "Congratulations! Your application has been marked as hired.",
    };

    const statusTitles = {
      pending:
        "Application Pending",

      reviewing:
        "Application Under Review",

      shortlisted:
        "Application Shortlisted",

      rejected:
        "Application Rejected",

      hired:
        "Application Hired",
    };

    await safeCreateNotification({
      userId:
        application.candidate,

      type:
        "application_status",

      title:
        statusTitles[
          normalizedStatus
        ] ||
        "Application Status Updated",

      message: `${
        statusMessages[
          normalizedStatus
        ] ||
        `Your application status has been changed to ${normalizedStatus}.`
      } Job: "${job.title}".`,

      relatedId:
        application._id,

      relatedType:
        "Application",
    });

    // ------------------------------------------
    // Populate updated application
    // ------------------------------------------

    const updatedApplication =
      await Application.findById(
        application._id
      ).populate(
        applicationPopulate
      );

    return res.status(200).json({
      success: true,
      message:
        "Application status updated successfully",
      application:
        updatedApplication,
    });
  } catch (error) {
    console.error(
      "Update Application Status Error:",
      error
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )
            .map(
              (item) =>
                item.message
            )
            .join(", ") ||
          "Application validation failed",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          `Invalid ${error.path}`,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating application status",
    });
  }
};

// ==========================================
// WITHDRAW APPLICATION
// PUT /api/applications/:applicationId/withdraw
// ==========================================

const withdrawApplication = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // Candidate-only action
    // ------------------------------------------

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can withdraw applications",
      });
    }

    const { applicationId } =
      req.params;

    if (
      !applicationId ||
      !isValidObjectId(applicationId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid application ID",
      });
    }

    const application =
      await Application.findById(
        applicationId
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Application not found",
      });
    }

    // ------------------------------------------
    // Ownership
    // ------------------------------------------

    if (
      !application.candidate ||
      application.candidate.toString() !==
        getUserId(req.user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only withdraw your own application",
      });
    }

    // ------------------------------------------
    // State validation
    // ------------------------------------------

    if (
      application.status ===
      "withdrawn"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Application is already withdrawn",
      });
    }

    if (
      application.status === "hired"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A hired application cannot be withdrawn",
      });
    }

    application.status =
      "withdrawn";

    await application.save();

    // ------------------------------------------
    // Related job
    // ------------------------------------------

    const job =
      await Job.findById(
        application.job
      );

    // ------------------------------------------
    // Candidate notification
    // ------------------------------------------

    await safeCreateNotification({
      userId:
        application.candidate,

      type:
        "application_status",

      title:
        "Application Withdrawn",

      message: job
        ? `Your application for "${job.title}" has been withdrawn successfully.`
        : "Your application has been withdrawn successfully.",

      relatedId:
        application._id,

      relatedType:
        "Application",
    });

    // ------------------------------------------
    // Return updated application
    // ------------------------------------------

    const updatedApplication =
      await Application.findById(
        application._id
      ).populate(
        applicationPopulate
      );

    return res.status(200).json({
      success: true,
      message:
        "Application withdrawn successfully",
      application:
        updatedApplication,
    });
  } catch (error) {
    console.error(
      "Withdraw Application Error:",
      error
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )
            .map(
              (item) =>
                item.message
            )
            .join(", ") ||
          "Application validation failed",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          `Invalid ${error.path}`,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while withdrawing application",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  applyForJob,
  uploadResume,
  getMyApplications,
  getApplicationDetails,
  getRecruiterApplications,
  updateApplicationStatus,
  withdrawApplication,
};