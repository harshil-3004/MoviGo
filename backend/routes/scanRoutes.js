const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Redemption = require('../models/Redemption');
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Helper: parse "HH:MM" or "H:MM AM/PM" into minutes since midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const ampm = /AM|PM/i.test(timeStr);
  if (ampm) {
    const [time, period] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + (m || 0);
  }
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Helper: parse movie duration string "2h 28m" or "148" (mins) into minutes
const parseDurationToMinutes = (duration) => {
  if (!duration) return 120; // default 2h
  if (typeof duration === 'number') return duration;
  const hMatch = duration.match(/(\d+)h/);
  const mMatch = duration.match(/(\d+)m/);
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  const m = mMatch ? parseInt(mMatch[1]) : 0;
  if (h === 0 && m === 0) {
    // Maybe it's just a plain number string
    const n = parseInt(duration);
    return isNaN(n) ? 120 : n;
  }
  return h * 60 + m;
};

// POST /api/scan/ticket -> Validate and mark a ticket as scanned
router.post('/ticket', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { bookingId, confirm } = req.body; // bookingId = bookingIdString, confirm = true to finalize
    
    // 1. Find booking
    const booking = await Booking.findOne({ bookingIdString: bookingId })
      .populate('user', 'name email')
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title poster duration' },
          { path: 'theater', select: 'name location _id' }
        ]
      });

    if (!booking) {
      return res.status(404).json({ error: true, message: 'Ticket not found. Invalid booking ID.' });
    }

    // 2. Check booking is confirmed
    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ error: true, message: `Ticket status is "${booking.status}". Only confirmed tickets are valid.` });
    }

    // 3. Check theater authorization (scanner must manage this theater)
    const showTheater = booking.showtime?.theater;
    const showTheaterId = showTheater?._id?.toString() || showTheater?.toString();
    
    const adminUser = await User.findById(req.user.id);
    const authorizedIds = (adminUser.theaterIds || []).map(id => id.toString());
    
    // Also check if they own the theater
    const Theater = require('../models/Theater');
    const ownedTheaters = await Theater.find({ requestedBy: adminUser._id }).select('_id');
    const ownedIds = ownedTheaters.map(t => t._id.toString());
    const allAuthorized = [...new Set([...authorizedIds, ...ownedIds])];

    // SUPER ADMIN BYPASS: If role is admin, they can scan ANY ticket
    if (adminUser.role !== 'admin' && !allAuthorized.includes(showTheaterId)) {
      return res.status(403).json({ error: true, message: 'This ticket is for a different theater. Access denied.' });
    }

    // 4. Check time validity: ticket valid from showtime until showtime + movie duration
    const showtime = booking.showtime;
    const showDate = showtime?.date; // e.g. "2026-04-23"
    const showTime = showtime?.time;
    const movieDurationMins = parseDurationToMinutes(showtime?.movie?.duration);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (showDate !== todayStr) {
      return res.status(400).json({ 
        error: true, 
        message: `This ticket is for ${showDate}. Today is ${todayStr}. Ticket is not valid today.` 
      });
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const showStartMinutes = parseTimeToMinutes(showTime);
    const showEndMinutes = showStartMinutes + movieDurationMins;

    if (nowMinutes < showStartMinutes) {
      const minutesBefore = showStartMinutes - nowMinutes;
      return res.status(400).json({ 
        error: true, 
        message: `Show hasn't started yet. Starts in ${minutesBefore} min (${showTime}).` 
      });
    }

    if (nowMinutes > showEndMinutes) {
      return res.status(400).json({ 
        error: true, 
        message: `Show has already ended. The ${showtime?.movie?.title} show ended at ${showEndMinutes} minutes past midnight.` 
      });
    }

    // 5. Check not already scanned
    if (booking.isScanned) {
      return res.status(400).json({ 
        error: true, 
        message: `This ticket was already scanned at ${booking.scannedAt?.toLocaleString('en-IN')}.`,
        alreadyScanned: true,
        booking 
      });
    }

    // 6. If confirm=true, mark as scanned
    if (confirm) {
      booking.isScanned = true;
      booking.scannedAt = new Date();
      booking.scannedByTheater = showTheaterId;
      await booking.save();
    }

    res.json({
      valid: true,
      confirmed: !!confirm,
      booking,
      message: confirm ? 'Ticket verified and marked as used.' : 'Ticket is valid. Confirm to finalize entry.'
    });

  } catch (error) {
    console.error('Scan ticket error:', error);
    res.status(500).json({ error: true, message: 'Server error during ticket validation.' });
  }
});

// POST /api/scan/redemption -> Validate and mark a redemption code as used
router.post('/redemption', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { code, confirm } = req.body;

    const redemption = await Redemption.findOne({ uniqueCode: code.toUpperCase().trim() })
      .populate('user', 'name email rewardPoints membershipLevel')
      .populate('item', 'name description image category pointCost');

    if (!redemption) {
      return res.status(404).json({ error: true, message: 'Redemption code not found. Please check the code and try again.' });
    }

    if (redemption.isUsed) {
      return res.status(400).json({ 
        error: true,
        alreadyUsed: true,
        message: `This code was already redeemed at ${redemption.usedAt?.toLocaleString('en-IN')}.`,
        redemption
      });
    }

    // If confirm=true, mark as used
    if (confirm) {
      const adminUser = await User.findById(req.user.id);
      const Theater = require('../models/Theater');
      const ownedTheater = await Theater.findOne({ requestedBy: adminUser._id }).select('_id');
      const theaterToRecord = (adminUser.theaterIds?.[0]) || ownedTheater?._id;

      redemption.isUsed = true;
      redemption.usedAt = new Date();
      redemption.usedByAdmin = req.user.id;
      redemption.usedByTheater = theaterToRecord;
      await redemption.save();
    }

    res.json({
      valid: true,
      confirmed: !!confirm,
      redemption,
      message: confirm ? 'Redemption confirmed and item delivered.' : 'Code is valid. Confirm to deliver item.'
    });

  } catch (error) {
    console.error('Scan redemption error:', error);
    res.status(500).json({ error: true, message: 'Server error during redemption validation.' });
  }
});

module.exports = router;
