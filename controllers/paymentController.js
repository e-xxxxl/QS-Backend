const Paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { sendShipmentConfirmation, sendPaymentAndShipmentEmails } = require('./emailController');

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
          'Tracking number: ' + (createdShipment.trackingNumber || 'Will be assigned'),
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

// @desc    Verify Paystack payment and create shipment
// @route   POST /api/payments/verify-and-create
// @access  Private
exports.verifyAndCreateShipment = async (req, res) => {
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
    let shipmentCount = 0;

    if (shipment_data && shipment_data.rate_id) {
      console.log('🚚 Creating shipment after successful payment...');

      try {
        // Get the original amount from metadata
        const originalAmount = shipment_data.metadata?.original_amount || 
                              shipment_data.metadata?.total_amount || 
                              paymentData.amount / 100;
        
        const serviceFeePercentage = shipment_data.metadata?.service_fee_percentage || 25;
        const serviceFeeAmount = shipment_data.metadata?.service_fee_amount || 0;
        
        // FIX: Handle estimated_delivery properly
        let estimatedDelivery = shipment_data.metadata?.estimated_delivery;
        
        if (estimatedDelivery && estimatedDelivery !== 'Invalid Date') {
          // Try to parse if it's a date string
          const parsedDate = new Date(estimatedDelivery);
          if (!isNaN(parsedDate.getTime())) {
            estimatedDelivery = parsedDate;
          }
          // If it's not a valid date (e.g., "3-5 business days"), keep as string
        }
        
        // Create shipment with the provided data
        const shipment = new Shipment({
          user: userId,
          terminalShipmentId: `TEMP_${Date.now()}`,
          trackingNumber: `TRACK_${Date.now()}`,
          status: 'pending',
          sender: {
            name: shipment_data.metadata?.sender_name || 'Sender',
            email: shipment_data.metadata?.user_email || paymentData.customer?.email,
            phone: shipment_data.metadata?.sender_phone || '',
            address: shipment_data.metadata?.sender_address || '',
            city: shipment_data.metadata?.sender_city || '',
            state: shipment_data.metadata?.sender_state || '',
            country: shipment_data.metadata?.sender_country || 'NG'
          },
          receiver: {
            name: shipment_data.metadata?.receiver_name || 'Receiver',
            email: shipment_data.metadata?.receiver_email || '',
            phone: shipment_data.metadata?.receiver_phone || '',
            address: shipment_data.metadata?.receiver_address || '',
            city: shipment_data.metadata?.receiver_city || '',
            state: shipment_data.metadata?.receiver_state || '',
            country: shipment_data.metadata?.receiver_country || 'NG'
          },
          parcel: {
            weight: parseFloat(shipment_data.metadata?.parcel_weight || 1),
            length: parseFloat(shipment_data.metadata?.parcel_length || 10),
            width: parseFloat(shipment_data.metadata?.parcel_width || 10),
            height: parseFloat(shipment_data.metadata?.parcel_height || 10),
            items: shipment_data.metadata?.items || []
          },
          shipping: {
            carrier: shipment_data.metadata?.carrier || 'QuickShip',
            carrier_name: shipment_data.metadata?.carrier_name || 'QuickShip Carrier',
            service: shipment_data.metadata?.service || 'Standard',
            rate_id: shipment_data.rate_id,
            amount: originalAmount,
            currency: paymentData.currency || 'NGN',
            estimated_delivery: estimatedDelivery || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          },
          payment: {
            status: 'paid',
            amount: paymentData.amount / 100, // This is the total amount paid (includes 25% fee)
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
              original_amount: originalAmount
            }
          }
        });

        await shipment.save();
        createdShipment = shipment;
        
        console.log('✅ Shipment created:', shipment._id);

        // Try to create on Terminal Africa
        try {
          // Import shipment controller
          const shipmentController = require('./shipmentController');
          const terminalResponse = await shipmentController.createShipmentOnTerminalAfrica({
            address_from_id: shipment_data.address_from_id,
            address_to_id: shipment_data.address_to_id,
            parcel_id: shipment_data.parcel_id,
            rate_id: shipment_data.rate_id,
            metadata: shipment_data.metadata
          });
          
          // Update with Terminal Africa IDs if successful
          if (terminalResponse.shipment_id) {
            shipment.terminalShipmentId = terminalResponse.shipment_id;
            shipment.trackingNumber = terminalResponse.tracking_number || shipment.trackingNumber;
            await shipment.save();
            
            console.log('✅ Terminal Africa shipment created:', terminalResponse.shipment_id);
          }
        } catch (terminalError) {
          console.warn('⚠️ Failed to create on Terminal Africa:', terminalError.message);
          // Shipment is still saved in our DB
        }

      } catch (shipmentError) {
        console.error('❌ Error creating shipment:', shipmentError);
        // If shipment creation fails, we should refund the payment
        try {
          await Paystack.refund.create({
            transaction: reference,
            amount: paymentData.amount
          });
          console.log('💰 Payment refunded due to shipment creation failure');
        } catch (refundError) {
          console.error('❌ Failed to refund payment:', refundError);
        }
        
        return res.status(500).json({
          success: false,
          message: `Shipment creation failed: ${shipmentError.message}`,
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
          trackingNumber: createdShipment.trackingNumber,
          status: createdShipment.status,
          shipping: createdShipment.shipping,
          createdAt: createdShipment.createdAt
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