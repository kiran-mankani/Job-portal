
const mongoose = require("mongoose");

const applicationSchema =
  new mongoose.Schema(
    {
      // ==========================================
      // JOB
      // ==========================================

      job: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Job",
        required: true,
        index: true,
      },

      // ==========================================
      // CANDIDATE
      // ==========================================

      candidate: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      // ==========================================
      // RESUME URL
      // ==========================================

      resume: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
      },

      // ==========================================
      // COVER LETTER
      // ==========================================

      coverLetter: {
        type: String,
        default: "",
        trim: true,
        maxlength: 5000,
      },

      // ==========================================
      // APPLICATION STATUS
      // ==========================================

      status: {
        type: String,
        enum: [
          "pending",
          "reviewing",
          "shortlisted",
          "rejected",
          "hired",
          "withdrawn",
        ],
        default: "pending",
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// ==========================================
// PREVENT DUPLICATE APPLICATIONS
// ==========================================
//
// Same candidate cannot apply to the same job twice.
// ==========================================

applicationSchema.index(
  {
    job: 1,
    candidate: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// DASHBOARD / LISTING INDEX
// ==========================================

applicationSchema.index({
  candidate: 1,
  status: 1,
  createdAt: -1,
});

applicationSchema.index({
  job: 1,
  status: 1,
  createdAt: -1,
});

// ==========================================
// EXPORT
// ==========================================

module.exports =
  mongoose.model(
    "Application",
    applicationSchema
  );

