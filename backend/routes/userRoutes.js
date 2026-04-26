const express = require('express');
const router = express.Router();
const User = require('../models/User');
const RedeemableItem = require('../models/RedeemableItem');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');

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
    
    // Convert to JSON and ensure 'id' is present
    const userJson = user.toJSON();
    userJson.id = user._id;
    
    res.json(userJson);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// DELETE /api/users/me -> User deletes their own account
router.delete('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Purge Bookings first
    const Booking = require('../models/Booking');
    await Booking.deleteMany({ user: userId });
    
    // Then purge user
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
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// PUT /api/users/:id/access/revoke -> Admin revokes theater specific access
router.put('/:id/access/revoke', verifyToken, adminOnly, async (req, res) => {
  try {
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
  const { name, profilePhoto, password } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    
    if (password) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        role: user.role,
        theaterIds: user.theaterIds,
        name: user.name,
        profilePhoto: user.profilePhoto,
        mobile: user.mobile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile' });
  }
});



// POST /api/users/staff -> Master admin creates new staff
router.post('/staff', verifyToken, adminOnly, async (req, res) => {
  const { name, email, password, role, theaterIds } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = new User({ name, email, password, role, theaterIds: theaterIds || [] });
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating staff account' });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// POST /api/users/membership/buy -> User buys membership for 199
router.post('/membership/buy', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isMember = true;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // 1 month membership
    user.membershipExpiry = expiry;
    
    await user.save();
    res.json({ message: 'Welcome to the inner circle! Membership activated.', user });
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

// POST /api/users/redeem-item/:id -> Exchange points for an item, generate unique code
router.post('/redeem-item/:id', verifyToken, async (req, res) => {
  try {
    const item = await RedeemableItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (!item.isAvailable) return res.status(400).json({ message: 'This item is currently out of stock.' });

    const user = await User.findById(req.user.id);
    if (user.rewardPoints < item.pointCost) {
      return res.status(400).json({ message: 'Insufficient points for this artifact.' });
    }

    // Generate a unique redemption code using crypto: RDM-XXXXXXXX
    const crypto = require('crypto');
    const uniqueCode = 'RDM-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const Redemption = require('../models/Redemption');
    const redemption = new Redemption({
      user: user._id,
      item: item._id,
      uniqueCode,
      pointsSpent: item.pointCost
    });
    await redemption.save();

    user.rewardPoints -= item.pointCost;
    // Recalculate membership tier
    if (user.rewardPoints >= 5000) user.membershipLevel = 'Gold';
    else if (user.rewardPoints >= 1000) user.membershipLevel = 'Silver';
    else user.membershipLevel = 'Basic';
    await user.save();

    res.json({ 
      message: `Successfully exchanged points for ${item.name}!`, 
      uniqueCode,
      redemption,
      user 
    });
  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({ message: 'Error during redemption.' });
  }
});

// Admin Routes for Loyalty Store
// POST /api/users/admin/items -> Add new item
router.post('/admin/items', verifyToken, adminOnly, async (req, res) => {
  try {
    const newItem = new RedeemableItem(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item.' });
  }
});

// PUT /api/users/admin/items/:id -> Update item
router.put('/admin/items/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const item = await RedeemableItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item.' });
  }
});

// DELETE /api/users/admin/items/:id -> Remove item
router.delete('/admin/items/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await RedeemableItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed from vault.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item.' });
  }
});

// GET /api/users/my-redemptions -> User sees their own redemption history
router.get('/my-redemptions', verifyToken, async (req, res) => {
  try {
    const Redemption = require('../models/Redemption');
    const redemptions = await Redemption.find({ user: req.user.id })
      .populate('item', 'name description image category pointCost')
      .populate('usedByTheater', 'name location')
      .sort({ createdAt: -1 });
    res.json(redemptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching redemption history.' });
  }
});

// GET /api/users/admin/redemptions -> Admin sees all redemption history
router.get('/admin/redemptions', verifyToken, async (req, res) => {
  try {
    const Redemption = require('../models/Redemption');
    let query = {};
    if (req.user.role === 'theater_admin') {
      // Theater admins see only redemptions used at their theaters
      const user = await User.findById(req.user.id);
      query = { usedByTheater: { $in: user.theaterIds } };
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
