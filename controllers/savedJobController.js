
const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");

// ======================================================
// Get current user ID
// ======================================================

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

// ======================================================
// Check candidate role
// ======================================================

const isCandidate = (req) => {
  return (
    String(req.user?.role || "")
      .trim()
      .toLowerCase() === "candidate"
  );
};

// ======================================================
// Save Job
// POST /api/jobs/:id/save
// ======================================================

const saveJob = async (req, res) => {
  try {
    const userId = getUserId(req);
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isCandidate(req)) {
      return res.status(403).json({
        success: false,
        message: "Only candidates can save jobs",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

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
        message: "Only active jobs can be saved",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.savedJobs = Array.isArray(user.savedJobs)
      ? user.savedJobs
      : [];

    const alreadySaved = user.savedJobs.some(
      (savedJob) =>
        String(savedJob) === String(jobId)
    );

    if (alreadySaved) {
      return res.status(200).json({
        success: true,
        message: "Job is already saved",
        saved: true,
        jobId: job._id,
        savedJobs: user.savedJobs,
      });
    }

    user.savedJobs.push(job._id);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Job saved successfully",
      saved: true,
      jobId: job._id,
      savedJobs: user.savedJobs,
    });
  } catch (error) {
    console.error("Save Job Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save job",
    });
  }
};

// ======================================================
// Unsave Job
// DELETE /api/jobs/:id/save
// ======================================================

const unsaveJob = async (req, res) => {
  try {
    const userId = getUserId(req);
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isCandidate(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can remove saved jobs",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.savedJobs = Array.isArray(user.savedJobs)
      ? user.savedJobs
      : [];

    const wasSaved = user.savedJobs.some(
      (savedJob) =>
        String(savedJob) === String(jobId)
    );

    user.savedJobs = user.savedJobs.filter(
      (savedJob) =>
        String(savedJob) !== String(jobId)
    );

    if (wasSaved) {
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Job removed from saved jobs",
      saved: false,
      jobId,
      savedJobs: user.savedJobs,
    });
  } catch (error) {
    console.error("Unsave Job Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove saved job",
    });
  }
};

// ======================================================
// Get Saved Jobs
// GET /api/jobs/saved?page=1&limit=10
// ======================================================

const getSavedJobs = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isCandidate(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can access saved jobs",
      });
    }

    // --------------------------------------------------
    // Pagination
    // --------------------------------------------------

    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 10,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    // --------------------------------------------------
    // Get user saved job IDs
    // --------------------------------------------------

    const user = await User.findById(userId)
      .select("savedJobs");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const savedJobIds = Array.isArray(user.savedJobs)
      ? user.savedJobs.filter(Boolean)
      : [];

    const total = savedJobIds.length;

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    // --------------------------------------------------
    // Get current page IDs
    // --------------------------------------------------

    const paginatedJobIds = savedJobIds.slice(
      skip,
      skip + limit
    );

    // --------------------------------------------------
    // Fetch jobs for current page
    // --------------------------------------------------

    let savedJobs = [];

    if (paginatedJobIds.length > 0) {
      const jobs = await Job.find({
        _id: {
          $in: paginatedJobIds,
        },
      }).populate({
        path: "recruiter",
        select:
          "name email phone company companyDescription companyWebsite companyLogo",
      });

      // ------------------------------------------------
      // Preserve saved-jobs order
      // ------------------------------------------------

      const jobMap = new Map(
        jobs.map((job) => [
          String(job._id),
          job,
        ])
      );

      savedJobs = paginatedJobIds
        .map((jobId) =>
          jobMap.get(String(jobId))
        )
        .filter(Boolean);
    }

    // --------------------------------------------------
    // Pagination response
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Saved jobs fetched successfully",
      count: savedJobs.length,
      total,
      jobs: savedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          totalPages > 0 && page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Saved Jobs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get saved jobs",
    });
  }
};

// ======================================================
// Check Saved Job
// GET /api/jobs/:id/saved
// ======================================================

const checkSavedJob = async (req, res) => {
  try {
    const userId = getUserId(req);
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isCandidate(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can check saved jobs",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const user = await User.findById(userId)
      .select("savedJobs");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isSaved = (
      user.savedJobs || []
    ).some(
      (savedJob) =>
        String(savedJob) === String(jobId)
    );

    return res.status(200).json({
      success: true,
      jobId,
      isSaved,
    });
  } catch (error) {
    console.error("Check Saved Job Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check saved job",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  saveJob,
  unsaveJob,
  getSavedJobs,
  checkSavedJob,
};

