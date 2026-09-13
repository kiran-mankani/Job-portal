const multer = require("multer");
const path = require("path");

// ==========================================
// MEMORY STORAGE
// ==========================================

const storage = multer.memoryStorage();

// ==========================================
// ALLOWED IMAGE TYPES
// ==========================================

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

// ==========================================
// FILE FILTER
// ==========================================

const fileFilter = (req, file, cb) => {
  const mimetype = String(file.mimetype || "")
    .trim()
    .toLowerCase();

  const originalName = String(file.originalname || "")
    .trim()
    .toLowerCase();

  const extension = path
    .extname(originalName)
    .toLowerCase();

  // ========================================
  // Validate MIME + Extension
  // ========================================

  if (
    allowedMimeTypes.has(mimetype) &&
    allowedExtensions.has(extension)
  ) {
    return cb(null, true);
  }

  return cb(
    new multer.MulterError("LIMIT_UNEXPECTED_FILE"),
    false
  );
};

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const uploadProfileImageMiddleware = multer({
  storage,
  fileFilter,

  limits: {
    // Maximum profile image size = 5 MB
    fileSize: 5 * 1024 * 1024,

    // Only one profile image at a time
    files: 1,
  },
});

// ==========================================
// EXPORT
// ==========================================

module.exports = uploadProfileImageMiddleware;