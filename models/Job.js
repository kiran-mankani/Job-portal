const mongoose = require("mongoose");

// ======================================================
// Job Schema
// ======================================================

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    // ======================================================
    // COMPANY REFERENCE
    // ======================================================

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },

    skills: {
      type: [String],
      required: true,
      validate: {
        validator: function (skills) {
          return (
            Array.isArray(skills) &&
            skills.length > 0
          );
        },
        message: "At least one skill is required",
      },
    },

    salary: {
      type: String,
      trim: true,
      default: "",
    },

    minSalary: {
      type: Number,
      min: 0,
      default: null,
    },

    maxSalary: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: function (value) {
          if (
            value === null ||
            value === undefined ||
            this.minSalary === null ||
            this.minSalary === undefined
          ) {
            return true;
          }

          return value >= this.minSalary;
        },
        message:
          "Maximum salary must be greater than or equal to minimum salary",
      },
    },

    jobType: {
      type: String,
      enum: [
        "full-time",
        "part-time",
        "internship",
        "contract",
        "freelance",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    experienceLevel: {
      type: String,
      enum: [
        "",
        "Entry Level",
        "Mid Level",
        "Senior Level",
        "Lead",
      ],
      default: "",
    },

    experience: {
      type: String,
      trim: true,
      default: "",
    },

    // ======================================================
    // RECRUITER REFERENCE
    // ======================================================

    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

jobSchema.index({
  title: "text",
  description: "text",
  location: "text",
  skills: "text",
});

jobSchema.index({
  companyId: 1,
  createdAt: -1,
});

jobSchema.index({
  recruiter: 1,
  createdAt: -1,
});

jobSchema.index({
  status: 1,
  createdAt: -1,
});

jobSchema.index({
  jobType: 1,
});

jobSchema.index({
  category: 1,
});

jobSchema.index({
  experienceLevel: 1,
});

// ======================================================
// PRE SAVE
// ======================================================

jobSchema.pre("save", function () {
  // --------------------------------------
  // Normalize skills
  // --------------------------------------

  if (Array.isArray(this.skills)) {
    this.skills = [
      ...new Set(
        this.skills
          .map((skill) => String(skill).trim())
          .filter(Boolean)
      ),
    ];
  }

  // --------------------------------------
  // Normalize job type
  // --------------------------------------

  if (this.jobType) {
    this.jobType = String(this.jobType)
      .trim()
      .toLowerCase();
  }

  // --------------------------------------
  // Normalize status
  // --------------------------------------

  if (this.status) {
    this.status = String(this.status)
      .trim()
      .toLowerCase();
  }

  // --------------------------------------
  // Normalize experience level
  // --------------------------------------

  if (this.experienceLevel) {
    this.experienceLevel = String(
      this.experienceLevel
    ).trim();
  }

  // --------------------------------------
  // Validate salary relationship
  // --------------------------------------

  if (
    this.minSalary !== null &&
    this.minSalary !== undefined &&
    this.maxSalary !== null &&
    this.maxSalary !== undefined &&
    this.maxSalary < this.minSalary
  ) {
    this.invalidate(
      "maxSalary",
      "Maximum salary must be greater than or equal to minimum salary"
    );
  }

  // --------------------------------------
  // Generate readable salary string
  // --------------------------------------

  if (
    (this.minSalary !== null &&
      this.minSalary !== undefined) ||
    (this.maxSalary !== null &&
      this.maxSalary !== undefined)
  ) {
    const min =
      this.minSalary !== null &&
      this.minSalary !== undefined
        ? this.minSalary
        : null;

    const max =
      this.maxSalary !== null &&
      this.maxSalary !== undefined
        ? this.maxSalary
        : null;

    if (min !== null && max !== null) {
      this.salary = `${min} - ${max}`;
    } else if (min !== null) {
      this.salary = `${min}+`;
    } else if (max !== null) {
      this.salary = `${max}`;
    }
  }
});

// ======================================================
// EXPORT
// ======================================================

module.exports = mongoose.model(
  "Job",
  jobSchema
);