// routes/newsletterRoutes.js
const express = require('express');
const router = express.Router();
const {
  subscribeNewsletter,
  getNewsletterSubscribers,
  downloadNewsletterCSV,
  getNewsletterStats,
  deleteSubscriber
} = require('../controllers/newsletterController');

// Public route - for users to subscribe
router.post('/subscribe', subscribeNewsletter);

// Admin routes - protected
router.get('/subscribers',  getNewsletterSubscribers);
router.get('/download',  downloadNewsletterCSV);
router.get('/stats',  getNewsletterStats);
router.delete('/subscribers/:id',  deleteSubscriber);

module.exports = router;