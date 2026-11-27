const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { validatePassword, PASSWORD_POLICY_MESSAGE } = require('../utils/authHelpers');

// POST /api/auth/login -> Authenticate user and issue JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        theaterIds: user.theaterIds,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        isMember: user.isMember,
        rewardPoints: user.rewardPoints,
        membershipLevel: user.membershipLevel,
        membershipExpiry: user.membershipExpiry
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: payload.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server Error during login' });
  }
});

// POST /api/auth/register -> Create a new standard consumer account (OTP-verified)
router.post('/register', async (req, res) => {
  const { name, email, mobile, password, profilePhoto, otp } = req.body || {};
  try {
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof mobile !== 'string' || !mobile.trim() ||
      typeof password !== 'string' ||
      typeof otp !== 'string' || !otp.trim()
    ) {
      return res.status(400).json({ message: 'Name, email, mobile, password, and OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    const normalizedMobile = mobile.trim();

    // Verify OTP
    const otpRecord = await Otp.findOne({ email: normalizedEmail, otp: normalizedOtp, purpose: 'registration' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    let existingUser = await User.findOne({ mobile: normalizedMobile });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this mobile number' });
    }

    existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      password: hashedPassword,
      profilePhoto: typeof profilePhoto === 'string' ? profilePhoto : null,
      role: 'user'
    });
    await user.save();

    // Consume the OTP
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'registration' });

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        theaterIds: user.theaterIds,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        isMember: user.isMember,
        rewardPoints: user.rewardPoints,
        membershipLevel: user.membershipLevel,
        membershipExpiry: user.membershipExpiry
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: payload.user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server Error during registration' });
  }
});

// POST /api/auth/reset-password -> Reset user password (OTP-verified)
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, otp } = req.body || {};
  try {
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof newPassword !== 'string' ||
      typeof otp !== 'string' || !otp.trim()
    ) {
      return res.status(400).json({ message: 'Email, new password, and OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    // Verify OTP
    const otpRecord = await Otp.findOne({ email: normalizedEmail, otp: normalizedOtp, purpose: 'reset' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Consume the OTP
    await Otp.deleteMany({ email: normalizedEmail, purpose: 'reset' });

    res.json({ message: 'Password reset successfully!' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset.' });
  }
});

module.exports = router;
