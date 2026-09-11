
const mongoose = require("mongoose");

// ==========================================
// USER SCHEMA
// ==========================================

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC ACCOUNT INFORMATION
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    // ==========================================
    // ROLE & ACCOUNT STATUS
    // ==========================================

    role: {
      type: String,
      enum: ["candidate", "recruiter", "admin"],
      default: "candidate",
      index: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // COMPANY REFERENCE
    // ==========================================
    // Company information is stored in the
    // separate Company collection.
    //
    // User only stores the Company ObjectId.
    // ==========================================

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    // ==========================================
    // PROFILE INFORMATION
    // ==========================================

    profile: {
      profileImage: {
        type: String,
        default: "",
        trim: true,
      },

      bio: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },

      location: {
        type: String,
        default: "",
        trim: true,
        maxlength: 200,
      },

      headline: {
        type: String,
        default: "",
        trim: true,
        maxlength: 200,
      },

      skills: {
        type: [String],
        default: [],
      },

      education: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },

      experience: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },

      // Keep ONE CV/resume field.
      resume: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // ==========================================
    // CANDIDATE DASHBOARD DATA
    // ==========================================

    profileViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],

    // ==========================================
    // ACCOUNT SETTINGS
    // ==========================================

    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },

      applicationUpdates: {
        type: Boolean,
        default: true,
      },

      interviewReminders: {
        type: Boolean,
        default: true,
      },

      jobAlerts: {
        type: Boolean,
        default: true,
      },

      messageNotifications: {
        type: Boolean,
        default: true,
      },

      profileVisibility: {
        type: Boolean,
        default: true,
      },
    },

    // ==========================================
    // PASSWORD RESET / OTP
    // ==========================================

    resetPasswordOTP: {
      type: String,
      default: null,
    },

    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ==========================================
// INDEXES
// ==========================================

userSchema.index({
  role: 1,
  isBlocked: 1,
});

userSchema.index({
  role: 1,
  isActive: 1,
});

userSchema.index({
  companyId: 1,
  role: 1,
});

// ==========================================
// PRE-SAVE NORMALIZATION
// ==========================================

userSchema.pre("save", function () {
  // ----------------------------------------
  // Name
  // ----------------------------------------

  if (this.isModified("name") && this.name) {
    this.name = this.name.trim();
  }

  // ----------------------------------------
  // Email
  // ----------------------------------------

  if (this.isModified("email") && this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  // ----------------------------------------
  // Phone
  // ----------------------------------------

  if (this.isModified("phone") && this.phone) {
    this.phone = this.phone.trim();
  }

  // ----------------------------------------
  // Profile
  // ----------------------------------------

  if (this.profile !== undefined) {
    // --------------------------------------
    // Skills
    // --------------------------------------

    if (Array.isArray(this.profile.skills)) {
      this.profile.skills = [
        ...new Set(
          this.profile.skills
            .map((skill) =>
              typeof skill === "string"
                ? skill.trim()
                : ""
            )
            .filter(Boolean)
        ),
      ];
    }

    // --------------------------------------
    // Location
    // --------------------------------------

    if (this.profile.location !== undefined) {
      this.profile.location = String(
        this.profile.location
      ).trim();
    }

    // --------------------------------------
    // Headline
    // --------------------------------------

    if (this.profile.headline !== undefined) {
      this.profile.headline = String(
        this.profile.headline
      ).trim();
    }

    // --------------------------------------
    // Bio
    // --------------------------------------

    if (this.profile.bio !== undefined) {
      this.profile.bio = String(
        this.profile.bio
      ).trim();
    }

    // --------------------------------------
    // Education
    // --------------------------------------

    if (this.profile.education !== undefined) {
      this.profile.education = String(
        this.profile.education
      ).trim();
    }

    // --------------------------------------
    // Experience
    // --------------------------------------

    if (this.profile.experience !== undefined) {
      this.profile.experience = String(
        this.profile.experience
      ).trim();
    }

    // --------------------------------------
    // Resume
    // --------------------------------------

    if (this.profile.resume !== undefined) {
      this.profile.resume = String(
        this.profile.resume
      ).trim();
    }

    // --------------------------------------
    // Profile Image
    // --------------------------------------

    if (this.profile.profileImage !== undefined) {
      this.profile.profileImage = String(
        this.profile.profileImage
      ).trim();
    }
  }

  // ----------------------------------------
  // Settings
  // ----------------------------------------

  if (this.settings !== undefined) {
    this.settings = {
      emailNotifications:
        this.settings.emailNotifications !== false,

      applicationUpdates:
        this.settings.applicationUpdates !== false,

      interviewReminders:
        this.settings.interviewReminders !== false,

      jobAlerts:
        this.settings.jobAlerts !== false,

      messageNotifications:
        this.settings.messageNotifications !== false,

      profileVisibility:
        this.settings.profileVisibility !== false,
    };
  }
});

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model(
  "User",
  userSchema
);

