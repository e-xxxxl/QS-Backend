const express = require('express');
const router = express.Router();
const {
  sendShipmentConfirmation,
  sendPaymentConfirmation,
  sendShipmentStatusUpdate,
  sendPaymentAndShipmentEmails,
  processShipmentEmailQueue
} = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Send shipment confirmation
router.post('/shipment-confirmation', sendShipmentConfirmation);

// Send payment confirmation
router.post('/payment-confirmation', sendPaymentConfirmation);

// Send shipment status update
router.post('/status-update', sendShipmentStatusUpdate);

// Send combined payment and shipment emails
router.post('/send-all', async (req, res) => {
  try {
    const { paymentData, shipmentData } = req.body;
    const userId = req.user._id;

    await sendPaymentAndShipmentEmails(userId, paymentData, shipmentData);

    res.status(200).json({
      success: true,
      message: 'Emails queued successfully'
    });

  } catch (error) {
    console.error('Error sending all emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emails'
    });
  }
});

// Process shipment email queue (for admin/webhook)
router.post('/process-queue/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;

    await processShipmentEmailQueue(shipmentId);

    res.status(200).json({
      success: true,
      message: 'Email queue processed'
    });

  } catch (error) {
    console.error('Error processing email queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process email queue'
    });
  }
});

module.exports = router;