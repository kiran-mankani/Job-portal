const otpEmail = ({ otp }) => {
  return `
    <h2>Email Verification OTP</h2>

    <p>Your OTP is:</p>

    <h1>${otp}</h1>

    <p>
      This OTP is valid for a limited time.
    </p>

    <p>
      Please do not share this OTP with anyone.
    </p>

    <p>
      Best regards,<br>
      Recruitment Portal
    </p>
  `;
};

module.exports = otpEmail;