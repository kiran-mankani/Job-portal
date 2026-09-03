const mongoose = require("mongoose");

// ==========================================
// Job Schema
// Stores job information posted by recruiters
// ==========================================
const jobSchema = new mongoose.Schema(
  {
    // Job title, for example: "Frontend Developer"
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Company name
    company: {
      type: String,
      required: true,
      trim: true,
    },

    // Job location
    location: {
      type: String,
      required: true,
      trim: true,
    },

    // Job description
    description: {
      type: String,
      required: true,
    },

    // Required skills for the job
    skills: {
      type: [String],
      required: true,
    },

    // Salary information
    salary: {
      type: String,
    },

    // Job type: full-time, part-time, internship, etc.
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "internship", "contract"],
      required: true,
    },

    // Recruiter who created this job
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Job status
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  {
    // Automatically adds createdAt and updatedAt
    timestamps: true,
  }
);

module.exports = mongoose.model("Job", jobSchema);