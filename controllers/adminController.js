const mongoose = require("mongoose");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================================
// HELPERS
// ==========================================

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const normalizeEmail = (value) => {
  return cleanString(value).toLowerCase();
};

const escapeRegex = (value) => {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
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

const buildPagination = (
  page,
  limit,
  total
) => {
  const totalPages =
    total > 0
      ? Math.ceil(total / limit)
      : 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
};

const sendServerError = (
  res,
  message,
  error
) => {
  console.error(message, error);

  return res.status(500).json({
    success: false,
    message,
  });
};

const allowedRoles = [
  "candidate",
  "recruiter",
  "admin",
];

const allowedJobStatuses = [
  "active",
  "closed",
];

const allowedApplicationStatuses = [
  "pending",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
  "withdrawn",
];

// ==========================================
// 30. ADMIN LOGIN
// POST /api/admin/login
// ==========================================

const adminLogin = async (
  req,
  res
) => {
  try {
    const body = req.body || {};

    const email = normalizeEmail(
      body.email
    );

    const password = cleanString(
      body.password
    );

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }


     const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Admin only.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Admin account is blocked",
      });
    }

    if (
      user.isActive === false ||
      (
        user.status &&
        String(user.status).toLowerCase() ===
          "inactive"
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin account is inactive",
      });
    }

    const isPasswordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is not configured"
      );

      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration error",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Admin login successful",
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage:
          user.profileImage || null,
      },
    });
  } catch (error) {
    return sendServerError(
      res,
      "Admin login failed",
      error
    );
  }
};

// ==========================================
// 31. GET ALL USERS
// GET /api/admin/users
// ==========================================

const getUsers = async (
  req,
  res
) => {
  try {
    const {
      role,
      search,
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

    const filter = {};

    // --------------------------------------
    // ROLE FILTER
    // --------------------------------------

    if (role) {
      const normalizedRole =
        cleanString(role).toLowerCase();

      if (
        !allowedRoles.includes(
          normalizedRole
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role filter",
        });
      }

      filter.role = normalizedRole;
    }

    // --------------------------------------
    // SEARCH
    // --------------------------------------

    if (
      search &&
      cleanString(search)
    ) {
      const keyword = escapeRegex(
        cleanString(search)
      );

      filter.$or = [
        {
          name: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          company: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    const total =
      await User.countDocuments(
        filter
      );

    const users =
      await User.find(filter)
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .skip(
          (page - 1) * limit
        )
        .limit(limit);

    return res.status(200).json({
      success: true,
      message:
        "Users fetched successfully",
      count: users.length,
      total,
      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
      users,
    });
  } catch (error) {
    return sendServerError(
      res,
      "Failed to fetch users",
      error
    );
  }
};

// ==========================================
// 32. BLOCK / UNBLOCK USER
// PATCH /api/admin/users/:id/block
// ==========================================

const toggleBlockUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const currentAdminId =
      getUserId(req);

    if (
      currentAdminId &&
      String(currentAdminId) ===
        String(id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot block or unblock your own admin account",
      });
    }

    const user =
      await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Admin account cannot be blocked",
      });
    }

    user.isBlocked =
      !Boolean(user.isBlocked);

    await user.save();

    return res.status(200).json({
      success: true,
      message: user.isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked:
          user.isBlocked,
      },
    });
  } catch (error) {
    return sendServerError(
      res,
      "Failed to block/unblock user",
      error
    );
  }
};

// ==========================================
// 33. DELETE USER
// DELETE /api/admin/users/:id
// ==========================================

const deleteUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const currentAdminId =
      getUserId(req);

    if (
      currentAdminId &&
      String(currentAdminId) ===
        String(id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot delete your own admin account",
      });
    }

    const user =
      await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Admin account cannot be deleted",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "User deleted successfully",

      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return sendServerError(
      res,
      "Failed to delete user",
      error
    );
  }
};

// ==========================================
// 34. MANAGE JOBS
// GET /api/admin/jobs
// ==========================================

const manageJobs = async (
  req,
  res
) => {
  try {
    const {
      status,
      search,
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

    const filter = {};

    // --------------------------------------
    // STATUS FILTER
    // --------------------------------------

    if (status) {
      const normalizedStatus =
        cleanString(status).toLowerCase();

      if (
        !allowedJobStatuses.includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid job status filter",
        });
      }

      filter.status =
        normalizedStatus;
    }

    // --------------------------------------
    // SEARCH
    // --------------------------------------

    if (
      search &&
      cleanString(search)
    ) {
      const keyword = escapeRegex(
        cleanString(search)
      );

      filter.$or = [
        {
          title: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          company: {
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
    }

    const total =
      await Job.countDocuments(
        filter
      );

    const jobs =
      await Job.find(filter)
        .populate(
          "recruiter",
          "name email company profileImage"
        )
        .sort({
          createdAt: -1,
        })
        .skip(
          (page - 1) * limit
        )
        .limit(limit);

    return res.status(200).json({
      success: true,
      message:
        "Jobs fetched successfully",
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
    return sendServerError(
      res,
      "Failed to fetch jobs",
      error
    );
  }
};

// ==========================================
// 35. GET ALL APPLICATIONS
// GET /api/admin/applications
// ==========================================

const getAllApplications =
  async (
    req,
    res
  ) => {
    try {
      const {
        status,
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

      const filter = {};

      // --------------------------------------
      // APPLICATION STATUS FILTER
      // --------------------------------------

      if (status) {
        const normalizedStatus =
          cleanString(status).toLowerCase();

        if (
          !allowedApplicationStatuses.includes(
            normalizedStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid application status filter",
          });
        }

        filter.status =
          normalizedStatus;
      }

      const total =
        await Application.countDocuments(
          filter
        );

      const applications =
        await Application.find(filter)
          .populate(
            "candidate",
            "name email phone profileImage"
          )
          .populate({
            path: "job",
            select:
              "title company location jobType category status recruiter",

            populate: {
              path: "recruiter",
              select:
                "name email company profileImage",
            },
          })
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) * limit
          )
          .limit(limit);

      return res.status(200).json({
        success: true,
        message:
          "Applications fetched successfully",

        count:
          applications.length,

        total,

        pagination:
          buildPagination(
            page,
            limit,
            total
          ),

        applications,
      });
    } catch (error) {
      return sendServerError(
        res,
        "Failed to fetch applications",
        error
      );
    }
  };


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  adminLogin,
  getUsers,
  toggleBlockUser,
  deleteUser,
  manageJobs,
  getAllApplications,
};