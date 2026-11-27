const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');
const { formatLocalDate } = require('../utils/dateUtils');

// GET /api/movies -> Get all movies (Public)
// Auto-syncs isUpcoming based on releaseDate in real-time
router.get('/', async (req, res) => {
  try {
    const todayStr = formatLocalDate(new Date());

    // Auto-promote: any movie whose non-empty releaseDate has arrived becomes not-upcoming
    await Movie.updateMany(
      { isUpcoming: true, releaseDate: { $exists: true, $ne: '', $lte: todayStr } },
      { $set: { isUpcoming: false } }
    );

    const movies = await Movie.find({});
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching movies', error: error.message });
  }
});

// GET /api/movies/:id -> Get specific movie details (Public)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching movie details', error: error.message });
  }
});

// POST /api/movies -> Add new movie (Admin Only)
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const {
      title, description, genre, rating, poster, backdrop,
      duration, releaseDate, isUpcoming, isFeatured, trailerUrl
    } = req.body || {};

    if (!title || !description || !genre || !poster) {
      return res.status(400).json({ message: 'Title, description, genre, and poster are required' });
    }

    if (isFeatured === true) {
      await Movie.updateMany({}, { isFeatured: false });
    }

    const newMovie = new Movie({
      title, description, genre, rating, poster, backdrop,
      duration, releaseDate, isUpcoming, isFeatured, trailerUrl
    });
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (error) {
    res.status(400).json({ message: 'Error adding movie', error: error.message });
  }
});

// PUT /api/movies/:id -> Update movie (Admin Only)
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const allowed = [
      'title', 'description', 'genre', 'rating', 'poster',
      'backdrop', 'duration', 'releaseDate', 'isUpcoming', 'isFeatured', 'trailerUrl'
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.isFeatured === true) {
      await Movie.updateMany({ _id: { $ne: req.params.id } }, { isFeatured: false });
    }

    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!updatedMovie) return res.status(404).json({ message: 'Movie not found' });
    res.json(updatedMovie);
  } catch (error) {
    res.status(400).json({ message: 'Error updating movie', error: error.message });
  }
});

// DELETE /api/movies/:id -> Delete movie (Admin Only)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
    if (!deletedMovie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting movie', error: error.message });
  }
});

module.exports = router;
