const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');
const User = require('../models/User');
const { generateOTP, sendOtpEmail } = require('../utils/mailer');

// POST /api/otp/send -> Send OTP to email
router.post('/send', async (req, res) => {
  const { email, purpose } = req.body; // purpose: 'registration' or 'reset'

  if (!email || !purpose) {
    return res.status(400).json({ message: 'Email and purpose are required.' });
  }

  try {
    // For registration: ensure email is NOT already taken
    if (purpose === 'registration') {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }
    }

    // For reset: ensure email EXISTS
    if (purpose === 'reset') {
      const existing = await User.findOne({ email });
      if (!existing) {
        return res.status(404).json({ message: 'No account found with this email.' });
      }
    }

    // Delete any existing OTP for this email+purpose
    await Otp.deleteMany({ email, purpose });

    // Generate and save new OTP
    const otp = generateOTP();
    await new Otp({ email, otp, purpose }).save();

    // Send the email
    await sendOtpEmail(email, otp, purpose);

    res.json({ message: 'OTP sent successfully. Check your email.' });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/otp/verify -> Verify OTP (does NOT delete it — deletion happens on final action)
router.post('/verify', async (req, res) => {
  const { email, otp, purpose } = req.body;

  if (!email || !otp || !purpose) {
    return res.status(400).json({ message: 'Email, OTP, and purpose are required.' });
  }

  try {
    const record = await Otp.findOne({ email, otp, purpose });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    // OTP is valid — mark as verified but keep it (it'll be consumed by the final action)
    res.json({ verified: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ message: 'Server error during OTP verification.' });
  }
});

module.exports = router;
