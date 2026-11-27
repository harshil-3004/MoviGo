const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const { isAdminRole, getAuthorizedTheaterIds } = require('../utils/authHelpers');

// GET /api/stats -> Dashboard Analytics (Filtered for Theater Admins)
router.get('/', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const isTheaterAdmin = !isAdminRole(req.user.role);
    let theaterFilter = {};

    if (isTheaterAdmin) {
      const { objectIds: allAuthorizedIds } = await getAuthorizedTheaterIds(
        req.user.id,
        req.user.theaterIds
      );
      theaterFilter = { 'showtimeDetails.theater': { $in: allAuthorizedIds } };
    }

    const baseMatch = { status: 'Confirmed' };

    // 1. Total Bookings & 2. Total Revenue
    const mainStats = await Booking.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: 'showtimes',
          localField: 'showtime',
          foreignField: '_id',
          as: 'showtimeDetails'
        }
      },
      { $unwind: '$showtimeDetails' },
      ...(isTheaterAdmin ? [{ $match: theaterFilter }] : []),
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalBookings = mainStats.length > 0 ? mainStats[0].count : 0;
    const totalRevenue = mainStats.length > 0 ? mainStats[0].totalRevenue : 0;

    // 3. Total Users
    const totalUsers = isTheaterAdmin ? 0 : await User.countDocuments({ role: 'user' });

    // 4. Top Performing Movies
    const topMovies = await Booking.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: 'showtimes',
          localField: 'showtime',
          foreignField: '_id',
          as: 'showtimeDetails'
        }
      },
      { $unwind: '$showtimeDetails' },
      ...(isTheaterAdmin ? [{ $match: theaterFilter }] : []),
      { $group: { _id: '$showtimeDetails.movie', bookingCount: { $sum: 1 } } },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movieDetails'
        }
      },
      { $unwind: '$movieDetails' },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $project: {
          title: '$movieDetails.title',
          bookingCount: 1,
          poster: '$movieDetails.poster'
        }
      }
    ]);

    // 5. Revenue by Day (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueByDay = await Booking.aggregate([
      { $match: { status: 'Confirmed', createdAt: { $gte: sevenDaysAgo } } },
      {
        $lookup: {
          from: 'showtimes',
          localField: 'showtime',
          foreignField: '_id',
          as: 'showtimeDetails'
        }
      },
      { $unwind: '$showtimeDetails' },
      ...(isTheaterAdmin ? [{ $match: theaterFilter }] : []),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 6. Genre Distribution
    const genreDistribution = await Booking.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: 'showtimes',
          localField: 'showtime',
          foreignField: '_id',
          as: 'showtimeDetails'
        }
      },
      { $unwind: '$showtimeDetails' },
      ...(isTheaterAdmin ? [{ $match: theaterFilter }] : []),
      {
        $lookup: {
          from: 'movies',
          localField: 'showtimeDetails.movie',
          foreignField: '_id',
          as: 'movieData'
        }
      },
      { $unwind: '$movieData' },
      {
        $group: {
          _id: '$movieData.genre',
          value: { $sum: 1 }
        }
      },
      { $project: { name: '$_id', value: 1, _id: 0 } }
    ]);

    res.json({
      totalBookings,
      totalRevenue,
      totalUsers,
      topMovies,
      revenueByDay,
      genreDistribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;
