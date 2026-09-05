const Application = require("../models/Application");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Job = require("../models/Job");
const cloudinary = require("../config/cloudinary");
// ==========================================
// Candidate Apply for Job
// POST /api/applications/:jobId/apply
// ==========================================
const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;

    // Check job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check candidate
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidates can apply for jobs",
      });
    }

    // Check duplicate application
    const existingApplication = await Application.findOne({
      job: jobId,
      candidate: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Create application
    const application = await Application.create({
      job: jobId,
      candidate: req.user._id,
      coverLetter: coverLetter || "",
    });

    const populatedApplication = await Application.findById(
      application._id
    )
      .populate("job")
      .populate("candidate", "-password");

    res.status(201).json({
      success: true,
      message: "Job application submitted successfully",
      application: populatedApplication,
    });
  } catch (error) {
    console.error("Apply Job Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to apply for job",
      error: error.message,
    });
  }
};
// ==========================================
// Upload CV
// POST /api/applications/:applicationId/cv
// ==========================================
// ==========================================
// Upload CV to Cloudinary
// POST /api/applications/:applicationId/cv
// ==========================================
const uploadCV = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CV file is required",
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Only application owner can upload CV
    if (
      application.candidate.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only upload CV for your own application",
      });
    }

    // Upload PDF/DOC/DOCX buffer to Cloudinary
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "job-portal/cvs",
            resource_type: "raw",
            public_id: `${applicationId}-${Date.now()}`,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(req.file.buffer);
      });
    };

    const result = await uploadToCloudinary();

    // Save Cloudinary URL in MongoDB
    application.cv = result.secure_url;

    await application.save();

    res.status(200).json({
      success: true,
      message: "CV uploaded successfully",
      cv: application.cv,
      application,
    });
  } catch (error) {
    console.error("Upload CV Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload CV",
      error: error.message,
    });
  }
};
// ==========================================
// Candidate View Applications
// GET /api/applications/my-applications
// ==========================================
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({
      candidate: req.user._id,
    })
      .populate("job")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get My Applications Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
};
// ==========================================
// Candidate View Application Details
// GET /api/applications/:applicationId
// ==========================================
const getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate("job")
      .populate("candidate", "-password");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Candidate can only view their own application
    if (
      application.candidate._id.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own application",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application details fetched successfully",
      application,
    });
  } catch (error) {
    console.error("Get Application Details Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch application details",
      error: error.message,
    });
  }
};
// ==========================================
// Recruiter View Applications
// GET /api/applications/recruiter
// ==========================================
const getRecruiterApplications = async (req, res) => {
  try {
    // Find jobs posted by logged-in recruiter
    const recruiterJobs = await Job.find({
      recruiter: req.user._id,
    }).select("_id");

    const jobIds = recruiterJobs.map((job) => job._id);

    // Find applications for recruiter's jobs
    const applications = await Application.find({
      job: { $in: jobIds },
    })
      .populate("job")
      .populate("candidate", "-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Recruiter applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get Recruiter Applications Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recruiter applications",
      error: error.message,
    });
  }
};
const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "reviewing",
      "shortlisted",
      "rejected",
      "hired",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status",
        allowedStatuses,
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const job = await Job.findById(application.job);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update applications for your own jobs",
      });
    }

    application.status = status;

    await application.save();

    const updatedApplication = await Application.findById(application._id)
      .populate("job")
      .populate("candidate", "-password");

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Update Application Status Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update application status",
      error: error.message,
    });
  }
};

// ==========================================
// Withdraw Application
// PUT /api/applications/:applicationId/withdraw
// ==========================================
const withdrawApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Candidate can only withdraw their own application
    if (application.candidate.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only withdraw your own application",
      });
    }

    // Prevent withdrawing already withdrawn application
    if (application.status === "withdrawn") {
      return res.status(400).json({
        success: false,
        message: "Application is already withdrawn",
      });
    }

    // Prevent withdrawal after hiring
    if (application.status === "hired") {
      return res.status(400).json({
        success: false,
        message: "A hired application cannot be withdrawn",
      });
    }

    application.status = "withdrawn";

    await application.save();

    const updatedApplication = await Application.findById(
      application._id
    )
      .populate("job")
      .populate("candidate", "-password");

    res.status(200).json({
      success: true,
      message: "Application withdrawn successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Withdraw Application Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to withdraw application",
      error: error.message,
    });
  }
};
module.exports = {
  applyForJob,
    uploadCV,
    getMyApplications,
    getApplicationDetails,
    getRecruiterApplications,
     updateApplicationStatus,
     withdrawApplication,

};