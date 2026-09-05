const passwordResetEmail = ({ resetLink }) => {
  return `
    <h2>Password Reset Request</h2>

    <p>You requested to reset your password.</p>

    <p>Click the link below to reset your password:</p>

    <p>
      <a href="${resetLink}">Reset Password</a>
    </p>

    <p>
      If you did not request this, please ignore this email.
    </p>

    <p>
      Best regards,<br>
      Recruitment Portal
    </p>
  `;
};

module.exports = passwordResetEmail;