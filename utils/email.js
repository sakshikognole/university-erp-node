const sgMail = require('@sendgrid/mail');

// Expect SENDGRID_API_KEY in environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not set – email sending will fail.');
}
sgMail.setApiKey(SENDGRID_API_KEY);

// The verified sender identity used across all outbound emails.
// Must be verified in SendGrid — do not change without updating the SendGrid account.
const SENDER_EMAIL = 'khushbubaraskar2608@gmail.com';

/**
 * Sends a simple OTP email.
 * @param {string} to   Destination email address.
 * @param {string} otp  Six‑digit OTP string.
 */
async function sendOtpEmail(to, otp) {
  const msg = {
    to,
    from: SENDER_EMAIL, // must be a verified sender in SendGrid
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

/**
 * Sends a custom email to a single recipient.
 * Used by the Email Communication module.
 *
 * @param {string} to          Recipient email address.
 * @param {string} subject     Email subject line (user-supplied, already validated).
 * @param {string} textBody    Plain-text body (user-supplied, already validated).
 * @returns {Promise<void>}    Resolves on success, throws on SendGrid failure.
 */
async function sendCustomEmail(to, subject, textBody) {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured. Email delivery is unavailable.');
  }

  // Build a simple HTML version — escape user content so it cannot inject markup.
  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const escapedBody = escapeHtml(textBody);
  // Preserve newlines as <br> tags in the HTML version.
  const htmlBody = escapedBody.replace(/\n/g, '<br>');

  const msg = {
    to,
    from: SENDER_EMAIL,
    subject,
    text: textBody,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6;">${htmlBody}</div>`,
  };

  try {
    await sgMail.send(msg);
  } catch (err) {
    console.error(
      `SendGrid custom email error (to: ${to}):`,
      err.response ? err.response.body : err.message
    );
    throw err;
  }
}

module.exports = { sendOtpEmail, sendCustomEmail };
