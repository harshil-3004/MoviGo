const mongoose = require('mongoose');

const RedeemableItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  pointCost: { type: Number, required: true },
  image: { type: String }, // URL to image
  category: { type: String, enum: ['Snacks', 'Drinks', 'Merchandise', 'Tickets', 'Experiences'], default: 'Snacks' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('RedeemableItem', RedeemableItemSchema);
