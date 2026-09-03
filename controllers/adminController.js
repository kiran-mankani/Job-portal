const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==========================================
// 30. ADMIN LOGIN
// POST /api/admin/login
// ==========================================

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check admin role
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // Check blocked status
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Admin account is blocked",
      });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
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
      message: "Admin login successful",
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Admin login failed",
      error: error.message,
    });
  }
};

// ==========================================
// 31. GET ALL USERS
// GET /api/admin/users
// ==========================================

const getUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const filter = {};

    if (role) {
      if (!["candidate", "recruiter", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter",
        });
      }

      filter.role = role;
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// ==========================================
// 32. BLOCK / UNBLOCK USER
// PATCH /api/admin/users/:id/block
// ==========================================

const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Admin cannot block another admin
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin account cannot be blocked",
      });
    }

    user.isBlocked = !user.isBlocked;

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
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error("Block/Unblock User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to block/unblock user",
      error: error.message,
    });
  }
};

// ==========================================
// 33. DELETE USER
// DELETE /api/admin/users/:id
// ==========================================

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Admin accounts cannot be deleted
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin account cannot be deleted",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Delete User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// ==========================================
// 34. MANAGE JOBS
// GET /api/admin/jobs
// ==========================================

const manageJobs = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
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
    console.error("Manage Jobs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

// ==========================================
// 35. GET ALL APPLICATIONS
// GET /api/admin/applications
// ==========================================

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("candidate", "-password")
      .populate("job")
      .populate("recruiter", "-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get All Applications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
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