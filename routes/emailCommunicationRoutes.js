/**
 * emailCommunicationRoutes.js
 *
 * Mounts at: /api/email-communication
 *
 * All routes require:
 *  1. verifyToken  ΓÇö valid Bearer JWT
 *  2. authorizeRole ΓÇö SUPER_ADMIN or SUB_ADMIN
 *     (SUPER_ADMIN always passes through authorizeRole regardless of listed roles)
 */

const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');
const { sendEmail } = require('../controllers/emailCommunicationController');

// POST /api/email-communication/send
router.post(
  '/send',
  verifyToken,
  authorizeRole('SUPER_ADMIN', 'SUB_ADMIN'),
  sendEmail
);

module.exports = router;
