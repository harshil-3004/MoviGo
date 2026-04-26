const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  genre: { type: String, required: true },
  rating: { type: Number, default: 0 },
  poster: { type: String, required: true },
  backdrop: { type: String },
  duration: { type: String }, // e.g., '2h 15m'
  releaseDate: { type: String }, // e.g., '2024-03-01'
  isUpcoming: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  trailerUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Movie', MovieSchema);
