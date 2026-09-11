const mongoose = require("mongoose");

const interviewSchema =
  new mongoose.Schema(
    {
      // ==========================================
      // APPLICATION
      // ==========================================

      application: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Application",
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
      // RECRUITER
      // ==========================================

      recruiter: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      // ==========================================
      // INTERVIEW DATE / TIME
      // ==========================================

      date: {
        type: Date,
        required: true,
        index: true,
      },

      // ==========================================
      // DURATION IN MINUTES
      // ==========================================

      duration: {
        type: Number,
        default: 30,
        min: 15,
        max: 480,
      },

      // ==========================================
      // INTERVIEW MODE
      // ==========================================

      mode: {
        type: String,
        enum: [
          "online",
          "offline",
        ],
        required: true,
        lowercase: true,
        trim: true,
        index: true,
      },

      // ==========================================
      // ONLINE INTERVIEW LINK
      // ==========================================

      meetingLink: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },

      // ==========================================
      // OFFLINE INTERVIEW LOCATION
      // ==========================================

      location: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },

      // ==========================================
      // INTERVIEW NOTES
      // ==========================================

      notes: {
        type: String,
        default: "",
        trim: true,
        maxlength: 3000,
      },

      // ==========================================
      // INTERVIEW STATUS
      // ==========================================

      status: {
        type: String,
        enum: [
          "scheduled",
          "completed",
          "cancelled",
        ],
        default: "scheduled",
        lowercase: true,
        trim: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// ==========================================
// INDEXES FOR DASHBOARDS / LISTINGS
// ==========================================

interviewSchema.index({
  candidate: 1,
  status: 1,
  date: 1,
});

interviewSchema.index({
  recruiter: 1,
  status: 1,
  date: 1,
});

interviewSchema.index({
  application: 1,
  status: 1,
});

// ==========================================
// PRE-SAVE NORMALIZATION
// ==========================================

interviewSchema.pre(
  "save",
  function (next) {
    if (
      this.mode
    ) {
      this.mode =
        String(
          this.mode
        )
          .trim()
          .toLowerCase();
    }

    if (
      this.status
    ) {
      this.status =
        String(
          this.status
        )
          .trim()
          .toLowerCase();
    }

    if (
      this.meetingLink !==
      undefined
    ) {
      this.meetingLink =
        String(
          this.meetingLink
        ).trim();
    }

    if (
      this.location !==
      undefined
    ) {
      this.location =
        String(
          this.location
        ).trim();
    }

    if (
      this.notes !==
      undefined
    ) {
      this.notes =
        String(
          this.notes
        ).trim();
    }

    next();
  }
);

// ==========================================
// EXPORT
// ==========================================

module.exports =
  mongoose.model(
    "Interview",
    interviewSchema
  );