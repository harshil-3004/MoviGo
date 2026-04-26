const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');

// POST /api/auth/login -> Authenticate user and issue JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
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
        membershipExpiry: user.membershipExpiry
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      // Send the token and user payload back to the frontend
      res.json({ token, user: payload.user });
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error during login' });
  }
});

const validatePassword = (password) => {
  const minLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_]/.test(password);
  const hasAlphabet = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return minLength && hasUppercase && hasSymbol && hasAlphabet && hasNumber;
};

// POST /api/auth/register -> Create a new standard consumer account (OTP-verified)
router.post('/register', async (req, res) => {
  const { name, email, mobile, password, profilePhoto, otp } = req.body;
  try {
    if (!otp) {
      return res.status(400).json({ message: 'Email verification OTP is required.' });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ email, otp, purpose: 'registration' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 uppercase letter, 1 unique symbol, and 1 number.' });
    }

    let user = await User.findOne({ mobile });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this mobile number' });
    }

    // Also check email uniqueness
    user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    user = new User({ name, email, mobile, password, profilePhoto, role: 'user' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // Consume the OTP
    await Otp.deleteMany({ email, purpose: 'registration' });

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        theaterId: user.theaterId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: payload.user });
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server Error during registration' });
  }
});

// POST /api/auth/reset-password -> Reset user password (OTP-verified)
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, otp } = req.body;
  try {
    if (!otp) {
      return res.status(400).json({ message: 'Email verification OTP is required.' });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ email, otp, purpose: 'reset' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, contain 1 uppercase letter, 1 unique symbol, and 1 number.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Consume the OTP
    await Otp.deleteMany({ email, purpose: 'reset' });

    res.json({ message: 'Password reset successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during password reset.' });
  }
});

module.exports = router;
