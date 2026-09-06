const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/admin-login
router.post('/admin-login', authController.adminLogin);

// POST /api/auth/student-login
router.post('/student-login', authController.studentLogin);

// POST /api/auth/send-otp
router.post('/send-otp', authController.sendOtp);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
