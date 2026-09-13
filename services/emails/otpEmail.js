const otpEmail = ({ otp }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset OTP</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f7fb;
        font-family: Arial, Helvetica, sans-serif;
      ">
        <div style="
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          padding: 35px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        ">

          <h2 style="
            margin-top: 0;
            color: #1f2937;
            text-align: center;
          ">
            Password Reset OTP
          </h2>

          <p style="
            color: #4b5563;
            font-size: 16px;
            line-height: 1.6;
          ">
            We received a request to reset your Job Portal account password.
          </p>

          <p style="
            color: #4b5563;
            font-size: 16px;
            line-height: 1.6;
          ">
            Use the OTP below to continue:
          </p>

          <div style="
            margin: 30px 0;
            text-align: center;
          ">
            <span style="
              display: inline-block;
              background-color: #eef2ff;
              color: #3730a3;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 15px 25px;
              border-radius: 10px;
            ">
              ${otp}
            </span>
          </div>

          <p style="
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
          ">
            This OTP is valid for <strong>10 minutes</strong>.
          </p>

          <p style="
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
          ">
            If you did not request a password reset, you can safely ignore
            this email.
          </p>

          <hr style="
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 30px 0;
          " />

          <p style="
            margin-bottom: 0;
            color: #9ca3af;
            font-size: 12px;
            text-align: center;
          ">
            © Job Portal. All rights reserved.
          </p>

        </div>
      </body>
    </html>
  `;
};

module.exports = otpEmail;