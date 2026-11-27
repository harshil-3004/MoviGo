const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const { generateBookingPDF } = require('../utils/pdfGenerator');
const { formatLocalDate, evaluateBookingWindow } = require('../utils/dateUtils');
const { isAdminRole, getAuthorizedTheaterIds } = require('../utils/authHelpers');
const {
  getScreenForShowtime,
  validateSeatsAgainstScreen,
  calculateBookingPricing
} = require('../utils/pricing');

const LOCK_DURATION_MS = 10 * 60 * 1000;

const cleanupLocks = async (showtimeId) => {
  await Showtime.findByIdAndUpdate(showtimeId, {
    $pull: { lockedSeats: { expiresAt: { $lt: new Date() } } }
  });
};

const expireOldPendingBookings = async () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOCK_DURATION_MS);
  const pendingBookings = await Booking.find({ status: 'Pending' }).populate(
    'showtime',
    'date time'
  );

  for (const b of pendingBookings) {
    const isLockAgeExpired = b.createdAt < cutoff;
    let isDeadlinePassed = false;
    if (b.showtime?.date && b.showtime?.time) {
      const win = evaluateBookingWindow(b.showtime.date, b.showtime.time, now);
      if (win.valid && !win.canPay) {
        isDeadlinePassed = true;
      }
    }
    if (!isLockAgeExpired && !isDeadlinePassed) continue;

    const transitioned = await Booking.findOneAndUpdate(
      { _id: b._id, status: 'Pending' },
      { $set: { status: 'Failed' } }
    );
    if (transitioned) {
      await Showtime.findByIdAndUpdate(b.showtime?._id || b.showtime, {
        $pull: { lockedSeats: { seat: { $in: b.seats } } }
      });
    }
  }
};

const findValidPromoForShowtime = async (promoCode, theaterId) => {
  if (!promoCode) return { promo: null };
  if (typeof promoCode !== 'string' || !promoCode.trim()) {
    return { error: 'Invalid promo code' };
  }
  const promo = await Promotion.findOne({ code: promoCode.trim().toUpperCase() });
  if (!promo) return { error: 'Invalid coupon code' };

  const todayStr = formatLocalDate(new Date());
  if (promo.expiry < todayStr) return { error: 'Coupon has expired' };
  if (!promo.isUnlimited && promo.used >= promo.limit) return { error: 'Coupon limit reached' };

  if (promo.scope === 'local') {
    const tIdStr = theaterId?.toString();
    const isApplicable = tIdStr && promo.theaterIds.some((id) => id.toString() === tIdStr);
    if (!isApplicable) {
      return { error: 'This offer is not valid at this specific cinema branch.' };
    }
  }

  return { promo };
};

const computeTier = (points) => {
  if (points >= 5000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Basic';
};

// GET /api/bookings/:id/pdf -> Download Ticket PDF (Server-side generated)
router.get('/:id/pdf', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate({
        path: 'showtime',
        populate: [{ path: 'movie' }, { path: 'theater' }]
      });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = booking.user?._id?.toString() === req.user.id;
    let isAuthorizedTheaterAdmin = false;
    if (req.user.role === 'theater_admin' && booking.showtime?.theater?._id) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      isAuthorizedTheaterAdmin = stringIds.includes(booking.showtime.theater._id.toString());
    }

    if (!isOwner && !isAdminRole(req.user.role) && !isAuthorizedTheaterAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'PDF Download is only available for Confirmed bookings' });
    }

    const pdfBuffer = await generateBookingPDF(booking);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=MoviGo_Ticket_${booking.bookingIdString}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});

// POST /api/bookings -> Step 1: Create 'Pending' booking and atomically lock seats
router.post('/', verifyToken, async (req, res) => {
  const { bookingIdString, showtimeId, seats, promoCode } = req.body || {};
  const userId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
      return res.status(400).json({ message: 'Valid showtimeId is required' });
    }

    const [showtime, user] = await Promise.all([
      Showtime.findById(showtimeId).populate('theater'),
      User.findById(userId)
    ]);

    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });
    if (!showtime.theater || showtime.theater.approvalStatus !== 'Approved') {
      return res.status(400).json({ message: 'Theater is unavailable for booking' });
    }
    if (!user) return res.status(401).json({ message: 'User account not found' });

    const bookingWindow = evaluateBookingWindow(showtime.date, showtime.time, new Date());
    if (!bookingWindow.valid || !bookingWindow.canBook) {
      return res.status(400).json({ message: bookingWindow.bookClosedMessage || 'Showtime is no longer available for booking' });
    }

    const screen = getScreenForShowtime(showtime);
    const seatValidation = validateSeatsAgainstScreen(seats, screen);
    if (!seatValidation.valid) {
      return res.status(400).json({ message: seatValidation.message });
    }
    const validSeats = seatValidation.seats;

    let promo = null;
    if (promoCode) {
      const promoCheck = await findValidPromoForShowtime(promoCode, showtime.theater._id);
      if (promoCheck.error) {
        return res.status(400).json({ message: promoCheck.error });
      }
      promo = promoCheck.promo;
    }

    // Cleanup expired locks first
    await cleanupLocks(showtimeId);

    const expiresAt = new Date(
      Math.min(Date.now() + LOCK_DURATION_MS, bookingWindow.finalPaymentDeadline.getTime())
    );
    const locks = validSeats.map((seat) => ({ seat, expiresAt }));

    // Atomic conditional lock to eliminate TOCTOU double-booking races
    const lockedShowtime = await Showtime.findOneAndUpdate(
      {
        _id: showtimeId,
        bookedSeats: { $nin: validSeats },
        'lockedSeats.seat': { $nin: validSeats }
      },
      {
        $push: { lockedSeats: { $each: locks } }
      },
      { new: true }
    );

    if (!lockedShowtime) {
      return res.status(400).json({ message: 'One or more seats are already taken or locked' });
    }

    const { totalAmount } = calculateBookingPricing({
      seats: validSeats,
      showtime,
      user,
      promo
    });

    const uniqueId =
      typeof bookingIdString === 'string' && bookingIdString.trim()
        ? bookingIdString.trim()
        : `BK-${crypto.randomInt(100000, 999999)}`;

    try {
      const newBooking = new Booking({
        bookingIdString: uniqueId,
        user: userId,
        showtime: showtimeId,
        seats: validSeats,
        totalAmount,
        pointsUsed: 0,
        promoCode: promo ? promo.code : null,
        status: 'Pending'
      });

      const savedBooking = await newBooking.save();
      res.status(201).json(savedBooking);
    } catch (saveErr) {
      // Rollback seat locks if booking creation failed
      await Showtime.findByIdAndUpdate(showtimeId, {
        $pull: { lockedSeats: { seat: { $in: validSeats } } }
      });
      throw saveErr;
    }
  } catch (error) {
    res.status(500).json({ message: 'Error creating pending booking', error: error.message });
  }
});

// POST /api/bookings/confirm -> Step 2: Confirm payment and finalize booking atomically
router.post('/confirm', verifyToken, async (req, res) => {
  const { bookingId } = req.body || {};
  try {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: 'Valid bookingId is required' });
    }

    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) return res.status(404).json({ message: 'Booking not found' });

    if (existingBooking.user.toString() !== req.user.id && !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (existingBooking.status !== 'Pending') {
      return res.status(400).json({ message: 'Booking is not in pending state' });
    }

    const bookingShowtime = await Showtime.findById(existingBooking.showtime);
    if (!bookingShowtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    const now = new Date();
    const initiatedWindow = evaluateBookingWindow(
      bookingShowtime.date,
      bookingShowtime.time,
      existingBooking.createdAt || now
    );
    const currentWindow = evaluateBookingWindow(bookingShowtime.date, bookingShowtime.time, now);
    const isHoldExpired =
      existingBooking.createdAt &&
      now.getTime() - new Date(existingBooking.createdAt).getTime() > LOCK_DURATION_MS;

    if (
      !currentWindow.valid ||
      !initiatedWindow.canBook ||
      !currentWindow.canPay ||
      isHoldExpired
    ) {
      await Booking.findOneAndUpdate(
        { _id: bookingId, status: 'Pending' },
        { $set: { status: 'Failed' } }
      );
      await Showtime.findByIdAndUpdate(existingBooking.showtime, {
        $pull: { lockedSeats: { seat: { $in: existingBooking.seats } } }
      });
      return res.status(400).json({
        message: !initiatedWindow.canBook
          ? initiatedWindow.bookClosedMessage
          : !currentWindow.canPay
            ? currentWindow.paymentExpiredMessage
            : 'Seat hold session expired. Please start a new booking.'
      });
    }

    // Atomically transition Pending -> Confirmed so concurrent requests cannot double-confirm
    const confirmedBooking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'Pending' },
      { $set: { status: 'Confirmed' } },
      { new: true }
    );
    if (!confirmedBooking) {
      return res.status(400).json({ message: 'Booking is already processed' });
    }

    let promoIncremented = false;
    if (confirmedBooking.promoCode) {
      const todayStr = formatLocalDate(new Date());
      const promoUpdated = await Promotion.findOneAndUpdate(
        {
          code: confirmedBooking.promoCode.toUpperCase(),
          expiry: { $gte: todayStr },
          $or: [
            { isUnlimited: true },
            { $expr: { $lt: ['$used', '$limit'] } }
          ]
        },
        { $inc: { used: 1 } },
        { new: true }
      );

      if (!promoUpdated) {
        await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'Pending' } });
        return res.status(400).json({ message: 'Applied promotion has expired or reached its usage limit' });
      }
      promoIncremented = true;
    }

    // Atomically move seats from locked to booked (guarding against already-booked seats)
    const updatedShowtime = await Showtime.findOneAndUpdate(
      {
        _id: confirmedBooking.showtime,
        bookedSeats: { $nin: confirmedBooking.seats }
      },
      {
        $pull: { lockedSeats: { seat: { $in: confirmedBooking.seats } } },
        $addToSet: { bookedSeats: { $each: confirmedBooking.seats } }
      },
      { new: true }
    );

    if (!updatedShowtime) {
      if (promoIncremented) {
        await Promotion.findOneAndUpdate(
          { code: confirmedBooking.promoCode.toUpperCase() },
          { $inc: { used: -1 } }
        );
      }
      await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'Failed' } });
      return res.status(400).json({ message: 'One or more seats are no longer available. Booking failed.' });
    }

    const pointsUsed = Math.max(0, Number(confirmedBooking.pointsUsed) || 0);
    const pointsEarned = confirmedBooking.seats.length * 10;

    if (pointsUsed > 0) {
      const deducted = await User.findOneAndUpdate(
        { _id: confirmedBooking.user, rewardPoints: { $gte: pointsUsed } },
        { $inc: { rewardPoints: pointsEarned - pointsUsed } },
        { new: true }
      );
      if (!deducted) {
        // Rollback showtime, promo, and booking status
        await Showtime.findByIdAndUpdate(confirmedBooking.showtime, {
          $pull: { bookedSeats: { $in: confirmedBooking.seats } }
        });
        if (promoIncremented) {
          await Promotion.findOneAndUpdate(
            { code: confirmedBooking.promoCode.toUpperCase() },
            { $inc: { used: -1 } }
          );
        }
        await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'Pending' } });
        return res.status(400).json({ message: 'Insufficient reward points' });
      }
      deducted.membershipLevel = computeTier(deducted.rewardPoints);
      await deducted.save();
    } else {
      const user = await User.findByIdAndUpdate(
        confirmedBooking.user,
        { $inc: { rewardPoints: pointsEarned } },
        { new: true }
      );
      if (user) {
        user.membershipLevel = computeTier(user.rewardPoints);
        await user.save();
      }
    }

    res.json({ message: 'Booking confirmed', booking: confirmedBooking });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming booking', error: error.message });
  }
});

// GET /api/bookings/user/:userId -> Get all bookings for a specific consumer
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (req.user.id !== req.params.userId && !isAdminRole(req.user.role)) {
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

// GET /api/bookings/:id -> Get specific booking details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate({
        path: 'showtime',
        populate: [{ path: 'movie' }, { path: 'theater' }]
      });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = booking.user?._id?.toString() === req.user.id;
    let isAuthorizedTheaterAdmin = false;
    if (req.user.role === 'theater_admin' && booking.showtime?.theater?._id) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      isAuthorizedTheaterAdmin = stringIds.includes(booking.showtime.theater._id.toString());
    }

    if (!isOwner && !isAdminRole(req.user.role) && !isAuthorizedTheaterAdmin) {
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
    await expireOldPendingBookings();

    let query = {};
    if (!isAdminRole(req.user.role)) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: 'User not found' });
      const { objectIds } = await getAuthorizedTheaterIds(req.user.id, user.theaterIds);
      const showtimeIds = await Showtime.find({ theater: { $in: objectIds } }).distinct('_id');
      query = { showtime: { $in: showtimeIds } };
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

// PUT /api/bookings/:id -> Update pending booking (recalculates totalAmount server-side)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id && !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (booking.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending bookings can be modified' });
    }

    const [showtime, user] = await Promise.all([
      Showtime.findById(booking.showtime).populate('theater'),
      User.findById(booking.user)
    ]);
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });

    const editWindow = evaluateBookingWindow(showtime.date, showtime.time, new Date());
    if (!editWindow.valid || !editWindow.canPay) {
      await Booking.findOneAndUpdate(
        { _id: booking._id, status: 'Pending' },
        { $set: { status: 'Failed' } }
      );
      await Showtime.findByIdAndUpdate(showtime._id, {
        $pull: { lockedSeats: { seat: { $in: booking.seats } } }
      });
      return res.status(400).json({ message: editWindow.paymentExpiredMessage });
    }

    const { promoCode } = req.body || {};
    let nextPromoCode = booking.promoCode;
    if (promoCode !== undefined) {
      nextPromoCode = promoCode ? String(promoCode).trim().toUpperCase() : null;
    }

    let promo = null;
    if (nextPromoCode) {
      const promoCheck = await findValidPromoForShowtime(nextPromoCode, showtime.theater?._id);
      if (promoCheck.error) {
        return res.status(400).json({ message: promoCheck.error });
      }
      promo = promoCheck.promo;
    }

    const { totalAmount } = calculateBookingPricing({
      seats: booking.seats,
      showtime,
      user,
      promo
    });

    booking.promoCode = promo ? promo.code : null;
    booking.totalAmount = totalAmount;
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking', error: error.message });
  }
});

// DELETE /api/bookings/:id -> Cancel/Release pending booking
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id && !isAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cancelled = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      { $set: { status: 'Cancelled' } },
      { new: true }
    );

    if (!cancelled) {
      return res.status(400).json({ message: 'Only pending bookings can be released' });
    }

    await Showtime.findByIdAndUpdate(booking.showtime, {
      $pull: { lockedSeats: { seat: { $in: booking.seats } } }
    });

    return res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error releasing booking', error: error.message });
  }
});

module.exports = router;
