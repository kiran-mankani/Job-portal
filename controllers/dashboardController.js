const User = require("../models/User");
const Application = require("../models/Application");
const Interview = require("../models/Interview");

// ==========================================
// Candidate Dashboard
// GET /api/dashboard/candidate
// ==========================================
const getCandidateDashboard = async (req, res) => {
  try {
    const candidateId = req.user._id;

    const candidate = await User.findById(candidateId).select("-password");

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    const totalApplications = await Application.countDocuments({
      candidate: candidateId,
    });

    const pendingApplications = await Application.countDocuments({
      candidate: candidateId,
      status: "pending",
    });

    const shortlistedApplications = await Application.countDocuments({
      candidate: candidateId,
      status: "shortlisted",
    });

    const rejectedApplications = await Application.countDocuments({
      candidate: candidateId,
      status: "rejected",
    });

    const scheduledInterviews = await Interview.countDocuments({
      candidate: candidateId,
      status: "scheduled",
    });

    const recentApplications = await Application.find({
      candidate: candidateId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const upcomingInterviews = await Interview.find({
      candidate: candidateId,
      status: "scheduled",
      scheduledAt: { $gte: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .limit(5);

    res.status(200).json({
      success: true,
      message: "Candidate dashboard fetched successfully",
      dashboard: {
        candidate,
        statistics: {
          totalApplications,
          pendingApplications,
          shortlistedApplications,
          rejectedApplications,
          scheduledInterviews,
        },
        recentApplications,
        upcomingInterviews,
      },
    });
  } catch (error) {
    console.error("Candidate Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch candidate dashboard",
      error: error.message,
    });
  }
};
// ==========================================
// Recruiter Dashboard
// GET /api/dashboard/recruiter
// ==========================================
const getRecruiterDashboard = async (req, res) => {
  try {
    const recruiterId = req.user._id;

    // Recruiter profile
    const recruiter = await User.findById(recruiterId).select("-password");

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found",
      });
    }

    // Total jobs
    const totalJobs = await Job.countDocuments({
      recruiter: recruiterId,
    });

    // Active jobs
    const activeJobs = await Job.countDocuments({
      recruiter: recruiterId,
      status: "active",
    });

    // Closed jobs
    const closedJobs = await Job.countDocuments({
      recruiter: recruiterId,
      status: "closed",
    });

    // Get recruiter's jobs
    const recruiterJobs = await Job.find({
      recruiter: recruiterId,
    }).select("_id");

    const jobIds = recruiterJobs.map((job) => job._id);

    // Total applications
    const totalApplications = await Application.countDocuments({
      job: { $in: jobIds },
    });

    // Pending applications
    const pendingApplications = await Application.countDocuments({
      job: { $in: jobIds },
      status: "pending",
    });

    // Shortlisted applications
    const shortlistedApplications = await Application.countDocuments({
      job: { $in: jobIds },
      status: "shortlisted",
    });

    // Rejected applications
    const rejectedApplications = await Application.countDocuments({
      job: { $in: jobIds },
      status: "rejected",
    });

    // Total interviews
    const totalInterviews = await Interview.countDocuments({
      recruiter: recruiterId,
    });

    // Upcoming interviews
    const upcomingInterviews = await Interview.find({
      recruiter: recruiterId,
      status: "scheduled",
      scheduledAt: { $gte: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .limit(5);

    // Recent jobs
    const recentJobs = await Job.find({
      recruiter: recruiterId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent applications
    const recentApplications = await Application.find({
      job: { $in: jobIds },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      message: "Recruiter dashboard fetched successfully",

      dashboard: {
        recruiter,

        statistics: {
          totalJobs,
          activeJobs,
          closedJobs,
          totalApplications,
          pendingApplications,
          shortlistedApplications,
          rejectedApplications,
          totalInterviews,
        },

        recentJobs,
        recentApplications,
        upcomingInterviews,
      },
    });
  } catch (error) {
    console.error("Recruiter Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recruiter dashboard",
      error: error.message,
    });
  }
};

// ==========================================
// Admin Dashboard
// GET /api/dashboard/admin
// ==========================================
const getAdminDashboard = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // Total users
    const totalUsers = await User.countDocuments();

    // Total candidates
    const totalCandidates = await User.countDocuments({
      role: "candidate",
    });

    // Total recruiters
    const totalRecruiters = await User.countDocuments({
      role: "recruiter",
    });

    // Total jobs
    const totalJobs = await Job.countDocuments();

    // Active jobs
    const activeJobs = await Job.countDocuments({
      status: "active",
    });

    // Closed jobs
    const closedJobs = await Job.countDocuments({
      status: "closed",
    });

    // Total applications
    const totalApplications = await Application.countDocuments();

    // Total interviews
    const totalInterviews = await Interview.countDocuments();

    // Scheduled interviews
    const scheduledInterviews = await Interview.countDocuments({
      status: "scheduled",
    });

    // Recent users
    const recentUsers = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent jobs
    const recentJobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      message: "Admin dashboard fetched successfully",

      dashboard: {
        statistics: {
          totalUsers,
          totalCandidates,
          totalRecruiters,
          totalJobs,
          activeJobs,
          closedJobs,
          totalApplications,
          totalInterviews,
          scheduledInterviews,
        },

        recentUsers,
        recentJobs,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  getCandidateDashboard,
  getRecruiterDashboard,
  getAdminDashboard,
};