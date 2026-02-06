const express = require('express');
const router = express.Router();
const { 
  signup, 
  verifyOTP, 
  resendOTP, 
  login,
  forgotPassword,
    resetPassword
} = require('../controllers/authController');

const {
  apiLimiter,
  strictLimiter,
  purchaseLimiter
} = require('../middleware/rateLimiter'); // Import rate limiters


const { protect } = require('../middleware/authMiddleware');

// Public routes
router.use(strictLimiter);
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword); // Add this route

router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are working!'
  });
});

module.exports = router;