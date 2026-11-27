const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const RedeemableItem = require('../models/RedeemableItem');
const Redemption = require('../models/Redemption');
const Message = require('../models/Message');
const { verifyToken, adminOnly, theaterAdminOnly } = require('../middleware/authMiddleware');
const {
  isAdminRole,
  validatePassword,
  PASSWORD_POLICY_MESSAGE,
  getAuthorizedTheaterIds,
  sanitizeUser
} = require('../utils/authHelpers');

const computeTier = (points) => {
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Basic';
};

// GET /api/users -> Admin gets all consumers and staff
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

// GET /api/users/me -> Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// DELETE /api/users/me -> User deletes their own account
router.delete('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Release any locked seats held by pending bookings before purging
    const pendingBookings = await Booking.find({ user: userId, status: 'Pending' });
    for (const pb of pendingBookings) {
      await Showtime.findByIdAndUpdate(pb.showtime, {
        $pull: { lockedSeats: { seat: { $in: pb.seats } } }
      });
    }

    await Promise.all([
      Booking.deleteMany({ user: userId }),
      Redemption.deleteMany({ user: userId }),
      Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] })
    ]);

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User record not found' });
    }

    res.json({ message: 'Identity and all associated records purged successfully' });
  } catch (error) {
    console.error('Purge Error:', error);
    res.status(500).json({ message: 'Critical error during data purge' });
  }
});

// DELETE /api/users/:id -> Admin revokes user access
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own active admin account here.' });
    }

    const pendingBookings = await Booking.find({ user: req.params.id, status: 'Pending' });
    for (const pb of pendingBookings) {
      await Showtime.findByIdAndUpdate(pb.showtime, {
        $pull: { lockedSeats: { seat: { $in: pb.seats } } }
      });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    await Booking.deleteMany({ user: req.params.id });
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// PUT /api/users/:id/access/revoke -> Admin revokes theater specific access
router.put('/:id/access/revoke', verifyToken, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.theaterIds = [];
    await user.save();

    res.json({ message: 'Personnel access revoked from theater nodes.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error revoking access.' });
  }
});

// PUT /api/users/profile -> User updates their own profile
router.put('/profile', verifyToken, async (req, res) => {
  const { name, profilePhoto, password } = req.body || {};
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof profilePhoto === 'string' && profilePhoto.trim()) {
      user.profilePhoto = profilePhoto.trim();
    }

    if (password !== undefined && password !== '') {
      if (!validatePassword(password)) {
        return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// POST /api/users/staff -> Master admin creates new staff
router.post('/staff', verifyToken, adminOnly, async (req, res) => {
  const { name, email, mobile, password, role, theaterIds, theaterId, profilePhoto } = req.body || {};
  try {
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }
    const allowedStaffRoles = ['admin', 'master_admin', 'theater_admin'];
    const targetRole = allowedStaffRoles.includes(role) ? role : 'theater_admin';

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    let resolvedTheaterIds = [];
    if (Array.isArray(theaterIds)) {
      resolvedTheaterIds = theaterIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    } else if (theaterId && mongoose.Types.ObjectId.isValid(theaterId)) {
      resolvedTheaterIds = [theaterId];
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff = new User({
      name: name.trim(),
      email: normalizedEmail,
      mobile: typeof mobile === 'string' && mobile.trim() ? mobile.trim() : null,
      password: hashedPassword,
      profilePhoto: typeof profilePhoto === 'string' && profilePhoto.trim() ? profilePhoto.trim() : null,
      role: targetRole,
      theaterIds: targetRole === 'theater_admin' ? resolvedTheaterIds : []
    });

    await newStaff.save();
    res.status(201).json(sanitizeUser(newStaff));
  } catch (error) {
    res.status(500).json({ message: 'Server error creating staff account' });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// POST /api/users/membership/buy -> User activates or extends membership
router.post('/membership/buy', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const baseDate =
      user.isMember && user.membershipExpiry && new Date(user.membershipExpiry) > now
        ? new Date(user.membershipExpiry)
        : now;

    const expiry = new Date(baseDate);
    expiry.setMonth(expiry.getMonth() + 1);

    user.isMember = true;
    user.membershipExpiry = expiry;

    await user.save();
    res.json({
      message: 'Welcome to the inner circle! Membership activated.',
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing membership.' });
  }
});

// GET /api/users/redeemable-items -> List items available for exchange
router.get('/redeemable-items', verifyToken, async (req, res) => {
  try {
    const items = await RedeemableItem.find({ isAvailable: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items.' });
  }
});

// POST /api/users/redeem-item/:id -> Exchange points atomically for an item
router.post('/redeem-item/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = await RedeemableItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (!item.isAvailable) return res.status(400).json({ message: 'This item is currently out of stock.' });

    // Atomically deduct reward points only if sufficient balance exists
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id, rewardPoints: { $gte: item.pointCost } },
      { $inc: { rewardPoints: -item.pointCost } },
      { new: true }
    );

    if (!updatedUser) {
      const exists = await User.exists({ _id: req.user.id });
      if (!exists) return res.status(404).json({ message: 'User not found' });
      return res.status(400).json({ message: 'Insufficient points for this artifact.' });
    }

    const uniqueCode = 'RDM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const redemption = new Redemption({
      user: updatedUser._id,
      item: item._id,
      uniqueCode,
      pointsSpent: item.pointCost
    });

    try {
      await redemption.save();
    } catch (saveErr) {
      // Refund points if redemption record fails to persist
      await User.findByIdAndUpdate(req.user.id, { $inc: { rewardPoints: item.pointCost } });
      throw saveErr;
    }

    const nextTier = computeTier(updatedUser.rewardPoints);
    if (updatedUser.membershipLevel !== nextTier) {
      updatedUser.membershipLevel = nextTier;
      await updatedUser.save();
    }

    res.json({
      message: `Successfully exchanged points for ${item.name}!`,
      uniqueCode,
      redemption,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({ message: 'Error during redemption.' });
  }
});

// Admin Routes for Loyalty Store
router.get('/admin/items', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const items = await RedeemableItem.find({}).sort({ isAvailable: -1, createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items.' });
  }
});

router.post('/admin/items', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { name, description, pointCost, image, category, isAvailable } = req.body || {};
    const cost = Number(pointCost);
    if (!name || !description || Number.isNaN(cost) || cost < 0) {
      return res.status(400).json({ message: 'Valid name, description, and non-negative pointCost are required.' });
    }
    const newItem = new RedeemableItem({ name, description, pointCost: cost, image, category, isAvailable });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error creating item.' });
  }
});

router.put('/admin/items/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Item not found' });
    }
    const { name, description, pointCost, image, category, isAvailable } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (pointCost !== undefined) {
      const cost = Number(pointCost);
      if (Number.isNaN(cost) || cost < 0) {
        return res.status(400).json({ message: 'pointCost must be non-negative' });
      }
      updates.pointCost = cost;
    }
    if (image !== undefined) updates.image = image;
    if (category !== undefined) updates.category = category;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;

    const item = await RedeemableItem.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error updating item.' });
  }
});

router.delete('/admin/items/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Item not found' });
    }
    const deleted = await RedeemableItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item removed from vault.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item.' });
  }
});

// GET /api/users/my-redemptions -> User sees their own redemption history
router.get('/my-redemptions', verifyToken, async (req, res) => {
  try {
    const redemptions = await Redemption.find({ user: req.user.id })
      .populate('item', 'name description image category pointCost')
      .populate('usedByTheater', 'name location')
      .sort({ createdAt: -1 });
    res.json(redemptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching redemption history.' });
  }
});

// GET /api/users/admin/redemptions -> Admin/Theater Admin sees redemption history
router.get('/admin/redemptions', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    let query = {};
    if (!isAdminRole(req.user.role)) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: 'User not found' });
      const { objectIds } = await getAuthorizedTheaterIds(req.user.id, user.theaterIds);
      query = { usedByTheater: { $in: objectIds } };
    }

    const redemptions = await Redemption.find(query)
      .populate('user', 'name email')
      .populate('item', 'name description category pointCost')
      .populate('usedByTheater', 'name location')
      .populate('usedByAdmin', 'name')
      .sort({ createdAt: -1 });
    res.json(redemptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching redemption history.' });
  }
});

module.exports = router;
