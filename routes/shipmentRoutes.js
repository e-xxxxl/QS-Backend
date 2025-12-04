const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getShippingRates,
  createAddress,
  createParcel,
  createShipment,
  purchaseShipment,
  getUserShipments,
  getShipmentById,
  cancelShipment,
  getCarriers
} = require('../controllers/shipmentController');

// All routes are protected
router.use(protect);

// Create address on Terminal Africa
router.post('/address', createAddress);

// Create parcel on Terminal Africa
router.post('/parcel', createParcel);

// Get shipping rates
router.post('/rates', getShippingRates);

// Create shipment
router.post('/create', createShipment);

// Purchase shipment
router.post('/:id/purchase', purchaseShipment);

// Get user shipments
router.get('/', getUserShipments);

// Get shipment by ID
router.get('/:id', getShipmentById);

// Cancel shipment
router.post('/:id/cancel', cancelShipment);

// Get available carriers
router.get('/carriers/all', getCarriers);

module.exports = router;