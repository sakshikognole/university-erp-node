/**
 * emailCommunicationController.js
 *
 * Handles the Email Communication module: send a custom email to a
 * confirmed list of recipients using the existing SendGrid integration.
 *
 * Route: POST /api/email-communication/send
 * Auth:  verifyToken + authorizeRole (SUPER_ADMIN, SUB_ADMIN)
 */

const { sendCustomEmail } = require('../utils/email');

// ---------------------------------------------------------------------------
// Constants / limits
// ---------------------------------------------------------------------------
const MAX_RECIPIENTS = 500;          // hard cap per send operation
const MAX_SUBJECT_LENGTH = 255;
const MAX_BODY_LENGTH = 50_000;      // ~50 KB plain text
const BATCH_SIZE = 10;               // concurrent SendGrid calls per batch
const BATCH_DELAY_MS = 200;          // pause between batches (rate-limit safety)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(addr) {
  return typeof addr === 'string' && EMAIL_REGEX.test(addr.trim());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send emails in batches to respect SendGrid rate limits and avoid
 * spawning hundreds of simultaneous HTTP requests.
 *
 * @param {string[]} recipients  Validated, unique email addresses.
 * @param {string}   subject     Validated subject line.
 * @param {string}   body        Validated plain-text body.
 * @returns {{ sent: string[], failed: Array<{email:string, reason:string}> }}
 */
async function sendInBatches(recipients, subject, body) {
  const sent = [];
  const failed = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((email) => sendCustomEmail(email, subject, body))
    );

    results.forEach((result, idx) => {
      const email = batch[idx];
      if (result.status === 'fulfilled') {
        sent.push(email);
      } else {
        const reason =
          result.reason?.response?.body?.errors?.[0]?.message ||
          result.reason?.message ||
          'Unknown delivery error';
        failed.push({ email, reason });
      }
    });

    // Pause between batches (skip after the last one)
    if (i + BATCH_SIZE < recipients.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// POST /api/email-communication/send
// ---------------------------------------------------------------------------
exports.sendEmail = async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;

    // ΓöÇΓöÇ Input validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    // recipients
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required.' });
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return res.status(400).json({
        message: `Recipient list exceeds the maximum of ${MAX_RECIPIENTS} addresses.`,
      });
    }

    // subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ message: 'Subject is required.' });
    }

    const trimmedSubject = subject.trim();
    if (trimmedSubject.length > MAX_SUBJECT_LENGTH) {
      return res.status(400).json({
        message: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
      });
    }

    // body
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ message: 'Message body is required.' });
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length > MAX_BODY_LENGTH) {
      return res.status(400).json({
        message: `Message body must be ${MAX_BODY_LENGTH} characters or fewer.`,
      });
    }

    // ΓöÇΓöÇ Normalise and deduplicate recipients (backend re-validation) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const seen = new Set();
    const validRecipients = [];
    const invalidRecipients = [];

    for (const raw of recipients) {
      if (typeof raw !== 'string') {
        invalidRecipients.push({ email: String(raw), reason: 'Not a string' });
        continue;
      }

      const email = raw.trim().toLowerCase();

      if (!isValidEmail(email)) {
        invalidRecipients.push({ email, reason: 'Invalid email format' });
        continue;
      }

      if (seen.has(email)) {
        // silently deduplicate ΓÇö duplicates from frontend confirmation dialog
        continue;
      }

      seen.add(email);
      validRecipients.push(email);
    }

    if (validRecipients.length === 0) {
      return res.status(400).json({
        message: 'No valid recipient addresses remain after validation.',
        invalidRecipients,
      });
    }

    // ΓöÇΓöÇ Deliver ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const { sent, failed } = await sendInBatches(validRecipients, trimmedSubject, trimmedBody);

    // ΓöÇΓöÇ Response ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const totalRequested = validRecipients.length;
    const sentCount = sent.length;
    const failedCount = failed.length;

    if (sentCount === 0) {
      // Complete failure
      return res.status(502).json({
        message: 'Email delivery failed. No messages were sent.',
        summary: { totalRequested, sent: sentCount, failed: failedCount },
        // Return generic failure info ΓÇö do not leak internal details
        failedRecipients: failed.map((f) => ({ email: f.email, reason: 'Delivery failed' })),
      });
    }

    if (failedCount > 0) {
      // Partial success
      return res.status(207).json({
        message: `Email sent to ${sentCount} of ${totalRequested} recipient(s). ${failedCount} failed.`,
        summary: { totalRequested, sent: sentCount, failed: failedCount },
        sentRecipients: sent,
        failedRecipients: failed.map((f) => ({ email: f.email, reason: 'Delivery failed' })),
      });
    }

    // Full success
    return res.status(200).json({
      message: `Email sent successfully to ${sentCount} recipient(s).`,
      summary: { totalRequested, sent: sentCount, failed: 0 },
    });
  } catch (error) {
    console.error('[EmailComm] sendEmail error:', error.message);
    return res.status(500).json({
      message: 'Server error while sending email. Please try again.',
    });
  }
};
