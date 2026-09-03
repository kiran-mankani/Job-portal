const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  adminLogin,
  getUsers,
  toggleBlockUser,
  deleteUser,
  manageJobs,
  getAllApplications,
} = require("../controllers/adminController");

// ==========================================
// 36. ADMIN LOGIN
// POST /api/admin/login
// ==========================================

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin Login
 *     description: Login using admin credentials and receive a JWT token.
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Admin login successful
 *       400:
 *         description: Email and password are required
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Admin access denied
 *       500:
 *         description: Server error
 */

router.post("/login", adminLogin);

// ==========================================
// 37. GET ALL USERS
// GET /api/admin/users
// ==========================================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Admin can view all registered users and optionally filter them by role.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - candidate
 *             - recruiter
 *             - admin
 *         description: Filter users by role
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

router.get(
  "/users",
  protect,
  authorizeRoles("admin"),
  getUsers
);

// ==========================================
// 38. BLOCK / UNBLOCK USER
// PATCH /api/admin/users/:id/block
// ==========================================

/**
 * @swagger
 * /api/admin/users/{id}/block:
 *   patch:
 *     summary: Block or unblock a user
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User MongoDB ID
 *     responses:
 *       200:
 *         description: User blocked or unblocked successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.patch(
  "/users/:id/block",
  protect,
  authorizeRoles("admin"),
  toggleBlockUser
);

// ==========================================
// 39. DELETE USER
// DELETE /api/admin/users/:id
// ==========================================

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Admin can permanently delete a candidate or recruiter.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User MongoDB ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required or admin account cannot be deleted
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.delete(
  "/users/:id",
  protect,
  authorizeRoles("admin"),
  deleteUser
);

// ==========================================
// 40. MANAGE JOBS
// GET /api/admin/jobs
// ==========================================

/**
 * @swagger
 * /api/admin/jobs:
 *   get:
 *     summary: Manage all jobs
 *     description: Admin can view all jobs and optionally filter them by status.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter jobs by status
 *     responses:
 *       200:
 *         description: Jobs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

router.get(
  "/jobs",
  protect,
  authorizeRoles("admin"),
  manageJobs
);

// ==========================================
// 41. GET ALL APPLICATIONS
// GET /api/admin/applications
// ==========================================

/**
 * @swagger
 * /api/admin/applications:
 *   get:
 *     summary: Get all applications
 *     description: Admin can view all job applications.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Applications fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

router.get(
  "/applications",
  protect,
  authorizeRoles("admin"),
  getAllApplications
);

module.exports = router;