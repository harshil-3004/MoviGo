const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Showtime = require('../models/Showtime');
const Theater = require('../models/Theater');
const Movie = require('../models/Movie');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const { formatLocalDate, isValidISODate, evaluateBookingWindow } = require('../utils/dateUtils');
const { isAdminRole, getAuthorizedTheaterIds } = require('../utils/authHelpers');

// Helper: show stays visible for booking until 45 minutes after show start
const isShowtimeActive = (showtime, now = new Date()) => {
  if (!showtime?.date) return true;
  if (!showtime?.time) {
    return showtime.date >= formatLocalDate(now);
  }
  const win = evaluateBookingWindow(showtime.date, showtime.time, now);
  return win.valid ? win.canBook : false;
};

// GET /api/showtimes/movie/:movieId -> Get active showtimes for a specific movie (Public)
router.get('/movie/:movieId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.movieId)) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    const showtimes = await Showtime.find({ movie: req.params.movieId })
      .populate('theater')
      .sort({ date: 1, time: 1 });

    const active = showtimes.filter(
      (s) => s.theater && s.theater.approvalStatus === 'Approved' && isShowtimeActive(s)
    );
    res.json(active);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching showtimes', error: error.message });
  }
});

// GET /api/showtimes/theater/:theaterId -> Get active showtimes for a specific theater (Public)
router.get('/theater/:theaterId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.theaterId)) {
      return res.status(404).json({ message: 'Theater not found' });
    }
    const showtimes = await Showtime.find({ theater: req.params.theaterId })
      .populate('movie')
      .populate('theater')
      .sort({ date: 1, time: 1 });

    const active = showtimes.filter((s) => s.movie && s.theater && isShowtimeActive(s));
    res.json(active);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching theater showtimes', error: error.message });
  }
});

// GET /api/showtimes/:id -> Get specific showtime details (Public)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Showtime not found' });
    }
    const showtime = await Showtime.findById(req.params.id)
      .populate('theater')
      .populate('movie');
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });

    const now = new Date();
    showtime.lockedSeats = showtime.lockedSeats.filter((ls) => ls.expiresAt > now);

    res.json(showtime);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching showtime', error: error.message });
  }
});

// POST /api/showtimes -> Add a new showtime (Admin/Authorized Theater Manager)
router.post('/', verifyToken, theaterAdminOnly, async (req, res) => {
  const { theater, movie, date, endDate, time, screenNumber } = req.body || {};
  try {
    if (!mongoose.Types.ObjectId.isValid(theater) || !mongoose.Types.ObjectId.isValid(movie)) {
      return res.status(400).json({ message: 'Valid theater and movie IDs are required' });
    }
    if (!isValidISODate(date) || typeof time !== 'string' || !time.trim()) {
      return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) and time are required' });
    }

    const [theaterDoc, movieDoc] = await Promise.all([
      Theater.findById(theater),
      Movie.findById(movie)
    ]);

    if (!theaterDoc || theaterDoc.approvalStatus !== 'Approved') {
      return res.status(403).json({ message: 'Cannot add showtimes to an unapproved theater' });
    }
    if (!movieDoc) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    if (!isAdminRole(req.user.role)) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      if (!stringIds.includes(theaterDoc._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to schedule showtimes for this theater' });
      }
    }

    const screenNum = Number(screenNumber) || 1;
    const trimmedTime = time.trim();

    if (endDate) {
      if (!isValidISODate(endDate)) {
        return res.status(400).json({ message: 'Invalid endDate format (expected YYYY-MM-DD)' });
      }
      if (endDate < date) {
        return res.status(400).json({ message: 'endDate must be on or after start date' });
      }

      const [sy, sm, sd] = date.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const startUtc = new Date(Date.UTC(sy, sm - 1, sd));
      const endUtc = new Date(Date.UTC(ey, em - 1, ed));
      const daySpan = Math.round((endUtc - startUtc) / 86400000) + 1;

      if (daySpan > 90) {
        return res.status(400).json({ message: 'Bulk showtime scheduling is limited to 90 days at a time' });
      }

      const newShowtimes = [];
      for (let i = 0; i < daySpan; i++) {
        const d = new Date(Date.UTC(sy, sm - 1, sd + i));
        const currentDateString = d.toISOString().split('T')[0];
        newShowtimes.push({
          theater,
          movie,
          screenNumber: screenNum,
          date: currentDateString,
          time: trimmedTime,
          bookedSeats: [],
          lockedSeats: []
        });
      }

      const saved = await Showtime.insertMany(newShowtimes);
      return res.status(201).json(saved);
    }

    const newShowtime = new Showtime({
      theater,
      movie,
      screenNumber: screenNum,
      date,
      time: trimmedTime,
      bookedSeats: [],
      lockedSeats: []
    });
    const saved = await newShowtime.save();
    return res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Error creating showtime(s)', error: error.message });
  }
});

// PUT /api/showtimes/:id -> Update a showtime (Admin/Authorized Theater Manager)
router.put('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    const existing = await Showtime.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Showtime not found' });

    if (!isAdminRole(req.user.role)) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      if (!stringIds.includes(existing.theater.toString())) {
        return res.status(403).json({ message: 'Not authorized to update this showtime' });
      }
      if (req.body?.theater && !stringIds.includes(req.body.theater.toString())) {
        return res.status(403).json({ message: 'Not authorized for target theater' });
      }
    }

    const updates = {};
    const { movie, screenNumber, date, time, theater } = req.body || {};
    if (movie && mongoose.Types.ObjectId.isValid(movie)) updates.movie = movie;
    if (theater && mongoose.Types.ObjectId.isValid(theater)) updates.theater = theater;
    if (screenNumber !== undefined) updates.screenNumber = Number(screenNumber) || 1;
    if (date && isValidISODate(date)) updates.date = date;
    if (typeof time === 'string' && time.trim()) updates.time = time.trim();

    const updated = await Showtime.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('theater');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating showtime', error: error.message });
  }
});

// DELETE /api/showtimes/:id -> Delete a showtime (Admin/Authorized Theater Manager)
router.delete('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    const existing = await Showtime.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Showtime not found' });

    if (!isAdminRole(req.user.role)) {
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      if (!stringIds.includes(existing.theater.toString())) {
        return res.status(403).json({ message: 'Not authorized to delete this showtime' });
      }
    }

    await Showtime.findByIdAndDelete(req.params.id);
    res.json({ message: 'Showtime deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting showtime', error: error.message });
  }
});

module.exports = router;
