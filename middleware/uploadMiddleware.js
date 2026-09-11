
const multer = require("multer");

// ==========================================
// MULTER MEMORY STORAGE
// ==========================================
//
// File server ki disk par save nahi hogi.
// File directly memory buffer mein aayegi,
// jise controller Cloudinary par upload karega.
// ==========================================

const storage = multer.memoryStorage();

// ==========================================
// ALLOWED RESUME FILE TYPES
// ==========================================

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
]);

const fileFilter = (req, file, cb) => {
  const mimetype = String(
    file.mimetype || ""
  )
    .trim()
    .toLowerCase();

  const originalName = String(
    file.originalname || ""
  )
    .trim()
    .toLowerCase();

  const extension = originalName.includes(".")
    ? originalName.substring(
        originalName.lastIndexOf(".")
      )
    : "";

  // ----------------------------------------
  // Validate MIME type + extension
  // ----------------------------------------

  if (
    allowedMimeTypes.has(mimetype) &&
    allowedExtensions.has(extension)
  ) {
    return cb(null, true);
  }

  return cb(
    new multer.MulterError(
      "LIMIT_UNEXPECTED_FILE"
    ),
    false
  );
};

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const uploadResume = multer({
  storage,

  fileFilter,

  limits: {
    // Maximum resume size = 5 MB
    fileSize:
      5 * 1024 * 1024,

    // Only one resume file at a time
    files: 1,
  },
});

module.exports = uploadResume;

