const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==========================================
// Send Application Email
// ==========================================

const sendApplicationEmail = async ({
  to,
  candidateName,
  jobTitle,
  companyName,
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: "Application Submitted Successfully",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Application Submitted Successfully</h2>

          <p>Hello <strong>${candidateName}</strong>,</p>

          <p>
            Your application has been successfully submitted.
          </p>

          <p>
            <strong>Job:</strong> ${jobTitle}
          </p>

          <p>
            <strong>Company:</strong> ${companyName}
          </p>

          <p>
            We will notify you when there is an update
            regarding your application.
          </p>

          <br />

          <p>Thank you for using our Job Portal.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Application Email Sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Application Email Error:", error);
    throw error;
  }
};
// ==========================================
// Send Interview Email
// ==========================================

const sendInterviewEmail = async ({
  to,
  candidateName,
  jobTitle,
  interviewDate,
  interviewTime,
  interviewType,
  interviewLink,
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: "Interview Scheduled",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Interview Scheduled</h2>

          <p>Hello <strong>${candidateName}</strong>,</p>

          <p>
            Your interview has been successfully scheduled.
          </p>

          <p>
            <strong>Job:</strong> ${jobTitle}
          </p>

          <p>
            <strong>Date:</strong> ${interviewDate}
          </p>

          <p>
            <strong>Time:</strong> ${interviewTime}
          </p>

          <p>
            <strong>Interview Type:</strong> ${interviewType}
          </p>

          ${
            interviewLink
              ? `
                <p>
                  <strong>Interview Link:</strong>
                  <a href="${interviewLink}">
                    Join Interview
                  </a>
                </p>
              `
              : ""
          }

          <br />

          <p>
            Please make sure you are available at the scheduled
            date and time.
          </p>

          <p>Thank you for using our Job Portal.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Interview Email Sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Interview Email Error:", error);
    throw error;
  }
};
// ==========================================
// Send Password Reset Email
// ==========================================

const sendPasswordResetEmail = async ({
  to,
  name,
  resetLink,
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>

          <p>Hello <strong>${name}</strong>,</p>

          <p>
            We received a request to reset your password.
          </p>

          <p>
            Click the button below to reset your password:
          </p>

          <div style="margin: 25px 0;">
            <a
              href="${resetLink}"
              style="
                background-color: #007bff;
                color: white;
                padding: 12px 20px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
              "
            >
              Reset Password
            </a>
          </div>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

          <p>
            For security reasons, this link should only be
            used by you.
          </p>

          <br />

          <p>Thank you for using our Job Portal.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
      "Password Reset Email Sent:",
      info.messageId
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Password Reset Email Error:", error);
    throw error;
  }
};

// ==========================================
// Send OTP Email
// ==========================================

const sendOtpEmail = async ({
  to,
  name,
  otp,
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: "Your OTP Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OTP Verification</h2>

          <p>Hello <strong>${name}</strong>,</p>

          <p>
            Your OTP verification code is:
          </p>

          <div
            style="
              background: #f2f2f2;
              padding: 15px;
              text-align: center;
              font-size: 30px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 20px 0;
            "
          >
            ${otp}
          </div>

          <p>
            This OTP is valid for a limited time.
          </p>

          <p>
            Do not share this OTP with anyone.
          </p>

          <br />

          <p>
            Thank you for using our Job Portal.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("OTP Email Sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("OTP Email Error:", error);
    throw error;
  }
};

module.exports = {
  sendApplicationEmail,
   sendInterviewEmail,
     sendPasswordResetEmail,
       sendOtpEmail,
};