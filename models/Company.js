
const mongoose = require("mongoose");

// ==========================================
// COMPANY SCHEMA
// ==========================================

const companySchema = new mongoose.Schema(
  {
    // ==========================================
    // COMPANY BASIC INFORMATION
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },

    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    website: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    logo: {
      type: String,
      default: "",
      trim: true,
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

companySchema.index({
  name: 1,
});

// ==========================================
// PRE-SAVE NORMALIZATION
// ==========================================

companySchema.pre("save", function () {
  if (this.isModified("name") && this.name) {
    this.name = this.name.trim();
  }

  if (
    this.isModified("description") &&
    this.description !== undefined
  ) {
    this.description = String(
      this.description
    ).trim();
  }

  if (
    this.isModified("location") &&
    this.location !== undefined
  ) {
    this.location = String(
      this.location
    ).trim();
  }

  if (
    this.isModified("website") &&
    this.website !== undefined
  ) {
    this.website = String(
      this.website
    ).trim();
  }

  if (
    this.isModified("logo") &&
    this.logo !== undefined
  ) {
    this.logo = String(
      this.logo
    ).trim();
  }
});

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model(
  "Company",
  companySchema
);

