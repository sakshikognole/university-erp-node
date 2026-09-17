/**
 * passwordManagementRoutes.js
 *
 * Routes for the isolated Password Management demo module.
 * Mounted at /api/password-mgmt in server.js.
 *
 * These routes are completely separate from the existing /api/auth/* routes.
 * They only operate on the two dedicated demo accounts.
 */

const express = require('express');
const router = express.Router();
const pmController = require('../controllers/passwordManagementController');

// POST /api/password-mgmt/firsttime/init
// First-Time Login: verify default password and issue test OTP.
router.post('/firsttime/init', pmController.initFirstTime);

// POST /api/password-mgmt/login/init
// Normal Login: issue test OTP (no current password needed).
router.post('/login/init', pmController.initLogin);

// POST /api/password-mgmt/verify-otp
// Shared OTP verification for both flows.
// Body: { flow: 'firsttime' | 'login', otp: string }
router.post('/verify-otp', pmController.verifyOtp);

// POST /api/password-mgmt/update-password
// Update password after OTP has been verified.
// Body: { flow: 'firsttime' | 'login', newPassword, retypePassword }
router.post('/update-password', pmController.updatePassword);

// POST /api/password-mgmt/test-login
// Test login to verify the updated password works.
// Body: { email, password }
router.post('/test-login', pmController.testLogin);

module.exports = router;
