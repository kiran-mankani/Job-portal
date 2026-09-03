const Job = require("../models/Job");

// ==========================================
// Create Job API
// POST /api/jobs
// ==========================================
const createJob = async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      description,
      skills,
      salary,
      jobType,
    } = req.body;

    // Required fields
    if (
      !title ||
      !company ||
      !location ||
      !description ||
      !skills ||
      !jobType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, company, location, description, skills and job type are required",
      });
    }

    // Only recruiters can post jobs
    if (req.user.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can post jobs",
      });
    }

    // Create job
    const job = await Job.create({
      title,
      company,
      location,
      description,
      skills,
      salary,
      jobType,
      recruiter: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Job posted successfully",
      job,
    });
  } catch (error) {
    console.error("Create Job Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while posting job",
      error: error.message,
    });
  }
};

// ==========================================
// Get All Jobs API
// GET /api/jobs
// ==========================================
const getAllJobs = async (req, res) => {
  try {
    const { search, location, jobType } = req.query;

    const filter = {
      status: "active",
    };

    // Search by title or company
    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          company: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Location filter
    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    // Job type filter
    if (jobType) {
      filter.jobType = jobType;
    }

    const jobs = await Job.find(filter)
      .populate("recruiter", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Get Jobs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching jobs",
      error: error.message,
    });
  }
};

// ==========================================
// Update Job API
// PUT /api/jobs/:id
// ==========================================
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      company,
      location,
      salary,
      jobType,
      experience,
      skills,
      status,
    } = req.body;

    // Find the job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check whether current recruiter owns this job
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own jobs",
      });
    }

    // Update only provided fields
    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (company !== undefined) job.company = company;
    if (location !== undefined) job.location = location;
    if (salary !== undefined) job.salary = salary;
    if (jobType !== undefined) job.jobType = jobType;
    if (experience !== undefined) job.experience = experience;
    if (skills !== undefined) job.skills = skills;
    if (status !== undefined) job.status = status;

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    console.error("Update Job Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating job",
      error: error.message,
    });
  }
};
// ==========================================
// Delete Job API
// DELETE /api/jobs/:id
// ==========================================
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the job
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check whether current recruiter owns this job
    if (job.recruiter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own jobs",
      });
    }

    // Delete the job
    await Job.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Delete Job Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting job",
      error: error.message,
    });
  }
};
// ==========================================
// EXPORT JOB CONTROLLERS
// ==========================================
// Get Single Job
const getSingleJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("recruiter", "name email phone");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get job",
      error: error.message,
    });
  }
};

// Search Jobs
const searchJobs = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search keyword",
      });
    }

    const jobs = await Job.find({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
      ],
    })
      .populate("recruiter", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to search jobs",
      error: error.message,
    });
  }
};
// Filter Jobs
const filterJobs = async (req, res) => {
  try {
    const {
      location,
      jobType,
      category,
      experienceLevel,
      minSalary,
      maxSalary,
    } = req.query;

    const filter = {};

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (category) {
      filter.category = {
        $regex: category,
        $options: "i",
      };
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    if (minSalary || maxSalary) {
      filter.salary = {};

      if (minSalary) {
        filter.salary.$gte = Number(minSalary);
      }

      if (maxSalary) {
        filter.salary.$lte = Number(maxSalary);
      }
    }

    const jobs = await Job.find(filter)
      .populate("recruiter", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to filter jobs",
      error: error.message,
    });
  }
};
// Recruiter Get Own Jobs
const getRecruiterOwnJobs = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const jobs = await Job.find({
      recruiter: recruiterId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get recruiter jobs",
      error: error.message,
    });
  }
};
module.exports = {
  createJob,
  getAllJobs,
  updateJob,
  deleteJob,
  getSingleJob,
  searchJobs,
  getRecruiterOwnJobs,
   filterJobs,
   
}