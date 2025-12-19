const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// ========== PAYMENT ROUTES ==========

router.post('/initialize', paymentController.initializePayment);
router.get('/verify/:reference', paymentController.verifyPayment);
router.post('/verify-and-create', paymentController.verifyAndCreateShipment);
router.post('/create-shipment', paymentController.createShipmentWithPayment);
router.get('/history', paymentController.getPaymentHistory);
router.post('/rates-with-quote', paymentController.getRatesWithQuote);

// Utility routes
router.get('/check-transaction/:reference', paymentController.checkTransaction);
router.post('/refund', paymentController.initiateRefund);
router.get('/supported-currencies', paymentController.getSupportedCurrencies);

// Webhook route (no auth)
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    console.log('📩 Paystack Webhook Received:', event.event);
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;