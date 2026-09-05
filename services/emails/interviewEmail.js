const interviewEmail = ({
  candidateName,
  jobTitle,
  interviewDate,
  interviewTime,
}) => {
  return `
    <h2>Interview Scheduled</h2>

    <p>Hello ${candidateName},</p>

    <p>
      Your interview for <strong>${jobTitle}</strong> has been scheduled.
    </p>

    <p>
      <strong>Date:</strong> ${interviewDate}<br>
      <strong>Time:</strong> ${interviewTime}
    </p>

    <p>
      Please make sure you are available at the scheduled time.
    </p>

    <p>
      Best regards,<br>
      Recruitment Portal
    </p>
  `;
};

module.exports = interviewEmail;