const applicationEmail = ({ candidateName, jobTitle, companyName }) => {
  return `
    <h2>Application Submitted Successfully</h2>

    <p>Hello ${candidateName},</p>

    <p>
      Your application for <strong>${jobTitle}</strong>
      at <strong>${companyName}</strong> has been submitted successfully.
    </p>

    <p>We will notify you when there is an update.</p>

    <p>
      Best regards,<br>
      Recruitment Portal
    </p>
  `;
};

module.exports = applicationEmail;