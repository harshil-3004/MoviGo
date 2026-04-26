const mongoose = require('mongoose');

const RedemptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'RedeemableItem', required: true },
  uniqueCode: { type: String, required: true, unique: true }, // e.g. "RDM-A3F9X2"
  pointsSpent: { type: Number, required: true },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date, default: null },
  usedByTheater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', default: null },
  usedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Redemption', RedemptionSchema);
