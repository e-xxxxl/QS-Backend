const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getMe,
  adminLogout
} = require('../controllers/adminAuthController');
const { protect } = require('../middleware/adminAuthMiddleware');

// Public routes
router.post('/login', adminLogin);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, adminLogout);

module.exports = router;