const Paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { sendShipmentConfirmation, sendPaymentAndShipmentEmails } = require('./emailController');
const terminalAfricaService = require('../utils/terminalAfricaService');

// @desc    Initialize Paystack payment
// @route   POST /api/payments/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      email, 
      amount, 
      currency = 'NGN',
      metadata = {},
      shipment_data // Optional: shipment data to create after payment
    } = req.body;

    console.log('💰 Initializing Paystack payment for user:', userId);

    // Validate required fields
    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Email and amount are required'
      });
    }

    // Convert amount to kobo (smallest currency unit for Naira)
    const amountInKobo = Math.round(amount * 100);

    // Prepare metadata
    const paymentMetadata = {
      userId: userId.toString(),
      ...metadata,
      timestamp: new Date().toISOString()
    };

    // If shipment data is provided, store it temporarily
    if (shipment_data) {
      paymentMetadata.shipment_data = shipment_data;
    }

    // Initialize Paystack transaction
    const response = await Paystack.transaction.initialize({
      email,
      amount: amountInKobo,
      currency,
      metadata: paymentMetadata,
      callback_url: `${process.env.FRONTEND_URL}/payment-callback`,
      channels: ['card', 'bank_transfer', 'ussd']
    });

    console.log('✅ Paystack payment initialized:', response.data.reference);

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: response.data.authorization_url,
        access_code: response.data.access_code,
        reference: response.data.reference,
        amount: amount,
        currency: currency
      }
    });

  } catch (error) {
    console.error('❌ Error initializing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// @desc    Verify Paystack payment
// @route   GET /api/payments/verify/:reference
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user._id;

    console.log('🔍 Verifying payment with reference:', reference);

    // Verify payment with Paystack
    const response = await Paystack.transaction.verify(reference);

    const paymentData = response.data;

    console.log('📊 Payment verification result:', {
      reference: paymentData.reference,
      status: paymentData.status,
      amount: paymentData.amount / 100,
      paidAt: paymentData.paid_at
    });

    if (paymentData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Payment ${paymentData.status}`,
        data: paymentData
      });
    }

    // Extract metadata
    const metadata = paymentData.metadata || {};
    const shipmentData = metadata.shipment_data;

    let createdShipment = null;
    let shipmentCount = 0;

    // If there's shipment data in metadata, create shipment
    if (shipmentData && metadata.userId === userId.toString()) {
      console.log('🚚 Creating shipment after successful payment...');

      try {
        // Import shipment controller
        const shipmentController = require('./shipmentController');
        
        // Create shipment
        const shipment = new Shipment({
          user: userId,
          ...shipmentData,
          payment: {
            status: 'paid',
            amount: paymentData.amount / 100,
            currency: paymentData.currency,
            method: paymentData.channel,
            transactionId: reference,
            reference: reference,
            paidAt: new Date(paymentData.paid_at)
          }
        });

        await shipment.save();
        createdShipment = shipment;
        
        console.log('✅ Shipment created:', shipment._id);
      } catch (shipmentError) {
        console.error('❌ Error creating shipment after payment:', shipmentError);
        // Don't fail the payment verification - just log the error
      }
    }

    // Get user's total shipment count
    shipmentCount = await Shipment.countDocuments({ user: userId });

    // Update user's last payment info (optional)
    await User.findByIdAndUpdate(userId, {
      lastPayment: {
        amount: paymentData.amount / 100,
        currency: paymentData.currency,
        date: new Date(paymentData.paid_at),
        reference: reference
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment: {
          reference: paymentData.reference,
          status: paymentData.status,
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          channel: paymentData.channel,
          paidAt: paymentData.paid_at,
          metadata: paymentData.metadata
        },
        shipment: createdShipment,
        shipmentCount: shipmentCount,
        nextSteps: createdShipment ? [
          'Shipment has been created successfully',
          'Tracking number: ' + (createdShipment.terminalShipmentId || 'Will be assigned'),
          'You will receive a confirmation email shortly'
        ] : ['Payment successful']
      }
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// @desc    Create shipment with payment (combined endpoint)
// @route   POST /api/payments/create-shipment
// @access  Private
exports.createShipmentWithPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      shipment_data,
      payment_email
    } = req.body;

    console.log('🚚 Creating shipment with payment for user:', userId);

    // Validate required fields
    if (!shipment_data || !payment_email) {
      return res.status(400).json({
        success: false,
        message: 'Shipment data and payment email are required'
      });
    }

    // First, get shipping rates to calculate amount
    const shipmentController = require('./shipmentController');
    
    // Mock request for getting rates
    const ratesReq = {
      user: { _id: userId },
      body: {
        address_from_id: shipment_data.address_from_id,
        address_to_id: shipment_data.address_to_id,
        parcel_id: shipment_data.parcel_id
      }
    };

    const ratesRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await shipmentController.getShippingRates(ratesReq, ratesRes);

    if (!ratesRes.responseData?.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get shipping rates',
        error: ratesRes.responseData?.message
      });
    }

    const rates = ratesRes.responseData.data;
    const selectedRate = rates.find(rate => rate.rate_id === shipment_data.rate_id);

    if (!selectedRate) {
      return res.status(400).json({
        success: false,
        message: 'Selected rate not found'
      });
    }

    // Initialize payment with shipment data in metadata
    const paymentReq = {
      user: { _id: userId },
      body: {
        email: payment_email,
        amount: selectedRate.amount,
        currency: selectedRate.currency || 'NGN',
        metadata: {
          shipment_data: shipment_data,
          rate_details: {
            carrier: selectedRate.carrier_name,
            service: selectedRate.service,
            estimated_delivery: selectedRate.estimated_delivery
          }
        }
      }
    };

    const paymentRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await exports.initializePayment(paymentReq, paymentRes);

    if (!paymentRes.responseData?.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
        error: paymentRes.responseData?.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment initialized. Complete payment to create shipment.',
      data: {
        payment: paymentRes.responseData.data,
        rate_details: {
          carrier: selectedRate.carrier_name,
          service: selectedRate.service,
          amount: selectedRate.amount,
          currency: selectedRate.currency,
          estimated_delivery: selectedRate.estimated_delivery
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating shipment with payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process shipment with payment',
      error: error.message
    });
  }
};

// paymentController.js - Update the verifyAndCreateShipment function

// @desc    Verify Paystack payment and create shipment
// @route   POST /api/payments/verify-and-create
// @access  Private
exports.verifyAndCreateShipment = async (req, res) => {
  const axios = require('axios');
  try {
    const userId = req.user._id;
    const { reference, shipment_data } = req.body;

    console.log('🔍 Verifying payment and creating shipment:', {
      reference,
      userId,
      hasShipmentData: !!shipment_data
    });

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    // 1. Verify payment with Paystack
    let paymentData;
    try {
      const verification = await Paystack.transaction.verify(reference);
      paymentData = verification.data;
    } catch (paystackError) {
      console.error('❌ Paystack verification failed:', paystackError);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: paystackError.message
      });
    }

    console.log('📊 Payment verification result:', {
      reference: paymentData.reference,
      status: paymentData.status,
      amount: paymentData.amount / 100,
      paidAt: paymentData.paid_at
    });

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: `Payment ${paymentData.status}`,
        data: paymentData
      });
    }

    // 2. Create shipment if payment is successful and we have shipment data
    let createdShipment = null;
    let terminalResponse = null;
    let shipmentCount = 0;

    if (shipment_data && shipment_data.rate_id) {
      console.log('🚚 Creating shipment after successful payment...');

      try {
        // First, create shipment on Terminal Africa
        // First, create shipment on Terminal Africa
        terminalResponse = await terminalAfricaService.createShipment({
  address_from_id: shipment_data.address_from_id,
  address_to_id: shipment_data.address_to_id,
  parcel_id: shipment_data.parcel_id,        // ← Make sure this is always passed
  rate_id: shipment_data.rate_id,
  metadata: shipment_data.metadata || {}
});
// try {
//   console.log('📦 Calling Terminal Africa with shipment data...');
  
//   terminalResponse = await terminalAfricaService.createShipment({
//     address_from_id: shipment_data.address_from_id,
//     address_to_id: shipment_data.address_to_id,
//     parcel_id: shipment_data.parcel_id,
//     rate_id: shipment_data.rate_id,
//     metadata: shipment_data.metadata || {}
//   });

//   console.log('✅ Terminal Africa response:', JSON.stringify(terminalResponse, null, 2));

//   if (!terminalResponse.success) {
//     throw new Error(`Terminal Africa API failed: ${terminalResponse.message || 'Unknown error'}`);
//   }

//   // Ensure we have tracking number and carrier
//   if (!terminalResponse.tracking_number || terminalResponse.tracking_number === 'pending') {
//     console.log('⚠️ No tracking number from Terminal Africa, generating one...');
//     terminalResponse.tracking_number = 'TRACK_' + Date.now();
//   }

//   if (!terminalResponse.carrier_name || terminalResponse.carrier_name === 'unknown') {
//     console.log('⚠️ No carrier name from Terminal Africa, using default...');
//     terminalResponse.carrier_name = shipment_data.metadata?.carrier_name || 'Fez Delivery';
//     terminalResponse.carrier = shipment_data.metadata?.carrier || 'quickdelivery';
//   }

// } catch (terminalError) {
//   console.error('❌ Failed to create on Terminal Africa:', terminalError.message);
  
//   // If Terminal Africa fails but we have metadata, create a local shipment
//   if (shipment_data.metadata) {
//     console.log('⚠️ Terminal Africa failed, creating local shipment record...');
//     terminalResponse = {
//       success: true,
//       shipment_id: 'local-' + Date.now(),
//       tracking_number: 'TRACK_' + Date.now(),
//       status: 'pending',
//       carrier: shipment_data.metadata.carrier || 'quickdelivery',
//       carrier_name: shipment_data.metadata.carrier_name || 'Fez Delivery',
//       rate_id: shipment_data.rate_id,
//       amount: parseFloat(shipment_data.metadata.total_amount) || paymentData.amount / 100,
//       currency: shipment_data.metadata.currency || paymentData.currency || 'NGN',
//       note: 'Created locally due to Terminal Africa failure'
//     };
//   } else {
//     // Attempt refund since Terminal Africa failed
//     try {
//       console.log('💰 Attempting refund...');
      
//       const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
//       const refundResponse = await axios.post(
//         'https://api.paystack.co/refund',
//         {
//           transaction: reference,
//           amount: paymentData.amount
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${paystackSecretKey}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );
      
//       if (refundResponse.data?.status) {
//         console.log('✅ Payment refunded successfully');
//       } else {
//         console.error('❌ Refund failed:', refundResponse.data?.message);
//       }
//     } catch (refundError) {
//       console.error('❌ Failed to refund payment:', refundError.message);
//     }
    
//     return res.status(500).json({
//       success: false,
//       message: `Failed to create shipment on Terminal Africa: ${terminalError.message}`,
//       payment_refunded: true
//     });
//   }
// }

        // Get original amount from metadata or payment data
        const originalAmount = shipment_data.metadata?.original_amount || 
                              shipment_data.metadata?.total_amount || 
                              paymentData.amount / 100;
        
        const serviceFeePercentage = shipment_data.metadata?.service_fee_percentage || 25;
        const serviceFeeAmount = shipment_data.metadata?.service_fee_amount || 0;
        
        // Handle estimated_delivery
        // Handle estimated_delivery - fix the "Invalid Date" issue
let estimatedDelivery = shipment_data.metadata?.estimated_delivery || 
                       terminalResponse?.estimated_delivery;

console.log('📅 Estimated delivery raw:', estimatedDelivery);

// Parse and validate the date
if (estimatedDelivery) {
  try {
    // Check if it's a string like "Within 7 days"
    if (typeof estimatedDelivery === 'string' && estimatedDelivery.includes('Within')) {
      // Create a date 7 days from now
      estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      const parsedDate = new Date(estimatedDelivery);
      if (isNaN(parsedDate.getTime())) {
        console.warn('⚠️ Invalid date received, using default');
        estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      } else {
        estimatedDelivery = parsedDate;
      }
    }
  } catch (dateError) {
    console.warn('⚠️ Date parsing error, using default:', dateError.message);
    estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  }
} else {
  // Default to 5 days from now
  estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  console.log('📅 Using default estimated delivery:', estimatedDelivery.toLocaleDateString());
}

        // Create shipment in our database with Terminal Africa data
        const shipment = new Shipment({
          user: userId,
          terminalShipmentId: terminalResponse.shipment_id,
          trackingNumber: terminalResponse.shipment_id,
          status: terminalResponse.status === 'draft' ? 'pending' : terminalResponse.status, // Ensure not draft
          sender: {
            name: shipment_data.metadata?.sender_name || 'Sender',
            email: shipment_data.metadata?.user_email || paymentData.customer?.email,
            phone: shipment_data.metadata?.sender_phone || '',
            address: shipment_data.metadata?.sender_address || '',
            address2: shipment_data.metadata?.sender_address2 || '',
            city: shipment_data.metadata?.sender_city || '',
            state: shipment_data.metadata?.sender_state || '',
            country: shipment_data.metadata?.sender_country || 'NG',
            zip: shipment_data.metadata?.sender_zip || ''
          },
          receiver: {
            name: shipment_data.metadata?.receiver_name || 'Receiver',
            email: shipment_data.metadata?.receiver_email || '',
            phone: shipment_data.metadata?.receiver_phone || '',
            address: shipment_data.metadata?.receiver_address || '',
            address2: shipment_data.metadata?.receiver_address2 || '',
            city: shipment_data.metadata?.receiver_city || '',
            state: shipment_data.metadata?.receiver_state || '',
            country: shipment_data.metadata?.receiver_country || 'NG',
            zip: shipment_data.metadata?.receiver_zip || ''
          },
          parcel: {
            weight: parseFloat(shipment_data.metadata?.parcel_weight || 1),
            length: parseFloat(shipment_data.metadata?.parcel_length || 10),
            width: parseFloat(shipment_data.metadata?.parcel_width || 10),
            height: parseFloat(shipment_data.metadata?.parcel_height || 10),
            items: shipment_data.metadata?.items || [{
              description: shipment_data.metadata?.item_description || 'Package',
              quantity: parseInt(shipment_data.metadata?.item_quantity || 1),
              value: parseFloat(shipment_data.metadata?.item_value || originalAmount),
              currency: shipment_data.metadata?.item_currency || 'NGN',
              weight: parseFloat(shipment_data.metadata?.parcel_weight || 1)
            }]
          },
          shipping: {
            carrier: terminalResponse.carrier || shipment_data.metadata?.carrier || 'QuickShip',
            carrier_name: terminalResponse.carrier_name || shipment_data.metadata?.carrier_name || 'QuickShip Carrier',
            service: shipment_data.metadata?.service || 'Standard',
            rate_id: shipment_data.rate_id,
            amount: terminalResponse.amount || originalAmount,
            currency: terminalResponse.currency || paymentData.currency || 'NGN',
            estimated_delivery: estimatedDelivery || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          },
          payment: {
            status: 'paid',
            amount: paymentData.amount / 100,
            currency: paymentData.currency,
            method: paymentData.channel,
            transactionId: reference,
            reference: reference,
            paidAt: new Date(paymentData.paid_at),
            metadata: {
              authorization_code: paymentData.authorization?.authorization_code,
              card_type: paymentData.authorization?.card_type,
              bank: paymentData.authorization?.bank,
              brand: paymentData.authorization?.brand,
              service_fee_percentage: serviceFeePercentage,
              service_fee_amount: serviceFeeAmount,
              original_amount: originalAmount,
              terminal_africa: {
                shipment_id: terminalResponse.shipment_id,
                label_url: terminalResponse.label_url,
                tracking_url: terminalResponse.tracking_url
              }
            }
          }
        });

        await shipment.save();
        createdShipment = shipment;
        
        console.log('✅ Shipment saved to database:', shipment._id);

      } catch (shipmentError) {
        console.error('❌ Error creating shipment:', shipmentError);
        
        // If database save fails but Terminal Africa succeeded, we have an issue
        // We should log this for manual intervention
        console.error('🚨 CRITICAL: Payment successful, Terminal Africa shipment created, but DB save failed');
        console.error('Terminal Africa Shipment ID:', terminalResponse?.shipment_id);
        console.error('Payment Reference:', reference);
        
        return res.status(500).json({
          success: false,
          message: `Shipment creation failed: ${shipmentError.message}`,
          terminal_africa_shipment: terminalResponse ? {
            shipment_id: terminalResponse.shipment_id,
            tracking_number: terminalResponse.tracking_number
          } : null,
          payment: {
            reference: paymentData.reference,
            status: paymentData.status,
            amount: paymentData.amount / 100,
            currency: paymentData.currency
          }
        });
      }
    }

    // 3. Get updated shipment count
    shipmentCount = await Shipment.countDocuments({ user: userId });

    // 4. Send email notification if shipment was created
  // 4. Send email notification if shipment was created
    if (createdShipment) {
      try {
        const user = await User.findById(userId);
        
        // Send emails
        try {
          await sendPaymentAndShipmentEmails(userId, {
            reference: paymentData.reference,
            amount: paymentData.amount / 100,
            currency: paymentData.currency,
            channel: paymentData.channel,
            status: paymentData.status,
            paidAt: paymentData.paid_at
          }, createdShipment);
          
          console.log('📧 Confirmation emails sent');
        } catch (emailError) {
          console.warn('⚠️ Failed to send emails:', emailError.message);
        }
      } catch (userError) {
        console.warn('⚠️ Failed to find user for email:', userError.message);
      }
    }


    // 5. Return success response
    res.status(200).json({
      success: true,
      message: createdShipment ? 'Payment successful and shipment created' : 'Payment successful',
      data: {
        payment: {
          reference: paymentData.reference,
          status: paymentData.status,
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          channel: paymentData.channel,
          paidAt: paymentData.paid_at
        },
        shipment: createdShipment ? {
          id: createdShipment._id,
          terminalShipmentId: createdShipment.terminalShipmentId,
          trackingNumber: createdShipment.trackingNumber,
          status: createdShipment.status,
          shipping: {
            carrier: createdShipment.shipping.carrier_name,
            service: createdShipment.shipping.service,
            amount: createdShipment.shipping.amount,
            currency: createdShipment.shipping.currency,
            estimated_delivery: createdShipment.shipping.estimated_delivery
          },
          label_url: terminalResponse?.label_url,
          tracking_url: terminalResponse?.tracking_url,
          createdAt: createdShipment.createdAt
        } : null,
        terminal_africa: terminalResponse ? {
          shipment_id: terminalResponse.shipment_id,
          tracking_number: terminalResponse.tracking_number,
          label_url: terminalResponse.label_url,
          tracking_url: terminalResponse.tracking_url
        } : null,
        shipmentCount: shipmentCount,
        user: {
          id: userId,
          totalShipments: shipmentCount
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in verifyAndCreateShipment:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment and shipment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Get shipping rates with amount
// @route   POST /api/shipments/rates-with-quote
// @access  Private
exports.getRatesWithQuote = async (req, res) => {
  try {
    const { address_from_id, address_to_id, parcel_id } = req.body;

    console.log('📊 Getting rates with quote...');

    // Get rates from Terminal Africa
    const shipmentController = require('./shipmentController');
    const ratesReq = {
      body: req.body
    };
    const ratesRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await shipmentController.getShippingRates(ratesReq, ratesRes);

    if (!ratesRes.responseData?.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get shipping rates'
      });
    }

    const rates = ratesRes.responseData.data;
    
    // Format response for frontend with payment-ready structure
    const formattedRates = rates.map(rate => ({
      ...rate,
      payment_required: true,
      payment_amount: rate.amount,
      payment_currency: rate.currency || 'NGN',
      metadata: {
        address_from_id,
        address_to_id,
        parcel_id,
        rate_id: rate.rate_id,
        carrier: rate.carrier_name,
        service: rate.service,
        estimated_delivery: rate.estimated_delivery
      }
    }));

    res.status(200).json({
      success: true,
      message: `Found ${formattedRates.length} shipping options`,
      data: formattedRates
    });

  } catch (error) {
    console.error('❌ Error getting rates with quote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shipping rates',
      error: error.message
    });
  }
};

// @desc    Get user payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Shipment.find({
      user: userId,
      'payment.status': 'paid'
    })
    .sort({ 'payment.paidAt': -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

    const total = await Shipment.countDocuments({
      user: userId,
      'payment.status': 'paid'
    });

    res.status(200).json({
      success: true,
      data: {
        payments: payments.map(p => ({
          id: p._id,
          trackingNumber: p.trackingNumber,
          amount: p.payment.amount,
          currency: p.payment.currency,
          status: p.status,
          paidAt: p.payment.paidAt,
          carrier: p.shipping?.carrier_name
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

// @desc    Get payment details by reference
// @route   GET /api/payments/check-transaction/:reference
// @access  Private
exports.checkTransaction = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const response = await Paystack.transaction.verify(reference);
    
    res.status(200).json({
      success: true,
      data: {
        reference: response.data.reference,
        status: response.data.status,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        channel: response.data.channel,
        paidAt: response.data.paid_at,
        customer: response.data.customer
      }
    });
  } catch (error) {
    console.error('Transaction check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check transaction'
    });
  }
};

// @desc    Initiate refund
// @route   POST /api/payments/refund
// @access  Private
exports.initiateRefund = async (req, res) => {
  try {
    const { reference, amount, reason } = req.body;
    
    const refundData = {
      transaction: reference,
      amount: amount * 100, // Convert to kobo
      reason: reason || 'Shipment cancellation'
    };
    
    const response = await Paystack.refund.create(refundData);
    
    res.status(200).json({
      success: true,
      message: 'Refund initiated',
      data: response.data
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
};

// @desc    Get supported currencies
// @route   GET /api/payments/supported-currencies
// @access  Private
exports.getSupportedCurrencies = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        currencies: [
          { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', default: true },
          { code: 'USD', name: 'US Dollar', symbol: '$' },
          { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
          { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
          { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' }
        ],
        default_currency: 'NGN'
      }
    });
  } catch (error) {
    console.error('Currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currencies'
    });
  }
};

// Make sure you export all functions
module.exports = exports;