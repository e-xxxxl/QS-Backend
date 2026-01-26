// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/adminAuthMiddleware');
const {
  getMonthlyShipments,
  getRevenueTrend,
  getUserGrowth
} = require('../controllers/analyticsController');

router.use(protect);

router.get('/shipments/monthly', getMonthlyShipments);
router.get('/revenue/trend', getRevenueTrend);
router.get('/users/growth', getUserGrowth);

module.exports = router;