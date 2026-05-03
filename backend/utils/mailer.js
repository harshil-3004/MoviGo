const nodemailer = require('nodemailer');
// Create reusable transporter — Switching to Port 465 (Direct SSL)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use Direct SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  debug: true,
  logger: true,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});
// Verify connection configuration immediately
console.log('📬 Starting Mailer Verification (Port 465)...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Mailer Connection Error Details:', error);
  } else {
    console.log('✅ Mailer ready for production (Port 465)');
  }
});
// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
// Build premium HTML email template
const buildOtpEmail = (otp, purpose, userName = '') => {
  const isReset = purpose === 'reset';
  const title = isReset ? 'Password Reset Request' : 'Verify Your Email';
  const subtitle = isReset
    ? 'Use the code below to reset your password. If you didn\'t request this, you can safely ignore this email.'
    : 'Welcome to MoviGo! Use the code below to complete your registration.';
  const accentColor = isReset ? '#8b5cf6' : '#f43f5e';
  const greeting = userName ? `Hey ${userName},` : 'Hey there,';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — MoviGo</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0c10;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0c10;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(135deg,#14161a 0%,#1a1d24 100%);border-radius:24px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          
          <!-- Header with gradient accent -->
          <tr>
            <td style="background:linear-gradient(135deg,${accentColor}22 0%,transparent 100%);padding:40px 40px 20px 40px;text-align:center;position:relative;">
              <div style="width:100%;height:3px;background:linear-gradient(90deg,transparent,${accentColor},transparent);margin-bottom:30px;border-radius:2px;"></div>
              <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                <span style="color:#ffffff;">Movi</span><span style="color:${accentColor};">Go</span>
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">${isReset ? 'Security Protocol' : 'Identity Verification'}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:30px 40px;">
              <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 6px;">${greeting}</p>
              <h2 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 12px;letter-spacing:-0.3px;">${title}</h2>
              <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 30px;">${subtitle}</p>
            </td>
          </tr>
          <!-- OTP Code Block -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:30px;text-align:center;">
                    <p style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:800;margin:0 0 16px;">Your Verification Code</p>
                    <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:${accentColor};font-family:'Courier New',monospace;text-shadow:0 0 30px ${accentColor}44;margin:0;">${otp}</div>
                    <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:16px 0 0;font-style:italic;">This code expires in <strong style="color:rgba(255,255,255,0.5);">5 minutes</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Security Notice -->
          <tr>
            <td style="padding:30px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;padding-right:12px;">
                          <div style="width:32px;height:32px;background:${accentColor}15;border:1px solid ${accentColor}30;border-radius:10px;text-align:center;line-height:32px;font-size:14px;">🔒</div>
                        </td>
                        <td style="vertical-align:top;">
                          <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:0;">
                            Never share this code with anyone. MoviGo staff will never ask you for this code via phone or message.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;line-height:1.8;">
                This email was sent by <strong style="color:rgba(255,255,255,0.35);">MoviGo</strong><br>
                If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
// Send OTP email
const sendOtpEmail = async (email, otp, purpose, userName = '') => {
  const isReset = purpose === 'reset';
  const subject = isReset
    ? '🔐 MoviGo — Password Reset Code'
    : '🎬 MoviGo — Verify Your Email';
  const mailOptions = {
    from: `"MoviGo" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: buildOtpEmail(otp, purpose, userName)
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error);
    throw error;
  }
};
module.exports = { generateOTP, sendOtpEmail };
