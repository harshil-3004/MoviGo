const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');

// Get all chat contacts based on role
router.get('/contacts', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const userRole = req.user.role;
    let query = {};

    if (userRole === 'theater_admin') {
      // Theater Admin can chat with Super Admin and Master Admin
      query = { role: { $in: ['admin', 'master_admin'] } };
    } else if (userRole === 'master_admin') {
      // Master Admin can chat with Super Admin and all Theater Admins
      query = { role: { $in: ['admin', 'theater_admin'] } };
    } else if (userRole === 'admin') {
      // Super Admin can chat with everyone (except regular users)
      query = { role: { $in: ['admin', 'master_admin', 'theater_admin'] }, _id: { $ne: req.user.id } };
    }

    const contacts = await User.find(query).select('name email role profilePhoto');

    const contactsWithLastMessage = await Promise.all(contacts.map(async (contact) => {
      const lastMessage = await Message.findOne({
        $or: [
          { sender: req.user.id, receiver: contact._id },
          { sender: contact._id, receiver: req.user.id }
        ]
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        sender: contact._id,
        receiver: req.user.id,
        read: false
      });

      return {
        ...contact.toObject(),
        lastMessage,
        unreadCount
      };
    }));

    contactsWithLastMessage.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(contactsWithLastMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get messages between current user and another user
router.get('/messages/:userId', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(req.params.userId).select('role');
    if (!targetUser || !['admin', 'master_admin', 'theater_admin'].includes(targetUser.role)) {
      return res.status(403).json({ message: 'Cannot chat with this user' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 }).populate('sender', 'name profilePhoto role');

    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
