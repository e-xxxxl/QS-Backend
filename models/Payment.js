// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
  gateway: { type: String }, // paystack
  gatewayRef: { type: String },
  amount: { type: Number },
  status: { type: String } // pending, success, failed
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
