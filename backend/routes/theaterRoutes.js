const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Theater = require('../models/Theater');
const User = require('../models/User');
const Showtime = require('../models/Showtime');
const { verifyToken, adminOnly, theaterAdminOnly } = require('../middleware/authMiddleware');
const { isAdminRole, getAuthorizedTheaterIds, sanitizeUser } = require('../utils/authHelpers');

// GET /api/theaters -> Get all approved theaters (Public)
router.get('/', async (req, res) => {
  try {
    const theaters = await Theater.find({ approvalStatus: 'Approved' });
    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching theaters', error: error.message });
  }
});

// GET /api/theaters/admin -> Get theaters with filtering for admins (Uses real-time DB sync)
router.get('/admin', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    let query = {};
    if (!isAdminRole(req.user.role)) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: 'User not found' });

      const { objectIds } = await getAuthorizedTheaterIds(req.user.id, user.theaterIds);
      query = { _id: { $in: objectIds } };
    }
    const theaters = await Theater.find(query);
    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching admin theaters', error: error.message });
  }
});

// POST /api/theaters -> Add new theater (Admin or Theater Admin)
router.post('/', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { name, location, format, idString, screens } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ message: 'Theater name and location are required' });
    }

    const newTheater = new Theater({
      idString: typeof idString === 'string' && idString.trim() ? idString.trim() : `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      location: location.trim(),
      format: typeof format === 'string' && format.trim() ? format.trim() : 'Standard 2D',
      screens: Array.isArray(screens) ? screens : [],
      requestedBy: new mongoose.Types.ObjectId(req.user.id),
      approvalStatus: isAdminRole(req.user.role) ? 'Approved' : 'Pending'
    });
    const saved = await newTheater.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Server Error adding theater', error: error.message });
  }
});

// PUT /api/theaters/:id -> Update basic theater info (Admin or Assigned Manager)
router.put('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });

    if (!isAdminRole(req.user.role)) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      if (!stringIds.includes(theater._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to modify this theater' });
      }
    }

    const { name, location, format } = req.body || {};
    if (typeof name === 'string' && name.trim()) theater.name = name.trim();
    if (typeof location === 'string' && location.trim()) theater.location = location.trim();
    if (typeof format === 'string' && format.trim()) theater.format = format.trim();

    await theater.save();
    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: 'Error updating theater', error: error.message });
  }
});

// PUT /api/theaters/:id/status -> Approve or Reject (Admin Only)
router.put('/:id/status', verifyToken, adminOnly, async (req, res) => {
  const { approvalStatus } = req.body || {};
  if (!['Pending', 'Approved', 'Rejected'].includes(approvalStatus)) {
    return res.status(400).json({ message: 'Invalid approval status' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });

    theater.approvalStatus = approvalStatus;
    await theater.save();

    if (approvalStatus === 'Approved' && theater.requestedBy) {
      await User.findByIdAndUpdate(theater.requestedBy, {
        $addToSet: { theaterIds: theater._id }
      });
    }

    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

// DELETE /api/theaters/:id -> Remove theater location (Admin Only)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    const deleted = await Theater.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Theater not found' });

    await Promise.all([
      User.updateMany({ theaterIds: deleted._id }, { $pull: { theaterIds: deleted._id } }),
      Showtime.deleteMany({ theater: deleted._id })
    ]);

    res.status(200).json({ message: 'Theater closed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error closing theater', error: error.message });
  }
});

// PUT /api/theaters/:id/screens -> Update screen configurations (Admin/Authorized Theater Manager)
router.put('/:id/screens', verifyToken, theaterAdminOnly, async (req, res) => {
  const { screens } = req.body || {};
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Theater not found' });
    }
    if (!Array.isArray(screens) || screens.length > 5) {
      return res.status(400).json({ message: 'Screens must be an array with at most 5 screens' });
    }

    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });

    if (!isAdminRole(req.user.role)) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      if (!stringIds.includes(theater._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to modify screens for this theater' });
      }
    }

    if (theater.approvalStatus !== 'Approved') {
      return res.status(403).json({ message: 'Cannot modify screens on an unapproved theater branch' });
    }

    theater.screens = screens;
    await theater.save();
    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: 'Error updating screens', error: error.message });
  }
});

// POST /api/theaters/:id/personnel -> Assign a theater admin to this theater (Admin Only)
router.post('/:id/personnel', verifyToken, adminOnly, async (req, res) => {
  const { userId } = req.body || {};
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Valid theater and user IDs are required' });
    }

    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { theaterIds: theater._id } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Personnel authorized for this theater node.', user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning personnel', error: error.message });
  }
});

// DELETE /api/theaters/:id/personnel/:userId -> Revoke access to a specific theater
router.delete('/:id/personnel/:userId', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id, userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Valid theater and user IDs are required' });
    }

    const theater = await Theater.findById(id);
    if (!theater) return res.status(404).json({ message: 'Theater node not found.' });

    if (theater.requestedBy && theater.requestedBy.toString() === userId) {
      return res.status(403).json({ message: 'Primary owners cannot have their access revoked. You must reject or delete the branch instead.' });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { theaterIds: theater._id }
    });

    res.json({ message: 'Personnel access revoked from this specific node.' });
  } catch (error) {
    res.status(500).json({ message: 'Error revoking node access', error: error.message });
  }
});

module.exports = router;
