const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const { verifyToken, adminOnly } = require('../middleware/authMiddleware');

// GET /api/movies -> Get all movies (Public)
// Auto-syncs isUpcoming based on releaseDate in real-time
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Auto-promote: any movie whose releaseDate has arrived becomes not-upcoming
    await Movie.updateMany(
      { isUpcoming: true, releaseDate: { $lte: now.toISOString().split('T')[0] } },
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
    const newMovie = new Movie(req.body);
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (error) {
    res.status(500).json({ message: 'Error adding movie', error: error.message });
  }
});

// PUT /api/movies/:id -> Update movie (Admin Only)
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    if (req.body.isFeatured === true) {
      // Unset all other featured movies
      await Movie.updateMany({ _id: { $ne: req.params.id } }, { isFeatured: false });
    }
    const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedMovie) return res.status(404).json({ message: 'Movie not found' });
    res.json(updatedMovie);
  } catch (error) {
    res.status(500).json({ message: 'Error updating movie', error: error.message });
  }
});

// DELETE /api/movies/:id -> Delete movie (Admin Only)
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
    if (!deletedMovie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting movie', error: error.message });
  }
});

module.exports = router;
