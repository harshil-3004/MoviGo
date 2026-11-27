const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');
const User = require('../models/User');
const { generateOTP, sendOtpEmail } = require('../utils/mailer');

const VALID_PURPOSES = new Set(['registration', 'reset']);

// POST /api/otp/send -> Send OTP to email
router.post('/send', async (req, res) => {
  const { email, purpose } = req.body || {};

  if (typeof email !== 'string' || !email.trim() || typeof purpose !== 'string' || !VALID_PURPOSES.has(purpose)) {
    return res.status(400).json({ message: 'Valid email and purpose ("registration" or "reset") are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    if (purpose === 'registration') {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
    }

    if (purpose === 'reset') {
      const existing = await User.findOne({ email: normalizedEmail });
      if (!existing) {
        return res.status(404).json({ message: 'No account found with this email.' });
      }
    }

    await Otp.deleteMany({ email: normalizedEmail, purpose });

    const otp = generateOTP();
    await new Otp({ email: normalizedEmail, otp, purpose }).save();

    await sendOtpEmail(normalizedEmail, otp, purpose);

    res.json({ message: 'OTP sent successfully. Check your email.' });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/otp/verify -> Verify OTP (does NOT delete it — deletion happens on final action)
router.post('/verify', async (req, res) => {
  const { email, otp, purpose } = req.body || {};

  if (
    typeof email !== 'string' || !email.trim() ||
    typeof otp !== 'string' || !otp.trim() ||
    typeof purpose !== 'string' || !VALID_PURPOSES.has(purpose)
  ) {
    return res.status(400).json({ message: 'Email, OTP, and valid purpose are required.' });
  }

  try {
    const record = await Otp.findOne({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      purpose
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    res.json({ verified: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ message: 'Server error during OTP verification.' });
  }
});

module.exports = router;
