const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Redemption = require('../models/Redemption');
const User = require('../models/User');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const { evaluateTicketScanWindow } = require('../utils/dateUtils');
const { isAdminRole, getAuthorizedTheaterIds } = require('../utils/authHelpers');

// POST /api/scan/ticket -> Validate and mark a ticket as scanned
router.post('/ticket', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { bookingId, confirm } = req.body || {};
    if (typeof bookingId !== 'string' || !bookingId.trim()) {
      return res.status(400).json({ error: true, message: 'Booking ID is required.' });
    }

    const booking = await Booking.findOne({ bookingIdString: bookingId.trim().toUpperCase() })
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

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ error: true, message: `Ticket status is "${booking.status}". Only confirmed tickets are valid.` });
    }

    const showTheater = booking.showtime?.theater;
    const showTheaterId = showTheater?._id?.toString() || showTheater?.toString();
    if (!showTheaterId) {
      return res.status(400).json({ error: true, message: 'Ticket showtime or theater information is unavailable.' });
    }

    const adminUser = await User.findById(req.user.id);
    if (!adminUser) {
      return res.status(401).json({ error: true, message: 'Staff account not found.' });
    }

    const { stringIds: allAuthorized } = await getAuthorizedTheaterIds(adminUser._id, adminUser.theaterIds);

    if (!isAdminRole(adminUser.role) && !allAuthorized.includes(showTheaterId)) {
      return res.status(403).json({ error: true, message: 'This ticket is for a different theater. Access denied.' });
    }

    const showtime = booking.showtime;
    const scanWindow = evaluateTicketScanWindow(showtime?.date, showtime?.time, new Date());
    if (!scanWindow.allowed) {
      return res.status(400).json({
        error: true,
        message: scanWindow.message
      });
    }

    if (booking.isScanned) {
      return res.status(400).json({
        error: true,
        message: `This ticket was already scanned at ${booking.scannedAt?.toLocaleString('en-IN')}.`,
        alreadyScanned: true,
        booking
      });
    }

    let finalBooking = booking;
    if (confirm) {
      finalBooking = await Booking.findOneAndUpdate(
        { _id: booking._id, isScanned: false, status: 'Confirmed' },
        {
          $set: {
            isScanned: true,
            scannedAt: new Date(),
            scannedByTheater: showTheaterId
          }
        },
        { new: true }
      )
        .populate('user', 'name email')
        .populate({
          path: 'showtime',
          populate: [
            { path: 'movie', select: 'title poster duration' },
            { path: 'theater', select: 'name location _id' }
          ]
        });

      if (!finalBooking) {
        return res.status(400).json({
          error: true,
          alreadyScanned: true,
          message: 'This ticket was already scanned.'
        });
      }
    }

    res.json({
      valid: true,
      confirmed: Boolean(confirm),
      booking: finalBooking,
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
    const { code, confirm } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: true, message: 'Redemption code is required.' });
    }

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

    let finalRedemption = redemption;
    if (confirm) {
      const adminUser = await User.findById(req.user.id);
      if (!adminUser) {
        return res.status(401).json({ error: true, message: 'Staff account not found.' });
      }
      const { objectIds } = await getAuthorizedTheaterIds(adminUser._id, adminUser.theaterIds);
      const theaterToRecord = objectIds[0] || null;

      finalRedemption = await Redemption.findOneAndUpdate(
        { _id: redemption._id, isUsed: false },
        {
          $set: {
            isUsed: true,
            usedAt: new Date(),
            usedByAdmin: req.user.id,
            usedByTheater: theaterToRecord
          }
        },
        { new: true }
      )
        .populate('user', 'name email rewardPoints membershipLevel')
        .populate('item', 'name description image category pointCost');

      if (!finalRedemption) {
        return res.status(400).json({
          error: true,
          alreadyUsed: true,
          message: 'This code has already been redeemed.'
        });
      }
    }

    res.json({
      valid: true,
      confirmed: Boolean(confirm),
      redemption: finalRedemption,
      message: confirm ? 'Redemption confirmed and item delivered.' : 'Code is valid. Confirm to deliver item.'
    });
  } catch (error) {
    console.error('Scan redemption error:', error);
    res.status(500).json({ error: true, message: 'Server error during redemption validation.' });
  }
});

module.exports = router;
