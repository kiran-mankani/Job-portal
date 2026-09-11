const Job = require("../models/Job");
const User = require("../models/User");
const Company = require("../models/Company");
const Application = require("../models/Application");

// ======================================================
// HELPERS
// ======================================================

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const normalizeSkills = (value) => {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map((skill) => cleanString(skill))
          .filter(Boolean)
      ),
    ];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      ),
    ];
  }

  return [];
};

const parsePage = (value, fallback = 1) => {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return fallback;
  }

  return page;
};

const parseLimit = (value, fallback = 20) => {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return fallback;
  }

  return Math.min(limit, 100);
};

const buildPagination = (page, limit, total) => {
  const totalPages =
    total > 0 ? Math.ceil(total / limit) : 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
};

const allowedJobTypes = [
  "full-time",
  "part-time",
  "internship",
  "contract",
  "freelance",
];

const allowedExperienceLevels = [
  "Entry Level",
  "Mid Level",
  "Senior Level",
  "Lead",
];

// ======================================================
// COMPANY SEARCH HELPER
// ======================================================

const getCompanyIdsByName = async (keyword) => {
  if (!keyword || !String(keyword).trim()) {
    return [];
  }

  const companies = await Company.find({
    name: {
      $regex: String(keyword).trim(),
      $options: "i",
    },
  })
    .select("_id")
    .lean();

  return companies.map((company) => company._id);
};

// ======================================================
// JOB POPULATE CONFIG
// ======================================================

const populateJob = (query) => {
  return query
    .populate(
      "recruiter",
      "name email phone"
    )
    .populate(
      "companyId",
      "name description location website logo"
    );
};

// ======================================================
// CREATE JOB
// POST /api/jobs
// ======================================================

const createJob = async (req, res) => {
  try {
    const recruiterId = getUserId(req);

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user?.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Only recruiters can post jobs",
      });
    }

    const body = req.body || {};

    const title = cleanString(
      body.title || body.jobTitle
    );

    const location = cleanString(
      body.location || body.jobLocation
    );

    const description = cleanString(
      body.description ||
        body.jobDescription ||
        body.details
    );

    const rawSkills =
      body.skills !== undefined
        ? body.skills
        : body.requirements;

    const skills = normalizeSkills(rawSkills);

    const jobType = cleanString(
      body.jobType || body.type
    ).toLowerCase();

    const missingFields = [];

    if (!title) {
      missingFields.push("title");
    }

    if (!location) {
      missingFields.push("location");
    }

    if (!description) {
      missingFields.push("description");
    }

    if (skills.length === 0) {
      missingFields.push("skills");
    }

    if (!jobType) {
      missingFields.push("jobType");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(
          ", "
        )}`,
      });
    }

    if (description.length < 20) {
      return res.status(400).json({
        success: false,
        message:
          "Job description must be at least 20 characters",
      });
    }

    if (!allowedJobTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid job type. Use full-time, part-time, internship, contract or freelance.",
      });
    }

    // ======================================================
    // GET RECRUITER COMPANY
    // ======================================================

    const recruiter = await User.findById(recruiterId)
      .select("companyId")
      .lean();

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found",
      });
    }

    if (!recruiter.companyId) {
      return res.status(400).json({
        success: false,
        message:
          "Recruiter is not associated with a company",
      });
    }

    const companyExists = await Company.exists({
      _id: recruiter.companyId,
    });

    if (!companyExists) {
      return res.status(400).json({
        success: false,
        message:
          "Recruiter's company could not be found",
      });
    }

    const jobData = {
      title,
      companyId: recruiter.companyId,
      location,
      description,
      skills,
      jobType,
      recruiter: recruiterId,
      status: "active",
    };

    const category = cleanString(body.category);

    if (category) {
      jobData.category = category;
    }

    const experienceLevel = cleanString(
      body.experienceLevel
    );

    if (experienceLevel) {
      if (
        !allowedExperienceLevels.includes(
          experienceLevel
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid experience level",
        });
      }

      jobData.experienceLevel = experienceLevel;
    }

    const experience = cleanString(
      body.experience
    );

    if (experience) {
      jobData.experience = experience;
    }

    if (
      body.salary !== undefined &&
      body.salary !== null &&
      body.salary !== ""
    ) {
      jobData.salary = cleanString(body.salary);
    }

    if (
      body.minSalary !== undefined &&
      body.minSalary !== null &&
      body.minSalary !== ""
    ) {
      const minSalary = Number(body.minSalary);

      if (
        !Number.isFinite(minSalary) ||
        minSalary < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid minimum salary",
        });
      }

      jobData.minSalary = minSalary;
    }

    if (
      body.maxSalary !== undefined &&
      body.maxSalary !== null &&
      body.maxSalary !== ""
    ) {
      const maxSalary = Number(body.maxSalary);

      if (
        !Number.isFinite(maxSalary) ||
        maxSalary < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid maximum salary",
        });
      }

      jobData.maxSalary = maxSalary;
    }

    if (
      jobData.minSalary !== undefined &&
      jobData.maxSalary !== undefined &&
      jobData.maxSalary < jobData.minSalary
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum salary must be greater than or equal to minimum salary",
      });
    }

    if (
      body.status === "active" ||
      body.status === "closed"
    ) {
      jobData.status = body.status;
    }

    const job = new Job(jobData);

    await job.save();

    const populatedJob = await populateJob(
      Job.findById(job._id)
    );

    return res.status(201).json({
      success: true,
      message: "Job posted successfully",
      job: populatedJob || job,
    });
  } catch (error) {
    console.error("Create Job Error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(
        error.errors || {}
      ).map((err) => err.message);

      return res.status(400).json({
        success: false,
        message:
          errors.join(", ") ||
          "Job validation failed",
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
      message: "Server error while posting job",
    });
  }
};

// ======================================================
// GET ALL JOBS
// GET /api/jobs
// ======================================================

const getAllJobs = async (req, res) => {
  try {
    const {
      search,
      location,
      jobType,
      category,
      experienceLevel,
      page: pageQuery,
      limit: limitQuery,
    } = req.query;

    const page = parsePage(pageQuery, 1);
    const limit = parseLimit(limitQuery, 20);

    const filter = {
      status: "active",
    };

    if (search && String(search).trim()) {
      const keyword = String(search).trim();

      const companyIds =
        await getCompanyIdsByName(keyword);

      const searchConditions = [
        {
          title: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          location: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          skills: {
            $elemMatch: {
              $regex: keyword,
              $options: "i",
            },
          },
        },
      ];

      if (companyIds.length > 0) {
        searchConditions.push({
          companyId: {
            $in: companyIds,
          },
        });
      }

      filter.$or = searchConditions;
    }

    if (location && String(location).trim()) {
      filter.location = {
        $regex: String(location).trim(),
        $options: "i",
      };
    }

    if (jobType && String(jobType).trim()) {
      const normalizedJobType = String(jobType)
        .trim()
        .toLowerCase();

      if (!allowedJobTypes.includes(normalizedJobType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job type",
        });
      }

      filter.jobType = normalizedJobType;
    }

    if (category && String(category).trim()) {
      filter.category = {
        $regex: String(category).trim(),
        $options: "i",
      };
    }

    if (
      experienceLevel &&
      String(experienceLevel).trim()
    ) {
      const normalizedExperience =
        String(experienceLevel).trim();

      if (
        !allowedExperienceLevels.includes(
          normalizedExperience
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid experience level",
        });
      }

      filter.experienceLevel =
        normalizedExperience;
    }

    const total =
      await Job.countDocuments(filter);

    const jobs = await populateJob(
      Job.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
    );

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      count: jobs.length,
      total,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
      jobs,
    });
  } catch (error) {
    console.error("Get All Jobs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching jobs",
    });
  }
};

// ======================================================
// GET SINGLE JOB
// GET /api/jobs/:id
// ======================================================

const getSingleJob = async (req, res) => {
  try {
    const job = await populateJob(
      Job.findById(req.params.id)
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error(
      "Get Single Job Error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to get job",
    });
  }
};

// ======================================================
// SAVE JOB
// POST /api/jobs/:id/save
// ======================================================

const saveJob = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can save jobs",
      });
    }

    const jobId = req.params.id;

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
          "Only active jobs can be saved",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const alreadySaved = user.savedJobs?.some(
      (savedJobId) =>
        String(savedJobId) === String(jobId)
    );

    if (alreadySaved) {
      return res.status(200).json({
        success: true,
        message: "Job is already saved",
        saved: true,
        jobId,
      });
    }

    user.savedJobs = user.savedJobs || [];

    user.savedJobs.push(jobId);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Job saved successfully",
      saved: true,
      jobId,
    });
  } catch (error) {
    console.error("Save Job Error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while saving job",
    });
  }
};

// ======================================================
// UNSAVE JOB
// DELETE /api/jobs/:id/save
// ======================================================

const unsaveJob = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can remove saved jobs",
      });
    }

    const jobId = req.params.id;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.savedJobs = (user.savedJobs || []).filter(
      (savedJobId) =>
        String(savedJobId) !== String(jobId)
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Job removed from saved jobs",
      saved: false,
      jobId,
    });
  } catch (error) {
    console.error("Unsave Job Error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while removing saved job",
    });
  }
};

// ======================================================
// GET SAVED JOBS
// GET /api/jobs/saved
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

    if (req.user?.role !== "candidate") {
      return res.status(403).json({
        success: false,
        message:
          "Only candidates can access saved jobs",
      });
    }

    const user = await User.findById(userId)
      .select("savedJobs")
      .populate({
        path: "savedJobs",
        populate: [
          {
            path: "recruiter",
            select: "name email phone",
          },
          {
            path: "companyId",
            select:
              "name description location website logo",
          },
        ],
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const savedJobs = (user.savedJobs || [])
      .filter(Boolean)
      .filter(
        (job) => job.status === "active"
      );

    return res.status(200).json({
      success: true,
      message:
        "Saved jobs fetched successfully",
      count: savedJobs.length,
      jobs: savedJobs,
    });
  } catch (error) {
    console.error(
      "Get Saved Jobs Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching saved jobs",
    });
  }
};

// ======================================================
// UPDATE JOB
// PUT /api/jobs/:id
// ======================================================

const updateJob = async (req, res) => {
  try {
    const recruiterId = getUserId(req);

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user?.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message:
          "Only recruiters can update jobs",
      });
    }

    const job = await Job.findById(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (
      String(job.recruiter) !==
      String(recruiterId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only update your own jobs",
      });
    }

    const body = req.body || {};

    const incomingTitle =
      body.title !== undefined
        ? body.title
        : body.jobTitle;

    if (incomingTitle !== undefined) {
      const title =
        cleanString(incomingTitle);

      if (!title) {
        return res.status(400).json({
          success: false,
          message:
            "Job title cannot be empty",
        });
      }

      job.title = title;
    }

    // ======================================================
    // COMPANY
    // ======================================================
    // Company is now owned by the recruiter through
    // User.companyId.
    //
    // Therefore company/companyName is intentionally
    // NOT stored on the Job document.
    // ======================================================

    const incomingCompany =
      body.company !== undefined
        ? body.company
        : body.companyName;

    if (incomingCompany !== undefined) {
      const companyValue =
        cleanString(incomingCompany);

      if (!companyValue) {
        return res.status(400).json({
          success: false,
          message:
            "Company cannot be empty",
        });
      }

      const recruiter =
        await User.findById(recruiterId)
          .select("companyId")
          .lean();

      if (!recruiter?.companyId) {
        return res.status(400).json({
          success: false,
          message:
            "Recruiter is not associated with a company",
        });
      }

      const companyExists =
        await Company.exists({
          _id: recruiter.companyId,
        });

      if (!companyExists) {
        return res.status(400).json({
          success: false,
          message:
            "Recruiter's company could not be found",
        });
      }

      job.companyId = recruiter.companyId;
    }

    const incomingLocation =
      body.location !== undefined
        ? body.location
        : body.jobLocation;

    if (incomingLocation !== undefined) {
      const location =
        cleanString(incomingLocation);

      if (!location) {
        return res.status(400).json({
          success: false,
          message:
            "Location cannot be empty",
        });
      }

      job.location = location;
    }

    const incomingDescription =
      body.description !== undefined
        ? body.description
        : body.jobDescription !== undefined
        ? body.jobDescription
        : body.details;

    if (incomingDescription !== undefined) {
      const description =
        cleanString(incomingDescription);

      if (!description) {
        return res.status(400).json({
          success: false,
          message:
            "Job description cannot be empty",
        });
      }

      if (description.length < 20) {
        return res.status(400).json({
          success: false,
          message:
            "Job description must be at least 20 characters",
        });
      }

      job.description = description;
    }

    const incomingSkills =
      body.skills !== undefined
        ? body.skills
        : body.requirements;

    if (incomingSkills !== undefined) {
      const skills =
        normalizeSkills(incomingSkills);

      if (skills.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one skill is required",
        });
      }

      job.skills = skills;
    }

    const incomingJobType =
      body.jobType !== undefined
        ? body.jobType
        : body.type;

    if (incomingJobType !== undefined) {
      const jobType =
        cleanString(
          incomingJobType
        ).toLowerCase();

      if (
        !allowedJobTypes.includes(
          jobType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid job type",
        });
      }

      job.jobType = jobType;
    }

    if (body.category !== undefined) {
      job.category =
        cleanString(body.category);
    }

    if (
      body.experienceLevel !==
      undefined
    ) {
      const level =
        cleanString(
          body.experienceLevel
        );

      if (
        level &&
        !allowedExperienceLevels.includes(
          level
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid experience level",
        });
      }

      job.experienceLevel = level;
    }

    if (body.experience !== undefined) {
      job.experience =
        cleanString(
          body.experience
        );
    }

    if (body.salary !== undefined) {
      job.salary =
        cleanString(body.salary);
    }

    if (body.minSalary !== undefined) {
      if (
        body.minSalary === "" ||
        body.minSalary === null
      ) {
        job.minSalary = null;
      } else {
        const value =
          Number(body.minSalary);

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid minimum salary",
          });
        }

        job.minSalary = value;
      }
    }

    if (body.maxSalary !== undefined) {
      if (
        body.maxSalary === "" ||
        body.maxSalary === null
      ) {
        job.maxSalary = null;
      } else {
        const value =
          Number(body.maxSalary);

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid maximum salary",
          });
        }

        job.maxSalary = value;
      }
    }

    if (
      job.minSalary !== null &&
      job.minSalary !== undefined &&
      job.maxSalary !== null &&
      job.maxSalary !== undefined &&
      job.maxSalary < job.minSalary
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum salary must be greater than or equal to minimum salary",
      });
    }

    if (body.status !== undefined) {
      if (
        !["active", "closed"].includes(
          body.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid job status",
        });
      }

      job.status = body.status;
    }

    await job.save();

    const updatedJob = await populateJob(
      Job.findById(job._id)
    );

    return res.status(200).json({
      success: true,
      message:
        "Job updated successfully",
      job: updatedJob || job,
    });
  } catch (error) {
    console.error(
      "Update Job Error:",
      error
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
          )
            .map((err) => err.message)
            .join(", ") ||
          "Job validation failed",
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
        "Server error while updating job",
    });
  }
};

// ======================================================
// DELETE JOB
// DELETE /api/jobs/:id
// ======================================================

const deleteJob = async (req, res) => {
  try {
    const recruiterId = getUserId(req);

    if (!recruiterId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user?.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message:
          "Only recruiters can delete jobs",
      });
    }

    const job = await Job.findById(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (
      String(job.recruiter) !==
      String(recruiterId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only delete your own jobs",
      });
    }

    await Job.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message:
        "Job deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Job Error:",
      error
    );

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting job",
    });
  }
};

// ======================================================
// SEARCH JOBS
// GET /api/jobs/search
// ======================================================

const searchJobs = async (req, res) => {
  try {
    const {
      keyword,
      location,
      jobType,
      page: pageQuery,
      limit: limitQuery,
    } = req.query;

    if (
      !keyword ||
      !String(keyword).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a search keyword",
      });
    }

    const page = parsePage(
      pageQuery,
      1
    );

    const limit = parseLimit(
      limitQuery,
      20
    );

    const cleanKeyword =
      String(keyword).trim();

    const companyIds =
      await getCompanyIdsByName(
        cleanKeyword
      );

    const searchConditions = [
      {
        title: {
          $regex: cleanKeyword,
          $options: "i",
        },
      },
      {
        description: {
          $regex: cleanKeyword,
          $options: "i",
        },
      },
      {
        location: {
          $regex: cleanKeyword,
          $options: "i",
        },
      },
      {
        skills: {
          $elemMatch: {
            $regex: cleanKeyword,
            $options: "i",
          },
        },
      },
    ];

    if (companyIds.length > 0) {
      searchConditions.push({
        companyId: {
          $in: companyIds,
        },
      });
    }

    const filter = {
      status: "active",
      $or: searchConditions,
    };

    if (
      location &&
      String(location).trim()
    ) {
      filter.location = {
        $regex:
          String(location).trim(),
        $options: "i",
      };
    }

    if (
      jobType &&
      String(jobType).trim()
    ) {
      const normalizedJobType =
        String(jobType)
          .trim()
          .toLowerCase();

      if (
        !allowedJobTypes.includes(
          normalizedJobType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid job type",
        });
      }

      filter.jobType =
        normalizedJobType;
    }

    const total =
      await Job.countDocuments(
        filter
      );

    const jobs =
      await populateJob(
        Job.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) * limit
          )
          .limit(limit)
      );

    return res.status(200).json({
      success: true,
      message:
        "Jobs searched successfully",
      count: jobs.length,
      total,
      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
      jobs,
    });
  } catch (error) {
    console.error(
      "Search Jobs Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to search jobs",
    });
  }
};

// ======================================================
// FILTER JOBS
// GET /api/jobs/filter
// ======================================================

const filterJobs = async (req, res) => {
  try {
    const {
      location,
      jobType,
      category,
      experienceLevel,
      minSalary,
      maxSalary,
      page: pageQuery,
      limit: limitQuery,
    } = req.query;

    const page = parsePage(
      pageQuery,
      1
    );

    const limit = parseLimit(
      limitQuery,
      20
    );

    const filter = {
      status: "active",
    };

    if (
      location &&
      String(location).trim()
    ) {
      filter.location = {
        $regex:
          String(location).trim(),
        $options: "i",
      };
    }

    if (
      jobType &&
      String(jobType).trim()
    ) {
      const normalizedJobType =
        String(jobType)
          .trim()
          .toLowerCase();

      if (
        !allowedJobTypes.includes(
          normalizedJobType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid job type",
        });
      }

      filter.jobType =
        normalizedJobType;
    }

    if (
      category &&
      String(category).trim()
    ) {
      filter.category = {
        $regex:
          String(category).trim(),
        $options: "i",
      };
    }

    if (
      experienceLevel &&
      String(experienceLevel).trim()
    ) {
      const normalizedExperience =
        String(
          experienceLevel
        ).trim();

      if (
        !allowedExperienceLevels.includes(
          normalizedExperience
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid experience level",
        });
      }

      filter.experienceLevel =
        normalizedExperience;
    }

    const salaryConditions = [];

    let requestedMin = null;
    let requestedMax = null;

    if (
      minSalary !== undefined &&
      minSalary !== ""
    ) {
      requestedMin =
        Number(minSalary);

      if (
        !Number.isFinite(
          requestedMin
        ) ||
        requestedMin < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid minimum salary filter",
        });
      }
    }

    if (
      maxSalary !== undefined &&
      maxSalary !== ""
    ) {
      requestedMax =
        Number(maxSalary);

      if (
        !Number.isFinite(
          requestedMax
        ) ||
        requestedMax < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid maximum salary filter",
        });
      }
    }

    if (
      requestedMin !== null &&
      requestedMax !== null &&
      requestedMax < requestedMin
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum salary filter must be greater than or equal to minimum salary filter",
      });
    }

    if (requestedMin !== null) {
      salaryConditions.push({
        $or: [
          {
            maxSalary: {
              $gte: requestedMin,
            },
          },
          {
            maxSalary: null,
            minSalary: {
              $gte: requestedMin,
            },
          },
          {
            maxSalary: {
              $exists: false,
            },
            minSalary: {
              $gte: requestedMin,
            },
          },
        ],
      });
    }

    if (requestedMax !== null) {
      salaryConditions.push({
        $or: [
          {
            minSalary: {
              $lte: requestedMax,
            },
          },
          {
            minSalary: null,
            maxSalary: {
              $lte: requestedMax,
            },
          },
          {
            maxSalary: {
              $exists: false,
            },
            minSalary: {
              $lte: requestedMax,
            },
          },
        ],
      });
    }

    if (salaryConditions.length > 0) {
      filter.$and = salaryConditions;
    }

    const total =
      await Job.countDocuments(
        filter
      );

    const jobs =
      await populateJob(
        Job.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) * limit
          )
          .limit(limit)
      );

    return res.status(200).json({
      success: true,
      message:
        "Jobs filtered successfully",
      count: jobs.length,
      total,
      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
      jobs,
    });
  } catch (error) {
    console.error(
      "Filter Jobs Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to filter jobs",
    });
  }
};

// ======================================================
// RECRUITER OWN JOBS
// GET /api/jobs/my-jobs
// ======================================================

const getRecruiterOwnJobs =
  async (req, res) => {
    try {
      const recruiterId =
        getUserId(req);

      if (!recruiterId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (
        req.user?.role !==
        "recruiter"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only recruiters can access their jobs",
        });
      }

      const {
        search,
        status,
        jobType,
        location,
        page: pageQuery,
        limit: limitQuery,
      } = req.query;

      const page = parsePage(
        pageQuery,
        1
      );

      const limit = parseLimit(
        limitQuery,
        10
      );

      const filter = {
        recruiter: recruiterId,
      };

      if (
        search &&
        String(search).trim()
      ) {
        const keyword =
          String(search).trim();

        const companyIds =
          await getCompanyIdsByName(
            keyword
          );

        const searchConditions = [
          {
            title: {
              $regex: keyword,
              $options: "i",
            },
          },
          {
            location: {
              $regex: keyword,
              $options: "i",
            },
          },
        ];

        if (companyIds.length > 0) {
          searchConditions.push({
            companyId: {
              $in: companyIds,
            },
          });
        }

        filter.$or = searchConditions;
      }

      if (status) {
        if (
          !["active", "closed"].includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid job status",
          });
        }

        filter.status = status;
      }

      if (jobType) {
        const normalized =
          String(jobType)
            .trim()
            .toLowerCase();

        if (
          !allowedJobTypes.includes(
            normalized
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid job type",
          });
        }

        filter.jobType =
          normalized;
      }

      if (
        location &&
        String(location).trim()
      ) {
        filter.location = {
          $regex:
            String(location).trim(),
          $options: "i",
        };
      }

      const total =
        await Job.countDocuments(
          filter
        );

      const jobs =
        await populateJob(
          Job.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(
              (page - 1) * limit
            )
            .limit(limit)
            .lean()
        );

      const jobIds =
        jobs.map(
          (job) => job._id
        );

      let applicationCounts = [];

      if (jobIds.length > 0) {
        applicationCounts =
          await Application.aggregate([
            {
              $match: {
                job: {
                  $in: jobIds,
                },
              },
            },
            {
              $group: {
                _id: "$job",
                count: {
                  $sum: 1,
                },
              },
            },
          ]);
      }

      const applicationMap =
        new Map();

      applicationCounts.forEach(
        (item) => {
          applicationMap.set(
            String(item._id),
            item.count
          );
        }
      );

      const enrichedJobs =
        jobs.map((job) => {
          const count =
            applicationMap.get(
              String(job._id)
            ) || 0;

          return {
            ...job,
            applicationCount:
              count,
            applicationsCount:
              count,
          };
        });

      return res.status(200).json({
        success: true,
        message:
          "Recruiter jobs fetched successfully",
        count:
          enrichedJobs.length,
        total,
        pagination:
          buildPagination(
            page,
            limit,
            total
          ),
        jobs:
          enrichedJobs,
      });
    } catch (error) {
      console.error(
        "Get Recruiter Jobs Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get recruiter jobs",
      });
    }
  };

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createJob,
  getAllJobs,
  getSingleJob,

  // Candidate saved jobs
  saveJob,
  unsaveJob,
  getSavedJobs,

  updateJob,
  deleteJob,
  searchJobs,
  filterJobs,
  getRecruiterOwnJobs,
};