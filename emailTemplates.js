/**
 * Email Template Generator for OTP Emails
 * Generates HTML and plain text email templates matching the admin dashboard theme
 */

/**
 * Generates HTML email template for OTP delivery
 * @param {string} otp - The 6-digit OTP code
 * @param {string} recipientEmail - Optional recipient email for personalization
 * @returns {string} Complete HTML email template with inline CSS
 */
function generateOTPEmailHTML(otp, recipientEmail = '') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your OTP Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #2d2d2d; border-radius: 8px; max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #7ed321; margin: 0; font-size: 28px; font-weight: bold;">
                Campus System
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #ffffff; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                Your verification code is:
              </p>
              
              <!-- OTP Display -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <div style="background-color: #1a1a1a; border: 2px solid #7ed321; border-radius: 8px; padding: 20px; display: inline-block;">
                      <span style="color: #7ed321; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                This code will expire in 5 minutes. Do not share this code with anyone.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #3d3d3d;">
              <p style="color: #a0a0a0; font-size: 12px; margin: 0; line-height: 1.5;">
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates plain text email template for OTP delivery (fallback)
 * @param {string} otp - The 6-digit OTP code
 * @returns {string} Plain text email content
 */
function generateOTPEmailText(otp) {
  return `Campus System - Your OTP Code

Your verification code is: ${otp}

This code will expire in 5 minutes. Do not share this code with anyone.

If you didn't request this code, please ignore this email.`;
}

module.exports = {
  generateOTPEmailHTML,
  generateOTPEmailText
};
