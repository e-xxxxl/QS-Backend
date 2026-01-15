const mongoose = require('mongoose');


const quoteSchema = new mongoose.Schema({
  fromCountry: {
    type: String,
    required: true
  },
  fromState: {
    type: String,
    required: true
  },
  fromCity: {
    type: String,
    required: true
  },
  toCountry: {
    type: String,
    required: true
  },
  toState: {
    type: String,
    required: true
  },
  toCity: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  quotes: [{
    carrier: String,
    service: String,
    estimatedDelivery: String,
    amount: Number,
    currency: String,
    carrierLogo: String,
    tracking: Boolean,
    insurance: Boolean,
    pickupRequired: Boolean
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quote', quoteSchema);