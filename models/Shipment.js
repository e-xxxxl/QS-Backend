// models/Shipment.js
const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  terminalShipmentId: { type: String },
  trackingNumber: { type: String },
  origin: { type: Object },
  destination: { type: Object },
  packages: { type: Array, default: [] },
  quote: { type: Object },
  cost: { type: Number },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
