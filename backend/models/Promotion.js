const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'flat'], required: true },
  value: { type: Number, required: true },
  limit: { type: Number, default: 100 },
  used: { type: Number, default: 0 },
  isUnlimited: { type: Boolean, default: false },
  expiry: { type: String, required: true }, // e.g., '2026-12-31'
  scope: { type: String, enum: ['global', 'local'], default: 'global' },
  theaterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theater' }] // Multi-theater support
}, { timestamps: true });

module.exports = mongoose.model('Promotion', PromotionSchema);
