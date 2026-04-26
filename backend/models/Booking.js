const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingIdString: { type: String, required: true, unique: true }, // e.g. 'BK-1005'
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  showtime: { type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seats: [{ type: String, required: true }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Failed'], default: 'Pending' },
  pointsUsed: { type: Number, default: 0 },
  promoCode: { type: String, default: null },
  paymentIntentId: { type: String },
  isScanned: { type: Boolean, default: false },
  scannedAt: { type: Date, default: null },
  scannedByTheater: { type: require('mongoose').Schema.Types.ObjectId, ref: 'Theater', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
