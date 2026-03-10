// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/adminAuthMiddleware'); // New middleware
const {
  getDashboardStats,
  getAllUsers,
  getAllShipments,
  updateShipmentStatus,
  updateUserStatus,
  deleteUser,
  deleteShipment,
  updateShipment,
  updateUser,
   adminCreateShipmentBypass,
  verifyAdminPasscode,
   adminCreateAddress,
  adminCreateParcel,
  adminGetShippingRates,    
} = require('../controllers/adminController');

// All routes protected by admin auth
router.use(protect);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);

// User management routes
router.get('/users', getAllUsers);

router.post('/shipments/address',  adminCreateAddress);
router.post('/shipments/parcel', adminCreateParcel);
router.post('/shipments/rates', adminGetShippingRates);
router.post('/shipments/create-bypass', adminCreateShipmentBypass);
router.post('/verify-passcode', verifyAdminPasscode);
router.patch('/users/:id/status', updateUserStatus);

// Shipment management routes
router.get('/shipments', getAllShipments);
router.patch('/shipments/:id/status', updateShipmentStatus);
router.delete('/users/:id',  deleteUser);
router.put('/shipments/:id', updateShipment); // Add this line
// Add this route
router.put('/users/:id', updateUser);
router.delete('/shipments/:id',  deleteShipment);



module.exports = router;