// const express = require('express');
// const router = express.Router();
// const { 
//   signup, 
//   verifyOTP, 
//   resendOTP, 
//   login,
//   forgotPassword,
//     resetPassword
// } = require('../controllers/authController');

// const {
//   apiLimiter,
//   strictLimiter,
//   purchaseLimiter
// } = require('../middleware/rateLimiter'); // Import rate limiters


// const { protect } = require('../middleware/authMiddleware');

// // Public routes
// router.use(strictLimiter);
// router.post('/signup', signup);
// router.post('/verify-otp', verifyOTP);
// router.post('/resend-otp', resendOTP);
// router.post('/login', login);
// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password', resetPassword); // Add this route

// router.get('/test', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Auth routes are working!'
//   });
// });

// module.exports = router;



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
  otpLimiter,
  loginLimiter,
  purchaseLimiter
} = require('../middleware/rateLimiter');

const { protect } = require('../middleware/authMiddleware');

// Public routes with specific rate limiters
router.post('/signup', strictLimiter, signup);
router.post('/verify-otp', otpLimiter, verifyOTP); // More lenient for OTP verification
router.post('/resend-otp', strictLimiter, resendOTP); // Stricter for resend
router.post('/login',  login); // Use login-specific limiter
router.post('/forgot-password', strictLimiter, forgotPassword);
router.post('/reset-password', apiLimiter, resetPassword);

// Test route (no limiter needed)
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are working!'
  });
});

module.exports = router;