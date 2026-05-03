const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const { verifyToken, adminOnly, theaterAdminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Promotion = require('../models/Promotion');

const { generateBookingPDF } = require('../utils/pdfGenerator');

// GET /api/bookings/:id/pdf -> Download Ticket PDF (Server-side generated)
router.get('/:id/pdf', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate({
         path: 'showtime',
         populate: [
           { path: 'movie' },
           { path: 'theater' }
         ]
      });
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Check ownership or admin
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const pdfBuffer = await generateBookingPDF(booking);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=MoviGo_Ticket_${booking.bookingIdString}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});

// Helper to cleanup expired locks
const cleanupLocks = async (showtimeId) => {
  const now = new Date();
  await Showtime.findByIdAndUpdate(showtimeId, {
    $pull: { lockedSeats: { expiresAt: { $lt: now } } }
  });
};

// POST /api/bookings -> Step 1: Create 'Pending' booking and lock seats
router.post('/', verifyToken, async (req, res) => {
  const { bookingIdString, showtimeId, seats, totalAmount, pointsUsed, promoCode } = req.body;
  const userId = req.user.id;

  try {
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });

    // Cleanup expired locks first
    await cleanupLocks(showtimeId);
    const currentShowtime = await Showtime.findById(showtimeId);

    // Check if seats are already booked or locked
    const isTaken = seats.some(seat => 
      currentShowtime.bookedSeats.includes(seat) || 
      currentShowtime.lockedSeats.some(ls => ls.seat === seat)
    );

    if (isTaken) {
      return res.status(400).json({ message: 'One or more seats are already taken or locked' });
    }

    // lock seats for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const locks = seats.map(seat => ({ seat, expiresAt }));

    await Showtime.findByIdAndUpdate(showtimeId, {
      $push: { lockedSeats: { $each: locks } }
    });

    const newBooking = new Booking({
      bookingIdString,
      user: userId,
      showtime: showtimeId,
      seats,
      totalAmount,
      pointsUsed: pointsUsed || 0,
      promoCode: promoCode || null,
      status: 'Pending'
    });

    const savedBooking = await newBooking.save();
    res.status(201).json(savedBooking);
  } catch (error) {
    res.status(500).json({ message: 'Error creating pending booking', error: error.message });
  }
});

// POST /api/bookings/confirm -> Step 2: Confirm payment and finalize booking
router.post('/confirm', verifyToken, async (req, res) => {
  const { bookingId } = req.body;
  try {
    const booking = await Booking.findById(bookingId).populate('user');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'Pending') return res.status(400).json({ message: 'Booking is not in pending state' });

    // Simulate Payment Success (90% success rate for demo or just 100%)
    const paymentSuccess = true; 

    if (paymentSuccess) {
      // 1. Move seats from locked to booked
      await Showtime.findByIdAndUpdate(booking.showtime, {
        $pull: { lockedSeats: { seat: { $in: booking.seats } } },
        $push: { bookedSeats: { $each: booking.seats } }
      });

      // 2. Update booking status
      booking.status = 'Confirmed';
      await booking.save();

      // 3. Update User Reward Points
      // ₹1 = 1 point. Deduct pointsUsed, add points based on totalAmount
      const user = await User.findById(booking.user._id);
      const pointsEarned = booking.seats.length * 10;
      user.rewardPoints = (user.rewardPoints - (booking.pointsUsed || 0)) + pointsEarned;
      
      // Membership tiers: Basic < 1000, Silver 1000-4999, Gold 5000+
      if (user.rewardPoints >= 5000) user.membershipLevel = 'Gold';
      else if (user.rewardPoints >= 1000) user.membershipLevel = 'Silver';
      else user.membershipLevel = 'Basic';

      await user.save();

      // 4. Increment Promotion Usage if applicable
      if (booking.promoCode) {
        await Promotion.findOneAndUpdate(
          { code: booking.promoCode },
          { $inc: { used: 1 } }
        );
      }

      res.json({ message: 'Booking confirmed', booking });
    } else {
      // Payment Failed
      booking.status = 'Failed';
      await booking.save();
      
      // Release locked seats
      await Showtime.findByIdAndUpdate(booking.showtime, {
        $pull: { lockedSeats: { seat: { $in: booking.seats } } }
      });

      res.status(400).json({ message: 'Payment failed', booking });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error confirming booking', error: error.message });
  }
});

// GET /api/bookings/:id -> Get specific booking details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate({
         path: 'showtime',
         populate: [
           { path: 'movie' },
           { path: 'theater' }
         ]
      });
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Check ownership
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booking', error: error.message });
  }
});

// GET /api/bookings -> Get bookings (Admin/Theater Admin)
router.get('/', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    // ── AUTO-EXPIRE: Mark pending bookings older than 10 minutes as Failed ──
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const expiredPending = await Booking.find({
      status: 'Pending',
      createdAt: { $lt: tenMinutesAgo }
    });

    for (const booking of expiredPending) {
      booking.status = 'Failed';
      await booking.save();
      // Release locked seats
      await Showtime.findByIdAndUpdate(booking.showtime, {
        $pull: { lockedSeats: { seat: { $in: booking.seats } } }
      });
    }
    // ── END AUTO-EXPIRE ──

    let query = {};
    
    // Filter by theater if the user is a theater_admin
    if (req.user.role === 'theater_admin') {
      const user = await User.findById(req.user.id);
      query = { 'showtime': { $in: await Showtime.find({ theater: { $in: user.theaterIds } }).distinct('_id') } };
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email')
      .populate({
         path: 'showtime',
         populate: [
           { path: 'movie', select: 'title' },
           { path: 'theater', select: 'name location' }
         ]
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching bookings', error: error.message });
  }
});

// PUT /api/bookings/:id -> Update pending booking (e.g. apply coupon)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { totalAmount, promoCode } = req.body;
    if (totalAmount) booking.totalAmount = totalAmount;
    if (promoCode !== undefined) booking.promoCode = promoCode;
    
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking', error: error.message });
  }
});

// GET /api/bookings/user/:userId -> Get all bookings for a specific consumer
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    // Ensure users can only see their own bookings unless they are admin
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await Booking.find({ user: req.params.userId })
      .populate({
         path: 'showtime',
         populate: [
           { path: 'movie', select: 'title poster' },
           { path: 'theater', select: 'name location' }
         ]
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching user bookings', error: error.message });
  }
});

// DELETE /api/bookings/:id -> Cancel/Release pending booking
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Ownership check
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status === 'Pending') {
      // Release locked seats
      await Showtime.findByIdAndUpdate(booking.showtime, {
        $pull: { lockedSeats: { seat: { $in: booking.seats } } }
      });
      
      // Mark as Cancelled instead of deleting so admin can see history
      booking.status = 'Cancelled';
      await booking.save();
      return res.json({ message: 'Booking cancelled successfully' });
    } else {
      return res.status(400).json({ message: 'Only pending bookings can be released' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error releasing booking', error: error.message });
  }
});

module.exports = router;
