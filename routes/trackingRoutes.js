const express = require('express');
const router = express.Router();
const { trackShipment, getShipmentDetails } = require('../controllers/trackingController');

// @route   POST /api/tracking/track
// @desc    Track a shipment
router.post('/track', trackShipment);

// @route   GET /api/tracking/:shipment_id
// @desc    Track a shipment by ID (GET version)
router.get('/:shipment_id', trackShipment);

// @route   GET /api/tracking/:shipment_id/details
// @desc    Get detailed shipment information
router.get('/:shipment_id/details', getShipmentDetails);

module.exports = router;