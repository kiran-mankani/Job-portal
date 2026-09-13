const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // ==========================================
    // AUTHENTICATION CHECK
    // ==========================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // ==========================================
    // NORMALIZE ALLOWED ROLES
    // ==========================================

    const allowedRoles = [
      ...new Set(
        roles
          .filter(Boolean)
          .map((role) =>
            String(role)
              .trim()
              .toLowerCase()
          )
      ),
    ];

    // ==========================================
    // NORMALIZE USER ROLE
    // ==========================================

    const userRole = String(req.user.role || "")
      .trim()
      .toLowerCase();

    // ==========================================
    // VALIDATE USER ROLE
    // ==========================================

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          "Your account does not have a valid role",
      });
    }

    // ==========================================
    // CHECK ROLE PERMISSION
    // ==========================================

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action",
      });
    }

    // ==========================================
    // AUTHORIZED
    // ==========================================

    return next();
  };
};

module.exports = authorizeRoles;