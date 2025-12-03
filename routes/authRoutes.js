const express = require('express');
const router = express.Router();
const { 
  signup, 
  verifyOTP, 
  resendOTP, 
  login,
  forgotPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are working!'
  });
});

module.exports = router;