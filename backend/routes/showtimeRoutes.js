const express = require('express');
const router = express.Router();
const Showtime = require('../models/Showtime');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');

// Helper: check if a showtime is still active (not expired)
const isShowtimeActive = (showtime) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  if (!showtime.date) return true;
  
  // If the show date is in the future, it's definitely active
  if (showtime.date > todayStr) return true;
  
  // If the show date is in the past, it's expired
  if (showtime.date < todayStr) return false;
  
  // If the show is today, check the time
  if (showtime.date === todayStr && showtime.time) {
    const timeStr = showtime.time;
    let showMinutes = 0;
    if (/AM|PM/i.test(timeStr)) {
      const [time, period] = timeStr.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      showMinutes = h * 60 + (m || 0);
    } else {
      const [h, m] = timeStr.split(':').map(Number);
      showMinutes = h * 60 + (m || 0);
    }
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes <= showMinutes;
  }
  
  return true;
};

// GET /api/showtimes/movie/:movieId -> Get active showtimes for a specific movie (Public)
router.get('/movie/:movieId', async (req, res) => {
  try {
    const showtimes = await Showtime.find({ movie: req.params.movieId })
      .populate('theater')
      .sort({ date: 1, time: 1 });
    
    // Filter out expired showtimes for public browsing
    const active = showtimes.filter(isShowtimeActive);
    res.json(active);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching showtimes', error: error.message });
  }
});

// GET /api/showtimes/theater/:theaterId -> Get active showtimes for a specific theater (Public)
router.get('/theater/:theaterId', async (req, res) => {
  try {
    const showtimes = await Showtime.find({ theater: req.params.theaterId })
      .populate('movie')
      .populate('theater')
      .sort({ date: 1, time: 1 });
    
    // Filter out expired showtimes for public browsing
    const active = showtimes.filter(isShowtimeActive);
    res.json(active);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching theater showtimes', error: error.message });
  }
});

// GET /api/showtimes/:id -> Get specific showtime details (Public)
router.get('/:id', async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id)
      .populate('theater')
      .populate('movie');
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });
    
    // Filter out expired locks before sending
    const now = new Date();
    showtime.lockedSeats = showtime.lockedSeats.filter(ls => ls.expiresAt > now);
    
    res.json(showtime);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching showtime', error: error.message });
  }
});

// POST /api/showtimes -> Add a new showtime (Admin/Theater Manager)
router.post('/', verifyToken, theaterAdminOnly, async (req, res) => {
  // If endDate is provided, we do bulk generation
  const { theater, movie, date, endDate, time, screenNumber } = req.body;
  try {
    const Theater = require('../models/Theater');
    const theaterDoc = await Theater.findById(theater);
    if (!theaterDoc || theaterDoc.approvalStatus !== 'Approved') {
        return res.status(403).json({ message: 'Cannot add showtimes to an unapproved theater' });
    }

    if (endDate) {
      // Bulk generation
      let currentDate = new Date(date);
      const end = new Date(endDate);
      const newShowtimes = [];
      
      while (currentDate <= end) {
        const currentDateString = currentDate.toISOString().split('T')[0];
        const newShowtime = new Showtime({
          theater,
          movie,
          screenNumber,
          date: currentDateString,
          time,
          bookedSeats: [],
          lockedSeats: []
        });
        newShowtimes.push(newShowtime);
        
        // Add 1 day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const saved = await Showtime.insertMany(newShowtimes);
      return res.status(201).json(saved);
      
    } else {
      // Single generation
      const newShowtime = new Showtime({
        theater,
        movie,
        screenNumber,
        date,
        time,
        bookedSeats: [],
        lockedSeats: []
      });
      const saved = await newShowtime.save();
      return res.status(201).json(saved);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error creating showtime(s)', error: error.message });
  }
});

// PUT /api/showtimes/:id -> Update a showtime (Admin/Theater Manager)
router.put('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const updated = await Showtime.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('theater');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating showtime', error: error.message });
  }
});

// DELETE /api/showtimes/:id -> Delete a showtime (Admin/Theater Manager)
router.delete('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    await Showtime.findByIdAndDelete(req.params.id);
    res.json({ message: 'Showtime deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting showtime', error: error.message });
  }
});

module.exports = router;
