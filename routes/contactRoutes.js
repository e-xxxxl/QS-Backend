const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');
const {
  apiLimiter,
  strictLimiter,
  otpLimiter,
  loginLimiter,
  purchaseLimiter
} = require('../middleware/rateLimiter');
// @route   POST /api/contact
// @desc    Send contact form email
// @access  Public
router.post('/us', apiLimiter, sendContactEmail);

module.exports = router;