const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cv: {
      type: String,
      default: null,
    },

    coverLetter: {
      type: String,
      default: "",
    },

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
    },
  },
  {
    timestamps: true,
  }
);

// Same candidate cannot apply to the same job twice
applicationSchema.index(
  { job: 1, candidate: 1 },
  { unique: true }
);

module.exports = mongoose.model("Application", applicationSchema);