const mongoose = require('mongoose');

const ShowtimeSchema = new mongoose.Schema({
  theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  date: { type: String, required: true }, // e.g. '2024-03-01'
  time: { type: String, required: true }, // e.g. '10:30 AM'
  screenNumber: { type: Number, required: true, default: 1 },
  bookedSeats: [{ type: String }], // e.g. ['F4', 'F5']
  lockedSeats: [{
    seat: String,
    lockedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Showtime', ShowtimeSchema);
