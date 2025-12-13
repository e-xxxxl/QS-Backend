const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Terminal Africa reference
  terminalShipmentId: {
    type: String,
    required: true,
    unique: true
  },
  
  trackingNumber: {
    type: String
  },
  
  reference: {
    type: String
  },
  
  status: {
    type: String,
    enum: ['draft', 'pending', 'processing', 'in_transit', 'delivered', 'cancelled', 'exception'],
    default: 'draft'
  },
  
   // Sender details - make some fields optional
  sender: {
    name: { type: String, required: true },
    email: { type: String }, // REMOVE required
    phone: { type: String }, // REMOVE required
    address: { type: String, required: true },
    address2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zip: String
  },
  
  // Receiver details - make some fields optional
  receiver: {
    name: { type: String, required: true },
    email: { type: String }, // REMOVE required
    phone: { type: String }, // REMOVE required
    address: { type: String, required: true },
    address2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zip: String
  },
  
  // Parcel details - keep required as you already have them from frontend
  parcel: {
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    weight: { type: Number, required: true },
    items: [{
      description: String,
      quantity: Number,
      value: Number,
      currency: String,
      weight: Number
    }]
  },
  
  // Shipping details
  shipping: {
    carrier: {
      type: String,
      required: true
    },
    carrier_name: {
      type: String,
      required: true
    },
    service: {
      type: String,
      required: true
    },
    rate_id: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    estimated_delivery: Date
  },
  
  // Insurance
  insurance: {
    is_insured: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      default: 0
    },
    provider: String
  },
  
  // Packaging
  packaging: {
    type: {
      type: String,
      enum: ['custom', 'envelope', 'pak', 'tube', 'box', 'pallet'],
      default: 'custom'
    },
    description: String
  },
  
  // Delivery instructions
  deliveryInstructions: String,
  
  // Payment
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true
    },
    method: String,
    transactionId: String,
    paidAt: Date
    }
  }, { timestamps: true });

// Indexes
shipmentSchema.index({ terminalShipmentId: 1 }, { unique: true });
shipmentSchema.index({ trackingNumber: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);