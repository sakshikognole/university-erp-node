const sgMail = require('@sendgrid/mail');

// Expect SENDGRID_API_KEY in environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not set – email sending will fail.');
}
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Sends a simple OTP email.
 * @param {string} to   Destination email address.
 * @param {string} otp  Six‑digit OTP string.
 */
async function sendOtpEmail(to, otp) {
  const msg = {
    to,
    from: 'khushbubaraskar2608@gmail.com', // must be a verified sender in SendGrid
    subject: 'Your One‑Time Password (OTP)',
    text: `Your OTP is ${otp}. It is valid for 15 minutes.`,
  };
  try {
    await sgMail.send(msg);
  } catch (err) {
    console.error('SendGrid email error:', err.response ? err.response.body : err);
    // Propagate error so callers can handle it
    throw err;
  }
}

module.exports = { sendOtpEmail };
