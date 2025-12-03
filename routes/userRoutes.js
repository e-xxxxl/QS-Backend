const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  addShippingAddress,
  getShippingAddresses,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress
} = require('../controllers/userController');

// All routes are protected (require authentication)
router.use(protect);

// Shipping address routes
router.post('/shipping-address', addShippingAddress);
router.get('/shipping-addresses', getShippingAddresses);
router.put('/shipping-address/:addressId', updateShippingAddress);
router.delete('/shipping-address/:addressId', deleteShippingAddress);
router.put('/shipping-address/:addressId/set-default', setDefaultShippingAddress);

// Test route
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User routes are working!',
    user: req.user
  });
});

module.exports = router;