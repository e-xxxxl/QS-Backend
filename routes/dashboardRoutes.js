const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getRecentShipments, 
  getQuickStats,
  getShipmentActivity,getShipmentDetails 
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Quick stats for dashboard widgets
router.get('/quick-stats', getQuickStats);

// Recent shipments with pagination and filtering
router.get('/shipments/recent', getRecentShipments);

// Shipment activity timeline
router.get('/activity', getShipmentActivity);
router.get('/shipments/:id', protect, getShipmentDetails);

module.exports = router;