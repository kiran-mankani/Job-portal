const nodemailer = require("nodemailer");

const applicationEmail = require("./emails/applicationEmail");
const interviewEmail = require("./emails/interviewEmail");
const passwordResetEmail = require("./emails/passwordResetEmail");
const otpEmail = require("./emails/otpEmail");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Application Email
const sendApplicationEmail = async ({
  to,
  candidateName,
  jobTitle,
  companyName,
}) => {
  const html = applicationEmail({
    candidateName,
    jobTitle,
    companyName,
  });

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Application Submitted",
    html,
  });
};

// Interview Email
const sendInterviewEmail = async ({
  to,
  candidateName,
  jobTitle,
  interviewDate,
  interviewTime,
}) => {
  const html = interviewEmail({
    candidateName,
    jobTitle,
    interviewDate,
    interviewTime,
  });

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Interview Scheduled",
    html,
  });
};

// Password Reset Email
const sendPasswordResetEmail = async ({ to, resetLink }) => {
  const html = passwordResetEmail({
    resetLink,
  });

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Password Reset",
    html,
  });
};

// OTP Email
const sendOtpEmail = async ({ to, otp }) => {
  const html = otpEmail({
    otp,
  });

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your OTP Code",
    html,
  });
};

module.exports = {
  sendApplicationEmail,
  sendInterviewEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
};