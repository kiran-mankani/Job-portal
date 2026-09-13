const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==========================================
// AUTHENTICATION MIDDLEWARE
// Verifies JWT and loads the current user
// into req.user.
// ==========================================

const protect = async (req, res, next) => {
  try {
    // ------------------------------------------
    // 1. Get Authorization Header
    // ------------------------------------------

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Authorization token is required",
      });
    }

    // ------------------------------------------
    // 2. Validate Bearer Format
    // ------------------------------------------

    if (
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format. Use Bearer <token>",
      });
    }

    const token =
      authHeader
        .substring(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "JWT token is empty",
      });
    }

    // ------------------------------------------
    // 3. Validate JWT Configuration
    // ------------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is not configured"
      );

      return res.status(500).json({
        success: false,
        message:
          "JWT configuration error",
      });
    }

    // ------------------------------------------
    // 4. Verify JWT
    // ------------------------------------------

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    // ------------------------------------------
    // 5. Validate Token Payload
    // ------------------------------------------

    if (
      !decoded ||
      !decoded.userId
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid token payload",
      });
    }

    // ------------------------------------------
    // 6. Find User
    //
    // password is select:false in User model,
    // so it will NOT be returned here.
    // ------------------------------------------

    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User no longer exists",
      });
    }

    // ------------------------------------------
    // 7. Check Account Status
    // ------------------------------------------

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked. Please contact the administrator.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive. Please contact the administrator.",
      });
    }

    // ------------------------------------------
    // 8. Optional Role Consistency Check
    //
    // Token role and current DB role should match.
    // This prevents an old token from continuing
    // to carry a previous role after an admin change.
    // ------------------------------------------

    if (
      decoded.role &&
      user.role !== decoded.role
    ) {
      return res.status(401).json({
        success: false,
        message:
          "User role has changed. Please login again.",
      });
    }

    // ------------------------------------------
    // 9. Attach User to Request
    // ------------------------------------------

    req.user = user;

    // Keep token payload available when needed
    // by downstream controllers.
    req.auth = decoded;

    // ------------------------------------------
    // 10. Continue
    // ------------------------------------------

    return next();
  } catch (error) {
    console.error(
      "AUTH MIDDLEWARE ERROR:",
      error
    );

    // ------------------------------------------
    // Token Expired
    // ------------------------------------------

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Token has expired. Please login again.",
      });
    }

    // ------------------------------------------
    // Invalid Token
    // ------------------------------------------

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid JWT token",
      });
    }

    // ------------------------------------------
    // Malformed Token
    // ------------------------------------------

    if (
      error.name ===
      "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "JWT token is not active yet",
      });
    }

    // ------------------------------------------
    // General Authentication Error
    // ------------------------------------------

    return res.status(401).json({
      success: false,
      message:
        "Authentication failed",
    });
  }
};

module.exports = protect;