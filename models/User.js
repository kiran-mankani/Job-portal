const mongoose = require("mongoose");

// User schema defines what information we will store for candidates/recruiters
const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: true,
      trim: true,
    },
    

    // User's email address
    // unique: true prevents duplicate email registration
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password will be stored as a bcrypt hash, NOT plain text
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // User's phone number
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // For this API we will register candidates
    // Later the same User model will support recruiters/admins
role: {
  type: String,
  enum: ["candidate", "recruiter", "admin"],
  default: "candidate",
},

// User block/unblock status
isBlocked: {
  type: Boolean,
  default: false,
},

// Stores the OTP used for password reset
resetPasswordOTP: {
  type: String,
  default: null,
},

// Stores when the OTP will expire
resetPasswordOTPExpires: {
  type: Date,
  default: null,
},

// Stores when the OTP will expire
resetPasswordOTPExpires: {
  type: Date,
  default: null,
},
  },
  {
    // Automatically creates createdAt and updatedAt
    timestamps: true,
  }
);

// Export User model so controllers can use it
module.exports = mongoose.model("User", userSchema);