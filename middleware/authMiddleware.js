const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("=================================");
    console.log("AUTH HEADER:", authHeader ? "RECEIVED" : "NOT RECEIVED");

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.substring(7).trim();

    console.log("TOKEN EXISTS:", !!token);
    console.log("TOKEN LENGTH:", token.length);
    console.log("TOKEN PARTS:", token.split(".").length);
    console.log("JWT SECRET LOADED:", !!process.env.JWT_SECRET);
    console.log(
      "JWT SECRET LENGTH:",
      process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    );

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "JWT token is empty",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("JWT VERIFIED SUCCESSFULLY");
    console.log("USER ID:", decoded.userId);
    console.log("ROLE:", decoded.role);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    req.user = user;

    next();

  } catch (error) {
    console.error("=================================");
    console.error("AUTH MIDDLEWARE ERROR");
    console.error("ERROR NAME:", error.name);
    console.error("ERROR MESSAGE:", error.message);
    console.error("=================================");

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid JWT token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = protect;