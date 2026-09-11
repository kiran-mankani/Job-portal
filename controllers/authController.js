
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Company = require("../models/Company");

const cloudinary = require("../config/cloudinary");

const { sendOtpEmail } = require("../services/emailService");

// ==========================================
// SAFE USER RESPONSE
// Never return password or sensitive OTP data
// ==========================================

const createSafeUser = (user) => {
  if (!user) return null;

  const userObject =
    typeof user.toObject === "function"
      ? user.toObject()
      : { ...user };

  delete userObject.password;
  delete userObject.resetPasswordOTP;
  delete userObject.resetPasswordOTPExpires;

  return userObject;
};

// ==========================================
// CREATE JWT TOKEN
// ==========================================

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ==========================================
// CLOUDINARY BUFFER UPLOAD
// ==========================================

const uploadBufferToCloudinary = (
  buffer,
  options = {}
) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    uploadStream.end(buffer);
  });
};

// ==========================================
// SAFE ORIGINAL FILENAME
// ==========================================

const getSafeOriginalFilename = (filename) => {
  if (
    !filename ||
    typeof filename !== "string"
  ) {
    return "CV.pdf";
  }

  const cleaned = filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim();

  return cleaned || "CV.pdf";
};

// ==========================================
// ENCODE ORIGINAL FILENAME
// ==========================================

const encodeOriginalFilename = (filename) => {
  return Buffer.from(
    getSafeOriginalFilename(filename),
    "utf8"
  ).toString("base64url");
};

// ==========================================
// DECODE ORIGINAL FILENAME
// ==========================================

const getOriginalFilenameFromPublicId = (
  publicId
) => {
  if (
    !publicId ||
    typeof publicId !== "string"
  ) {
    return null;
  }

  const lastPart = publicId
    .split("/")
    .pop();

  if (!lastPart) {
    return null;
  }

  const separatorIndex =
    lastPart.lastIndexOf("__");

  if (separatorIndex === -1) {
    return null;
  }

  const encodedName = lastPart.slice(
    separatorIndex + 2
  );

  if (!encodedName) {
    return null;
  }

  try {
    const decoded = Buffer.from(
      encodedName,
      "base64url"
    ).toString("utf8");

    return getSafeOriginalFilename(decoded);
  } catch (error) {
    return null;
  }
};

// ==========================================
// GET CLOUDINARY PUBLIC ID FROM URL
// ==========================================

const getCloudinaryPublicIdFromUrl = (
  url
) => {
  if (
    !url ||
    typeof url !== "string"
  ) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    const pathParts = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    const uploadIndex =
      pathParts.indexOf("upload");

    if (uploadIndex === -1) {
      return null;
    }

    let publicIdParts = pathParts.slice(
      uploadIndex + 1
    );

    // Remove transformation segments
    while (
      publicIdParts.length > 0 &&
      !/^v\d+$/.test(publicIdParts[0])
    ) {
      const firstPart = publicIdParts[0];

      if (
        firstPart.includes(",") ||
        firstPart.includes("_")
      ) {
        publicIdParts.shift();
        continue;
      }

      break;
    }

    // Remove version
    if (
      publicIdParts.length > 0 &&
      /^v\d+$/.test(publicIdParts[0])
    ) {
      publicIdParts.shift();
    }

    if (publicIdParts.length === 0) {
      return null;
    }

    const publicIdWithExtension =
      publicIdParts.join("/");

    return publicIdWithExtension.replace(
      /\.[^/.]+$/,
      ""
    );
  } catch (error) {
    return null;
  }
};

// ==========================================
// RFC 5987 FILENAME ENCODING
// ==========================================

const encodeRFC5987ValueChars = (
  value
) => {
  return encodeURIComponent(value)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
};

// ==========================================
// CREATE COMPANY
// ==========================================

const createCompany = async ({
  name,
  description = "",
  website = "",
  logo = "",
  location = "",
}) => {
  if (
    !name ||
    !String(name).trim()
  ) {
    return null;
  }

  const company = await Company.create({
    name: String(name).trim(),
    description: description
      ? String(description).trim()
      : "",
    website: website
      ? String(website).trim()
      : "",
    logo: logo
      ? String(logo).trim()
      : "",
    location: location
      ? String(location).trim()
      : "",
  });

  return company;
};

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and phone are required",
      });
    }

    if (
      String(password).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    // ==========================================
    // HASH PASSWORD BEFORE SAVING
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        10
      );

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: String(phone).trim(),
      role:
        role === "recruiter"
          ? "recruiter"
          : "candidate",
    });

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message:
        "Registration successful",
      token,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during registration",
    });
  }
};

// ==========================================
// REGISTER RECRUITER
// ==========================================

const registerRecruiter = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      password,
      phone,

      // Company information comes from
      // request, but is stored in Company
      // collection instead of User.
      company,
      companyDescription,
      companyWebsite,
      companyLogo,
      companyLocation,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !company
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, phone and company are required",
      });
    }

    if (
      String(password).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    // ==========================================
    // CREATE COMPANY FIRST
    // ==========================================

    const companyDocument =
      await createCompany({
        name: company,
        description:
          companyDescription,
        website:
          companyWebsite,
        logo: companyLogo,
        location:
          companyLocation,
      });

    if (!companyDocument) {
      return res.status(400).json({
        success: false,
        message:
          "Valid company information is required",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        10
      );

    // ==========================================
    // CREATE RECRUITER USER
    // ONLY companyId IS STORED IN USER
    // ==========================================

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: String(phone).trim(),
      role: "recruiter",
      companyId: companyDocument._id,
    });

    // Populate company for response
    await user.populate("companyId");

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message:
        "Recruiter registration successful",
      token,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Recruiter Registration Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during recruiter registration",
    });
  }
};

// ==========================================
// LOGIN USER
// ==========================================

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    // password has select:false
    // so explicitly include it.
    const user =
      await User.findOne({
        email: normalizedEmail,
      })
        .select("+password")
        .populate("companyId");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
      });
    }

    // ==========================================
    // COMPARE PLAIN PASSWORD WITH HASH
    // ==========================================

    const isPasswordCorrect =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during login",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    const otp = Math.floor(
      100000 +
        Math.random() * 900000
    ).toString();

    user.resetPasswordOTP = otp;

    user.resetPasswordOTPExpires =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );

    await user.save();

    await sendOtpEmail(
      user.email,
      otp
    );

    return res.status(200).json({
      success: true,
      message:
        "Password reset OTP sent to your email",
    });
  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while processing password reset",
    });
  }
};

// ==========================================
// RESEND OTP
// ==========================================

const resendOTP = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    const otp = Math.floor(
      100000 +
        Math.random() * 900000
    ).toString();

    user.resetPasswordOTP = otp;

    user.resetPasswordOTPExpires =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );

    await user.save();

    await sendOtpEmail(
      user.email,
      otp
    );

    return res.status(200).json({
      success: true,
      message:
        "A new OTP has been sent to your email",
    });
  } catch (error) {
    console.error(
      "Resend OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resending OTP",
    });
  }
};

// ==========================================
// VERIFY OTP
// ==========================================

const verifyOTP = async (
  req,
  res
) => {
  try {
    const {
      email,
      otp,
    } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    if (
      !user.resetPasswordOTP ||
      !user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid OTP request found",
      });
    }

    if (
      new Date() >
      user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP has expired",
      });
    }

    if (
      String(
        user.resetPasswordOTP
      ) !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid OTP",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",
    });
  } catch (error) {
    console.error(
      "Verify OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while verifying OTP",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (
      !email ||
      !otp ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP and new password are required",
      });
    }

    if (
      String(newPassword).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    if (
      !user.resetPasswordOTP ||
      !user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid OTP request found",
      });
    }

    if (
      new Date() >
      user.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP has expired",
      });
    }

    if (
      String(
        user.resetPasswordOTP
      ) !== String(otp).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid OTP",
      });
    }

    // ==========================================
    // HASH NEW PASSWORD
    // ==========================================

    user.password =
      await bcrypt.hash(
        String(newPassword),
        10
      );

    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

const getCurrentUser = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user._id
      ).populate("companyId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Get Current User Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching current user",
    });
  }
};

// ==========================================
// UPDATE PROFILE
// ==========================================

const updateProfile = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      name,
      email,
      phone,
      profile,

      // Company fields are accepted
      // for updating the Company document.
      company,
      companyDescription,
      companyWebsite,
      companyLogo,
      companyLocation,
      companyId,
    } = req.body;

    // ==========================================
    // BASIC USER INFORMATION
    // ==========================================

    if (name !== undefined) {
      user.name =
        String(name).trim();
    }

    if (email !== undefined) {
      user.email =
        String(email)
          .trim()
          .toLowerCase();
    }

    if (phone !== undefined) {
      user.phone =
        String(phone).trim();
    }

    // ==========================================
    // PROFILE
    // ==========================================

    if (profile !== undefined) {
      user.profile = {
        ...(user.profile?.toObject?.() ||
          user.profile ||
          {}),
        ...profile,
      };
    }

    // ==========================================
    // COMPANY
    // ==========================================
    // User stores ONLY companyId.
    // Company details are stored separately.
    // ==========================================

    const hasCompanyData =
      company !== undefined ||
      companyDescription !== undefined ||
      companyWebsite !== undefined ||
      companyLogo !== undefined ||
      companyLocation !== undefined;

    if (companyId !== undefined) {
      if (
        companyId === null ||
        companyId === ""
      ) {
        user.companyId = null;
      } else {
        const companyDocument =
          await Company.findById(
            companyId
          );

        if (!companyDocument) {
          return res.status(404).json({
            success: false,
            message:
              "Company not found",
          });
        }

        user.companyId =
          companyDocument._id;
      }
    }

    if (hasCompanyData) {
      let companyDocument = null;

      if (user.companyId) {
        companyDocument =
          await Company.findById(
            user.companyId
          );
      }

      // If recruiter doesn't have a company yet,
      // create one.
      if (!companyDocument) {
        if (
          !company ||
          !String(company).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Company name is required",
          });
        }

        companyDocument =
          await createCompany({
            name: company,
            description:
              companyDescription,
            website:
              companyWebsite,
            logo:
              companyLogo,
            location:
              companyLocation,
          });

        user.companyId =
          companyDocument._id;
      } else {
        // Update existing company.
        if (company !== undefined) {
          companyDocument.name =
            String(company).trim();
        }

        if (
          companyDescription !==
          undefined
        ) {
          companyDocument.description =
            String(
              companyDescription
            ).trim();
        }

        if (
          companyWebsite !==
          undefined
        ) {
          companyDocument.website =
            String(
              companyWebsite
            ).trim();
        }

        if (
          companyLogo !==
          undefined
        ) {
          companyDocument.logo =
            String(
              companyLogo
            ).trim();
        }

        if (
          companyLocation !==
          undefined
        ) {
          companyDocument.location =
            String(
              companyLocation
            ).trim();
        }

        await companyDocument.save();
      }
    }

    await user.save();

    // Populate company for response.
    await user.populate(
      "companyId"
    );

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating profile",
    });
  }
};

// ==========================================
// UPLOAD RESUME / CV
// ==========================================

const uploadResume = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a CV file",
      });
    }

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const originalFilename =
      getSafeOriginalFilename(
        req.file.originalname
      );

    const encodedFilename =
      encodeOriginalFilename(
        originalFilename
      );

    const publicId =
      `resumes/${user._id}__${encodedFilename}`;

    const uploadResult =
      await uploadBufferToCloudinary(
        req.file.buffer,
        {
          resource_type: "raw",
          public_id: publicId,
          overwrite: true,
        }
      );

    user.profile.resume =
      uploadResult.secure_url;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "CV uploaded successfully",
      resume:
        uploadResult.secure_url,
      originalFilename,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Upload Resume Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while uploading CV",
    });
  }
};

// ==========================================
// DOWNLOAD RESUME / CV
// ==========================================

const downloadResume = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const resumeUrl =
      user.profile?.resume;

    if (!resumeUrl) {
      return res.status(404).json({
        success: false,
        message:
          "No CV found for this user",
      });
    }

    let filename = "CV.pdf";

    const publicId =
      getCloudinaryPublicIdFromUrl(
        resumeUrl
      );

    if (publicId) {
      const originalFilename =
        getOriginalFilenameFromPublicId(
          publicId
        );

      if (originalFilename) {
        filename =
          originalFilename;
      }
    }

    const encodedFilename =
      encodeRFC5987ValueChars(
        filename
      );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(
        /"/g,
        ""
      )}"; filename*=UTF-8''${encodedFilename}`
    );

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    return res.redirect(
      resumeUrl
    );
  } catch (error) {
    console.error(
      "Download Resume Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while downloading CV",
    });
  }
};

// ==========================================
// UPLOAD PROFILE IMAGE
// ==========================================

const uploadProfileImage = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a profile image",
      });
    }

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const uploadResult =
      await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder:
            "profile-images",
          public_id:
            `user_${user._id}`,
          overwrite: true,
          resource_type: "image",
        }
      );

    user.profile.profileImage =
      uploadResult.secure_url;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Profile image uploaded successfully",
      profileImage:
        uploadResult.secure_url,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Upload Profile Image Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while uploading profile image",
    });
  }
};

// ==========================================
// CHANGE PASSWORD
// ==========================================

const changePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required",
      });
    }

    if (
      String(newPassword).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    const user =
      await User.findById(
        req.user._id
      ).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordCorrect =
      await bcrypt.compare(
        String(currentPassword),
        user.password
      );

    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect",
      });
    }

    user.password =
      await bcrypt.hash(
        String(newPassword),
        10
      );

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "Change Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while changing password",
    });
  }
};

// ==========================================
// CONVERT CANDIDATE TO RECRUITER
// ==========================================

const convertToRecruiter = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      company,
      companyDescription,
      companyWebsite,
      companyLogo,
      companyLocation,
    } = req.body;

    user.role = "recruiter";

    // ==========================================
    // EXISTING COMPANY
    // ==========================================

    if (user.companyId) {
      const companyDocument =
        await Company.findById(
          user.companyId
        );

      if (companyDocument) {
        if (company !== undefined) {
          companyDocument.name =
            String(company).trim();
        }

        if (
          companyDescription !==
          undefined
        ) {
          companyDocument.description =
            String(
              companyDescription
            ).trim();
        }

        if (
          companyWebsite !==
          undefined
        ) {
          companyDocument.website =
            String(
              companyWebsite
            ).trim();
        }

        if (
          companyLogo !==
          undefined
        ) {
          companyDocument.logo =
            String(
              companyLogo
            ).trim();
        }

        if (
          companyLocation !==
          undefined
        ) {
          companyDocument.location =
            String(
              companyLocation
            ).trim();
        }

        await companyDocument.save();
      }
    }

    // ==========================================
    // CREATE COMPANY IF NEEDED
    // ==========================================

    if (
      !user.companyId &&
      company &&
      String(company).trim()
    ) {
      const companyDocument =
        await createCompany({
          name: company,
          description:
            companyDescription,
          website:
            companyWebsite,
          logo:
            companyLogo,
          location:
            companyLocation,
        });

      user.companyId =
        companyDocument._id;
    }

    await user.save();

    await user.populate(
      "companyId"
    );

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message:
        "Account converted to recruiter successfully",
      token,
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error(
      "Convert To Recruiter Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while converting account",
    });
  }
};

// ==========================================
// LOGOUT USER
// ==========================================

const logoutUser = async (
  req,
  res
) => {
  try {
    return res.status(200).json({
      success: true,
      message:
        "Logout successful",
    });
  } catch (error) {
    console.error(
      "Logout Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during logout",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  registerUser,
  registerRecruiter,
  loginUser,
  forgotPassword,
  resendOTP,
  verifyOTP,
  resetPassword,
  getCurrentUser,
  updateProfile,
  uploadResume,
  downloadResume,
  uploadProfileImage,
  changePassword,
  convertToRecruiter,
  logoutUser,
};

