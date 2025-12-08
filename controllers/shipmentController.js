const axios = require('axios');
const Shipment = require('../models/Shipment');
const User = require('../models/User');

// Terminal Africa API Configuration
const TERMINAL_AFRICA_API_KEY = process.env.TSHIP_SECRET_KEY || 'your-terminal-africa-api-key';
const TERMINAL_AFRICA_BASE_URL = 'https://sandbox.terminal.africa/v1';

// Helper function for Terminal Africa API calls
const terminalAfricaAPI = axios.create({
  baseURL: TERMINAL_AFRICA_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TERMINAL_AFRICA_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Helper to create address on Terminal Africa
const createTerminalAddress = async (addressData) => {
  try {
    const response = await terminalAfricaAPI.post('/addresses', {
      name: addressData.name,
      email: addressData.email,
      phone: addressData.phone,
      address: addressData.address,
      address2: addressData.address2 || '',
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      zip: addressData.zip || '',
      is_residential: true,
      metadata: {
        created_via: 'quickshipafrica'
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error creating Terminal Africa address:', error.response?.data || error.message);
    throw error;
  }
};

// Helper to create parcel on Terminal Africa
const createTerminalParcel = async (parcelData) => {
  try {
    const response = await terminalAfricaAPI.post('/parcels', {
      description: 'Shipment parcel',
      weight: parcelData.weight,
      weight_unit: 'kg',
      length: parcelData.length,
      width: parcelData.width,
      height: parcelData.height,
      dimension_unit: 'cm',
      items: parcelData.items.map(item => ({
        description: item.description,
        name: item.description,
        currency: item.currency || 'NGN',
        value: item.value || 0,
        weight: item.weight || 0,
        quantity: item.quantity || 1
      })),
      metadata: {
        created_via: 'quickshipafrica'
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error creating Terminal Africa parcel:', error.response?.data || error.message);
    throw error;
  }
};

// @desc    Get shipping rates
// @route   POST /api/shipments/rates
// @access  Private
exports.getShippingRates = async (req, res) => {
  try {
    const {
      address_from_id,
      address_to_id,
      parcel_id
    } = req.body;

    console.log('📦 Getting shipping rates...');

    // Validate required fields
    if (!address_from_id || !address_to_id || !parcel_id) {
      return res.status(400).json({
        success: false,
        message: 'Address from ID, address to ID, and parcel ID are required'
      });
    }

    // Call Terminal Africa rates API
    const response = await terminalAfricaAPI.post('/rates', {
      address_from: address_from_id,
      address_to: address_to_id,
      parcel: parcel_id
    });

    const rates = response.data.data;

    res.status(200).json({
      success: true,
      message: 'Shipping rates fetched successfully',
      data: rates
    });

  } catch (error) {
    console.error('❌ Error getting shipping rates:', error.response?.data || error.message);
    
    // Handle Terminal Africa API errors
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to get shipping rates'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching shipping rates'
    });
  }
};

// @desc    Create address on Terminal Africa
// @route   POST /api/shipments/address
// @access  Private
exports.createAddress = async (req, res) => {
  try {
    const addressData = req.body;

    console.log('📍 Creating address on Terminal Africa...');

    const address = await createTerminalAddress(addressData);

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });

  } catch (error) {
    console.error('❌ Error creating address:', error.response?.data || error.message);
    
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to create address'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating address'
    });
  }
};

// @desc    Create parcel on Terminal Africa
// @route   POST /api/shipments/parcel
// @access  Private
exports.createParcel = async (req, res) => {
  try {
    const parcelData = req.body;

    console.log('📦 Creating parcel on Terminal Africa...');

    const parcel = await createTerminalParcel(parcelData);

    res.status(201).json({
      success: true,
      message: 'Parcel created successfully',
      data: parcel
    });

  } catch (error) {
    console.error('❌ Error creating parcel:', error.response?.data || error.message);
    
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to create parcel'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating parcel'
    });
  }
};

// @desc    Create shipment
// @route   POST /api/shipments/create
// @access  Private
exports.createShipment = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      address_from_id,
      address_to_id,
      parcel_id,
      rate_id,
      metadata = {},
      address_return_id,
      shipment_purpose = 'commercial',
      shipment_type
    } = req.body;

    console.log('📦 Creating shipment for user:', userId);

    // Validate required fields
    if (!address_from_id || !address_to_id || !parcel_id || !rate_id) {
      return res.status(400).json({
        success: false,
        message: 'Address from ID, address to ID, parcel ID, and rate ID are required'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare shipment data for Terminal Africa
    const shipmentData = {
      address_from: address_from_id,
      address_to: address_to_id,
      parcel: parcel_id,
      metadata: {
        ...metadata,
        user_id: userId.toString(),
        created_via: 'quickshipafrica'
      }
    };

    // Add optional fields
    if (address_return_id) shipmentData.address_return = address_return_id;
    if (shipment_purpose) shipmentData.shipment_purpose = shipment_purpose;
    if (shipment_type) shipmentData.shipment_type = shipment_type;

    console.log('📦 Creating shipment on Terminal Africa...');

    // Create shipment on Terminal Africa
    const createResponse = await terminalAfricaAPI.post('/shipments', shipmentData);
    const terminalShipment = createResponse.data.data;

    // Get the rate details
    const rateResponse = await terminalAfricaAPI.get(`/rates/${rate_id}`);
    const rate = rateResponse.data.data;

    console.log('✅ Shipment created on Terminal Africa:', terminalShipment.shipment_id);

    // Prepare shipment data for our database
    const shipment = new Shipment({
      user: userId,
      terminalShipmentId: terminalShipment.id,
      terminalAddressFromId: address_from_id,
      terminalAddressToId: address_to_id,
      terminalParcelId: parcel_id,
      terminalRateId: rate_id,
      
      trackingNumber: terminalShipment.tracking_number || '',
      reference: terminalShipment.reference || '',
      status: terminalShipment.status || 'draft',
      
      // Store original data
      sender: terminalShipment.address_from,
      receiver: terminalShipment.address_to,
      parcel: terminalShipment.parcel,
      
      // Shipping details from rate
      shipping: {
        carrier: rate.carrier || '',
        carrier_name: rate.carrier_name || '',
        service: rate.service || '',
        rate_id: rate_id,
        amount: rate.amount || 0,
        currency: rate.currency || 'NGN',
        estimated_delivery: rate.estimated_delivery ? new Date(rate.estimated_delivery) : null
      },
      
      // Metadata
      metadata: metadata,
      shipment_purpose: shipment_purpose,
      shipment_type: shipment_type,
      
      // Payment
      payment: {
        status: 'pending',
        amount: rate.amount || 0
      }
    });

    // Save to database
    await shipment.save();

    console.log('✅ Shipment saved to database:', shipment._id);

    // Purchase the shipment (mark as ready for pickup)
    try {
      await terminalAfricaAPI.post(`/shipments/${terminalShipment.id}/purchase`, {
        rate: rate_id
      });
      
      shipment.status = 'pending';
      await shipment.save();
    } catch (purchaseError) {
      console.log('Note: Shipment created but not purchased yet:', purchaseError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: {
        shipment: shipment,
        terminalShipment: terminalShipment,
        trackingNumber: terminalShipment.tracking_number,
        shipmentId: terminalShipment.shipment_id
      }
    });

  } catch (error) {
    console.error('❌ Error creating shipment:', error.response?.data || error.message);
    
    // Handle Terminal Africa API errors
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to create shipment'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating shipment'
    });
  }
};

// @desc    Purchase shipment
// @route   POST /api/shipments/:id/purchase
// @access  Private
exports.purchaseShipment = async (req, res) => {
  try {
    const userId = req.user._id;
    const shipmentId = req.params.id;
    const { rate_id } = req.body;

    const shipment = await Shipment.findOne({
      _id: shipmentId,
      user: userId
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Purchase on Terminal Africa
    await terminalAfricaAPI.post(`/shipments/${shipment.terminalShipmentId}/purchase`, {
      rate: rate_id || shipment.terminalRateId
    });

    // Update status
    shipment.status = 'pending';
    await shipment.save();

    res.status(200).json({
      success: true,
      message: 'Shipment purchased successfully',
      data: { shipment }
    });

  } catch (error) {
    console.error('Error purchasing shipment:', error);
    
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to purchase shipment'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while purchasing shipment'
    });
  }
};

// Other functions remain the same (getUserShipments, getShipmentById, cancelShipment, getCarriers)
// ... (keep the existing functions from previous implementation)



// @desc    Get shipping rate
// @desc    Get user shipments
// @route   GET /api/shipments
// @access  Private
exports.getUserShipments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const shipments = await Shipment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Shipment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        shipments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get shipment by ID
// @route   GET /api/shipments/:id
// @access  Private
exports.getShipmentById = async (req, res) => {
  try {
    const userId = req.user._id;
    const shipmentId = req.params.id;

    const shipment = await Shipment.findOne({
      _id: shipmentId,
      user: userId
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Get updated tracking info from Terminal Africa
    try {
      const response = await terminalAfricaAPI.get(`/shipments/${shipment.terminalShipmentId}`);
      const terminalShipment = response.data.data;
      
      // Update shipment status if changed
      if (shipment.status !== terminalShipment.status) {
        shipment.status = terminalShipment.status;
        shipment.trackingEvents = terminalShipment.tracking_events;
        await shipment.save();
      }
    } catch (terminalError) {
      console.log('Could not fetch updated tracking info:', terminalError.message);
    }

    res.status(200).json({
      success: true,
      data: { shipment }
    });

  } catch (error) {
    console.error('Error getting shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel shipment
// @route   POST /api/shipments/:id/cancel
// @access  Private
exports.cancelShipment = async (req, res) => {
  try {
    const userId = req.user._id;
    const shipmentId = req.params.id;

    const shipment = await Shipment.findOne({
      _id: shipmentId,
      user: userId
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Check if shipment can be cancelled
    if (!['pending', 'processing'].includes(shipment.status)) {
      return res.status(400).json({
        success: false,
        message: `Shipment cannot be cancelled in ${shipment.status} status`
      });
    }

    // Cancel on Terminal Africa
    await terminalAfricaAPI.post(`/shipments/${shipment.terminalShipmentId}/cancel`);

    // Update in database
    shipment.status = 'cancelled';
    shipment.cancelledAt = new Date();
    await shipment.save();

    res.status(200).json({
      success: true,
      message: 'Shipment cancelled successfully',
      data: { shipment }
    });

  } catch (error) {
    console.error('Error cancelling shipment:', error);
    
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to cancel shipment'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while cancelling shipment'
    });
  }
};

// @desc    Get carriers
// @route   GET /api/shipments/carriers
// @access  Private
exports.getCarriers = async (req, res) => {
  try {
    // Get available carriers from Terminal Africa
    const response = await terminalAfricaAPI.get('/carriers');
    const carriers = response.data.data;

    res.status(200).json({
      success: true,
      data: carriers
    });

  } catch (error) {
    console.error('Error getting carriers:', error);
    
    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Failed to get carriers'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while getting carriers'
    });
  }
};