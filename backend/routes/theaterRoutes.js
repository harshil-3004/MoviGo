const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Theater = require('../models/Theater');
const { verifyToken, adminOnly, theaterAdminOnly } = require('../middleware/authMiddleware');

// GET /api/theaters -> Get all theaters (Public)
router.get('/', async (req, res) => {
  try {
    const theaters = await Theater.find({});
    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching theaters', error: error.message });
  }
});

// GET /api/theaters/admin -> Get theaters with filtering for admins (Uses real-time DB sync)
router.get('/admin', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'theater_admin') {
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      
      const userId = new mongoose.Types.ObjectId(req.user.id);
      const authorizedIds = (user.theaterIds || []).map(id => new mongoose.Types.ObjectId(id));
      
      // Show theaters explicitly assigned OR theaters they requested
      query = { 
        $or: [
          { _id: { $in: authorizedIds } },
          { requestedBy: userId }
        ]
      };
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
    const newTheater = new Theater({
       ...req.body,
       requestedBy: new mongoose.Types.ObjectId(req.user.id),
       approvalStatus: req.user.role === 'admin' ? 'Approved' : 'Pending'
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
    const updated = await Theater.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Theater not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating theater', error: error.message });
  }
});

// PUT /api/theaters/:id/status -> Approve or Reject (Admin Only)
router.put('/:id/status', verifyToken, adminOnly, async (req, res) => {
  const { approvalStatus } = req.body;
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });
    
    theater.approvalStatus = approvalStatus;
    await theater.save();

    // If approved, automatically add this theater to the requesting admin's managed list
    if (approvalStatus === 'Approved' && theater.requestedBy) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(theater.requestedBy, {
        $addToSet: { theaterIds: theater._id } // Add ID if not already present
      });
    }

    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

// DELETE /api/theaters/:id -> Remove generic theater location (Admin Only)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await Theater.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Theater closed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error closing theater', error: error.message });
  }
});

// PUT /api/theaters/:id/screens -> Update screen configurations (Admin/Theater Manager)
router.put('/:id/screens', verifyToken, theaterAdminOnly, async (req, res) => {
  const { screens } = req.body;
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });
    
    // Check if theater is approved before modifying screens
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
  const { userId } = req.body;
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });

    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Add theater ID to user's managed list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { theaterIds: theater._id }
    });

    res.json({ message: 'Personnel authorized for this theater node.', user });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning personnel', error: error.message });
  }
});

// DELETE /api/theaters/:id/personnel/:userId -> Revoke access to a specific theater
router.delete('/:id/personnel/:userId', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const theater = await Theater.findById(id);
    if (!theater) return res.status(404).json({ message: 'Theater node not found.' });

    // CRITICAL: Owners (requestedBy) cannot have their access revoked
    if (theater.requestedBy && theater.requestedBy.toString() === userId) {
      return res.status(403).json({ message: 'Primary owners cannot have their access revoked. You must reject or delete the branch instead.' });
    }

    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, {
      $pull: { theaterIds: id }
    });

    res.json({ message: 'Personnel access revoked from this specific node.' });
  } catch (error) {
    res.status(500).json({ message: 'Error revoking node access', error: error.message });
  }
});

module.exports = router;
