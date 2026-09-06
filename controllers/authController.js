const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_university_erp';

// Helper to format user response
const formatUserResponse = (user) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      adminType: user.adminType,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    prn: user.prn,
    role: user.role,
    adminType: user.adminType,
    department: user.department,
    token,
  };
};

// Admin Login (Super Admin, Sub Admin, Teacher)
exports.adminLogin = async (req, res) => {
  try {
    const { email, password, adminType } = req.body;

    if (!email || !password || !adminType) {
      return res.status(400).json({ message: 'Email, password, and admin type are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Map admin type check
    const typeMapping = {
      SUPER_ADMIN: ['SUPER_ADMIN'],
      SUB_ADMIN: ['SUB_ADMIN', 'FINANCE'],
      TEACHER: ['TEACHER', 'FACULTY'],
    };

    const allowedRoles = typeMapping[adminType] || [];
    const isRoleValid = allowedRoles.includes(user.role) || allowedRoles.includes(user.adminType);

    if (!isRoleValid) {
      return res.status(403).json({
        message: `Account is not registered under ${adminType.replace('_', ' ')} access`,
      });
    }

    // Log login activity
    await AuditLog.create({
      action: 'ADMIN_LOGIN',
      performedBy: user.email,
      target: `Admin Portal (${adminType})`,
      status: 'SUCCESS',
      details: `${user.name} logged in as ${adminType}`,
    });

    return res.status(200).json({
      message: 'Admin login successful',
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({ message: 'Server error during admin login' });
  }
};

// Student Login (PRN Number + Password)
exports.studentLogin = async (req, res) => {
  try {
    const { prn, password } = req.body;

    if (!prn || !password) {
      return res.status(400).json({ message: 'PRN number and password are required' });
    }

    const cleanPrn = prn.trim();
    const user = await User.findOne({
      $or: [{ prn: cleanPrn }, { email: cleanPrn.toLowerCase() }],
    });

    if (!user || user.role !== 'STUDENT') {
      return res.status(401).json({ message: 'Invalid PRN number or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid PRN number or password' });
    }

    // Log login activity
    await AuditLog.create({
      action: 'STUDENT_LOGIN',
      performedBy: user.prn || user.email,
      target: 'Student Portal',
      status: 'SUCCESS',
      details: `Student ${user.name} logged in`,
    });

    return res.status(200).json({
      message: 'Student login successful',
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Student Login Error:', error);
    return res.status(500).json({ message: 'Server error during student login' });
  }
};

// Generate 6-digit OTP (Default test OTP: 000000)
exports.sendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: 'Email or PRN number is required' });
    }

    const cleanIdentifier = identifier.trim();
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { prn: cleanIdentifier },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found with provided Email or PRN' });
    }

    // Test OTP requirement: Always generate test 6-digit OTP 000000
    const testOtp = '000000';
    user.otp = testOtp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
    await user.save();

    await AuditLog.create({
      action: 'OTP_REQUESTED',
      performedBy: user.email,
      target: 'Password Reset',
      status: 'SUCCESS',
      details: 'Generated test OTP 000000 for password reset',
    });

    return res.status(200).json({
      message: 'OTP sent successfully. Use test OTP 000000',
      otp: testOtp,
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Server error while generating OTP' });
  }
};

// Reset Password with OTP and current/new password validation
exports.resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword, retypePassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: 'Identifier, OTP, and new password are required' });
    }

    if (retypePassword && newPassword !== retypePassword) {
      return res.status(400).json({ message: 'New password and retype password do not match' });
    }

    const cleanIdentifier = identifier.trim();
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { prn: cleanIdentifier },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Verify OTP: accepts test OTP '000000' or matching unexpired database OTP
    const isTestOtp = otp === '000000';
    const isDbOtpValid = user.otp && user.otp === otp && user.otpExpires && new Date() <= new Date(user.otpExpires);

    if (!isTestOtp && !isDbOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please use test OTP 000000' });
    }

    // Note: If user enters their current password as new password, it is accepted without restriction.

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_RESET',
      performedBy: user.email,
      target: 'User Account',
      status: 'SUCCESS',
      details: `Password reset successfully for ${user.email}`,
    });

    return res.status(200).json({
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
};
