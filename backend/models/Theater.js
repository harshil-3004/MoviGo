const mongoose = require('mongoose');

const TheaterSchema = new mongoose.Schema({
  idString: { type: String, required: true, unique: true }, // e.g. 't1' for easy matching with existing frontend mock logic
  name: { type: String, required: true },
  location: { type: String, required: true },
  format: { type: String, required: true },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  screens: [{
    number: { type: Number, required: true },
    name: { type: String, required: true },
    rows: { type: Number, default: 10 },
    cols: { type: Number, default: 12 },
    layout: [[{
      type: { type: String, enum: ['seat', 'aisle'], default: 'seat' },
      isReserved: { type: Boolean, default: false }
    }]],
    pricing: { type: Map, of: Number } // rowName -> price
  }]
}, { timestamps: true });

module.exports = mongoose.model('Theater', TheaterSchema);
