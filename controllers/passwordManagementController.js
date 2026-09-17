/**
 * passwordManagementController.js
 *
 * Isolated controller for the Password Management demo module.
 * Handles two distinct flows:
 *   1. First-Time Login  — pre-filled default password → OTP → new password
 *   2. Normal Login      — OTP first → new password
 *
 * Also provides a Test Login endpoint so the updated password can be verified.
 *
 * IMPORTANT: This controller only operates on the two dedicated demo accounts:
 *   firsttime@universityerp.test
 *   login@universityerp.test
 *
 * It does NOT touch any real user accounts or the existing auth flow.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');

// The two demo account emails — hard-coded so the frontend never needs to send them.
const DEMO_EMAILS = {
  firsttime: 'firsttime@universityerp.test',
  login: 'login@universityerp.test',
};

// The test OTP used in development/demo mode.
const TEST_OTP = '000000';

/**
 * Helper — fetch a demo user by flow key ('firsttime' | 'login').
 * Returns the Mongoose document so callers can mutate and save.
 */
const getDemoUser = async (flow) => {
  const email = DEMO_EMAILS[flow];
  if (!email) return null;
  return User.findOne({ email });
};

// ---------------------------------------------------------------------------
// POST /api/password-mgmt/firsttime/init
// Validates that the current (default) password matches, then issues a test OTP.
// ---------------------------------------------------------------------------
exports.initFirstTime = async (req, res) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required.' });
    }

    const user = await getDemoUser('firsttime');
    if (!user) {
      return res.status(404).json({
        message: 'Demo account not found. Please run the seed script first.',
      });
    }

    // Verify the supplied current password against the stored hash.
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect.',
      });
    }

    // Store the test OTP on the user document (15-minute expiry).
    user.otp = TEST_OTP;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: 'Current password verified. OTP has been generated for testing.',
      // In a real system, the OTP would be emailed/SMSed — not returned here.
      // We expose it only because this is a test/demo mode.
      testOtp: TEST_OTP,
    });
  } catch (error) {
    console.error('[PM] initFirstTime error:', error);
    return res.status(500).json({ message: 'Server error during first-time login initiation.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/password-mgmt/login/init
// Issues a test OTP for the normal-login demo account.
// ---------------------------------------------------------------------------
exports.initLogin = async (req, res) => {
  try {
    const user = await getDemoUser('login');
    if (!user) {
      return res.status(404).json({
        message: 'Demo account not found. Please run the seed script first.',
      });
    }

    // Store the test OTP on the user document (15-minute expiry).
    user.otp = TEST_OTP;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: 'OTP has been generated for testing.',
      testOtp: TEST_OTP,
    });
  } catch (error) {
    console.error('[PM] initLogin error:', error);
    return res.status(500).json({ message: 'Server error during login initiation.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/password-mgmt/verify-otp
// Body: { flow: 'firsttime' | 'login', otp: string }
// Verifies the test OTP without updating the password yet.
// Returns a short-lived session token (a simple flag stored on the user doc)
// so that the subsequent update-password call knows OTP was verified.
// ---------------------------------------------------------------------------
exports.verifyOtp = async (req, res) => {
  try {
    const { flow, otp } = req.body;

    if (!flow || !otp) {
      return res.status(400).json({ message: 'Flow identifier and OTP are required.' });
    }

    if (!DEMO_EMAILS[flow]) {
      return res.status(400).json({ message: 'Invalid flow identifier.' });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits.' });
    }

    const user = await getDemoUser(flow);
    if (!user) {
      return res.status(404).json({
        message: 'Demo account not found. Please run the seed script first.',
      });
    }

    // Accept the universal test OTP OR a valid unexpired DB OTP.
    const isTestOtp = otp === TEST_OTP;
    const isDbOtpValid =
      user.otp &&
      user.otp === otp &&
      user.otpExpires &&
      new Date() <= new Date(user.otpExpires);

    if (!isTestOtp && !isDbOtpValid) {
      return res.status(400).json({
        message: 'Invalid or expired OTP. For testing, use OTP: 000000',
      });
    }

    // Mark OTP as verified by clearing it — the update-password endpoint
    // uses a separate otpVerified flag to guard against bypass.
    user.otp = null;
    user.otpExpires = null;
    // We repurpose the otp field as a temporary "verified" marker so that
    // the password-update endpoint can confirm this step ran.
    // Using a dedicated flag value rather than a real token keeps it simple.
    user.otp = 'OTP_VERIFIED';
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min to complete
    await user.save();

    return res.status(200).json({
      message: 'OTP verified successfully. Proceed to set your new password.',
    });
  } catch (error) {
    console.error('[PM] verifyOtp error:', error);
    return res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/password-mgmt/update-password
// Body: { flow: 'firsttime' | 'login', newPassword: string, retypePassword: string }
// Requires that verifyOtp was called first (checks for OTP_VERIFIED marker).
// ---------------------------------------------------------------------------
exports.updatePassword = async (req, res) => {
  try {
    const { flow, newPassword, retypePassword } = req.body;

    if (!flow || !newPassword || !retypePassword) {
      return res.status(400).json({
        message: 'Flow identifier, new password, and retype password are required.',
      });
    }

    if (!DEMO_EMAILS[flow]) {
      return res.status(400).json({ message: 'Invalid flow identifier.' });
    }

    if (newPassword !== retypePassword) {
      return res.status(400).json({ message: 'New password and retype password do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long.',
      });
    }

    const user = await getDemoUser(flow);
    if (!user) {
      return res.status(404).json({
        message: 'Demo account not found. Please run the seed script first.',
      });
    }

    // Guard: OTP must have been verified in this session.
    if (
      user.otp !== 'OTP_VERIFIED' ||
      !user.otpExpires ||
      new Date() > new Date(user.otpExpires)
    ) {
      return res.status(403).json({
        message: 'OTP verification required before updating password. Please complete OTP step.',
      });
    }

    // Guard: new password must differ from the current password.
    const isSameAsCurrentPassword = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({
        message: 'New password cannot be the same as your current password.',
      });
    }

    // Hash and save the new password.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('[PM] updatePassword error:', error);
    return res.status(500).json({ message: 'Server error during password update.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/password-mgmt/test-login
// Body: { email: string, password: string }
// Authenticates ONLY the two demo accounts so users can verify the password
// update actually worked. Does NOT issue a JWT — purely a verification endpoint.
// ---------------------------------------------------------------------------
exports.testLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Only allow the two demo accounts through this endpoint.
    const isDemoAccount = Object.values(DEMO_EMAILS).includes(normalizedEmail);
    if (!isDemoAccount) {
      // Return the same generic error to avoid account enumeration.
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      account: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[PM] testLogin error:', error);
    return res.status(500).json({ message: 'Server error during test login.' });
  }
};
