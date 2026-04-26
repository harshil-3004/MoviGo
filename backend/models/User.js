const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, default: null }, // Required for new registrations, optional to allow seed compatibility
  password: { type: String, required: true },
  profilePhoto: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin', 'theater_admin'], default: 'user' },
  theaterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theater' }], // Bound to specific theaters if role is theater_admin
  rewardPoints: { type: Number, default: 0 },
  membershipLevel: { type: String, enum: ['Basic', 'Silver', 'Gold'], default: 'Basic' },
  isMember: { type: Boolean, default: false },
  membershipExpiry: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
