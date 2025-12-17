const axios = require("axios");
const Shipment = require("../models/Shipment");
const User = require("../models/User");

// Terminal Africa API Configuration
const TERMINAL_AFRICA_API_KEY =
  process.env.TSHIP_SECRET_KEY || process.env.TERMINAL_AFRICA_API_KEY;
const TERMINAL_AFRICA_BASE_URL =
  process.env.TERMINAL_AFRICA_BASE_URL || "https://api.terminal.africa/v1";

console.log("🚚 Terminal Africa Config:", {
  hasKey: !!TERMINAL_AFRICA_API_KEY,
  baseUrl: TERMINAL_AFRICA_BASE_URL,
  keyFirst10: TERMINAL_AFRICA_API_KEY
    ? TERMINAL_AFRICA_API_KEY.substring(0, 10) + "..."
    : "missing",
});

// Helper function for Terminal Africa API calls
const terminalAfricaAPI = axios.create({
  baseURL: TERMINAL_AFRICA_BASE_URL,
  headers: {
    Authorization: `Bearer ${TERMINAL_AFRICA_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Updated createTerminalAddress function
const createTerminalAddress = async (addressData, type = "shipping") => {
  try {
    console.log(`📍 Creating ${type} address on Terminal Africa with data:`, {
      name: addressData.name,
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      phone: addressData.phone,
      email: addressData.email
    });

    // Prepare address data with proper structure
    const addressPayload = {
      name: addressData.name,
      email: addressData.email,
      phone: addressData.phone,
      address: addressData.address,
      address2: addressData.address2 || "",
      city: addressData.city,
      state: addressData.state,
      country: addressData.country || "NG",
      zip: addressData.zip || "",
      is_residential: addressData.is_residential !== false,
    };

    console.log(`📤 Sending payload to Terminal Africa /addresses:`, addressPayload);

    const response = await terminalAfricaAPI.post("/addresses", addressPayload);

    const terminalAddress = response.data.data;

    // ✅ CRITICAL: Log the FULL response
    console.log(`✅ ${type} address created SUCCESSFULLY:`, {
      status: response.status,
      data_status: response.data?.status,
      message: response.data?.message,
      address_id: terminalAddress.address_id,
      _id: terminalAddress._id,
      id: terminalAddress.id
    });

    // ✅ Try to fetch the address immediately to verify it exists
    try {
      const verifyResponse = await terminalAfricaAPI.get(`/addresses/${terminalAddress.address_id}`);
      console.log(`✅ Address verified on Terminal Africa with address_id:`, {
        id: verifyResponse.data.data.address_id,
        exists: true
      });
    } catch (verifyError) {
      console.error(`❌ Address could not be verified:`, verifyError.message);
    }

    // ✅ Return the ENTIRE Terminal Africa address object
    return terminalAddress;
  } catch (error) {
    console.error(`❌ Error creating ${type} address:`, {
      message: error.message,
      status: error.response?.status,
      response: error.response?.data,
      config: error.config
    });
    throw new Error(
      `Failed to create ${type} address: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

const createTerminalParcel = async (parcelData) => {
  try {
    console.log('📦 Creating parcel on Terminal Africa:', {
      weight: parcelData.weight,
      dimensions: `${parcelData.length}x${parcelData.width}x${parcelData.height}`
    });

    const items = parcelData.items.map(item => ({
      description: item.description || item.name || 'Item',
      name: item.name || item.description || 'Item',
      currency: item.currency || 'NGN',
      value: item.value || 0,
      weight: item.weight || 0,
      quantity: item.quantity || 1
    }));

    console.log('📤 Sending parcel payload:', {
      description: parcelData.description || 'Shipment parcel',
      weight: parseFloat(parcelData.weight) || 1.0,
      weight_unit: 'kg',
      length: parseFloat(parcelData.length) || 10,
      width: parseFloat(parcelData.width) || 10,
      height: parseFloat(parcelData.height) || 10,
      dimension_unit: 'cm',
      items: items
    });

    const response = await terminalAfricaAPI.post('/parcels', {
      description: parcelData.description || 'Shipment parcel',
      weight: parseFloat(parcelData.weight) || 1.0,
      weight_unit: 'kg',
      length: parseFloat(parcelData.length) || 10,
      width: parseFloat(parcelData.width) || 10,
      height: parseFloat(parcelData.height) || 10,
      dimension_unit: 'cm',
      items: items
    });

    const terminalParcel = response.data.data;
    
    // ✅ Log ALL fields from the response
    console.log('📦 FULL Parcel response:', {
      status: response.status,
      data_status: response.data?.status,
      message: response.data?.message,
      ALL_FIELDS: terminalParcel,
      KEYS: Object.keys(terminalParcel)
    });
    
    // ✅ Check which ID fields exist
    const availableIds = {};
    ['parcel_id', 'id', '_id', 'parcelId', 'parcelID'].forEach(key => {
      if (terminalParcel[key]) {
        availableIds[key] = terminalParcel[key];
      }
    });
    
    console.log('📦 Available parcel IDs:', availableIds);
    
    // ✅ Try to verify with each possible ID
    for (const [key, value] of Object.entries(availableIds)) {
      try {
        const verifyResponse = await terminalAfricaAPI.get(`/parcels/${value}`);
        console.log(`✅ Parcel verified with ${key}: ${value}`, {
          exists: true,
          verified_id: verifyResponse.data.data.parcel_id || verifyResponse.data.data.id
        });
      } catch (verifyError) {
        console.log(`❌ Parcel NOT found with ${key}: ${value}`, verifyError.message);
      }
    }
    
    return terminalParcel;

  } catch (error) {
    console.error('❌ Error creating Terminal Africa parcel:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(`Failed to create parcel: ${error.response?.data?.message || error.message}`);
  }
};

// @desc    Get shipping rates
// @route   POST /api/shipments/rates
// @access  Private
exports.getShippingRates = async (req, res) => {
  try {
    const { address_from_id, address_to_id, parcel_id } = req.body;

    console.log("📊 Getting shipping rates for:", {
      address_from_id,
      address_to_id,
      parcel_id
    });

    // Validate required fields
    if (!address_from_id || !address_to_id || !parcel_id) {
      return res.status(400).json({
        success: false,
        message: "Address from ID, address to ID, and parcel ID are required",
      });
    }

    // Debug: Try different parcel ID formats
    console.log("🔍 Testing different parcel ID formats...");
    
    // Try to fetch parcel with the provided ID
    try {
      const parcelResponse = await terminalAfricaAPI.get(`/parcels/${parcel_id}`);
      console.log("✅ Parcel found with provided ID:", {
        parcel_id: parcelResponse.data.data.parcel_id,
        id: parcelResponse.data.data.id,
        _id: parcelResponse.data.data._id,
        weight: parcelResponse.data.data.weight
      });
    } catch (error) {
      console.error("❌ Parcel NOT found with provided ID:", {
        parcel_id: parcel_id,
        error: error.message,
        response: error.response?.data
      });
      
      // Try alternative ID formats
      console.log("🔄 Trying alternative ID formats...");
      
      // If parcel_id starts with PC-, maybe we need just the MongoDB _id
      if (parcel_id.startsWith('PC-')) {
        try {
          // Try to get parcel by listing all and finding it
          const allParcels = await terminalAfricaAPI.get('/parcels?limit=10');
          const matchingParcel = allParcels.data.data.find(p => 
            p.parcel_id === parcel_id || p.id === parcel_id
          );
          
          if (matchingParcel) {
            console.log("🔍 Found parcel in list:", {
              parcel_id: matchingParcel.parcel_id,
              id: matchingParcel.id,
              _id: matchingParcel._id
            });
          } else {
            console.log("❌ Parcel not found in recent parcels list");
          }
        } catch (listError) {
          console.error("❌ Could not list parcels:", listError.message);
        }
      }
    }

    // Prepare the request parameters - try different combinations
    console.log("🔍 Testing different parameter combinations...");
    
    const testParams = [
      {
        name: "Original params",
        params: {
          pickup_address: address_from_id,
          delivery_address: address_to_id,
          parcel: parcel_id,
          currency: "NGN",
          cash_on_delivery: false,
        }
      },
      {
        name: "Without optional params",
        params: {
          pickup_address: address_from_id,
          delivery_address: address_to_id,
          parcel: parcel_id,
        }
      },
      {
        name: "Try parcel_id instead of parcel",
        params: {
          pickup_address: address_from_id,
          delivery_address: address_to_id,
          parcel_id: parcel_id,  // Try parcel_id instead of parcel
          currency: "NGN",
        }
      }
    ];

    let ratesResponse;
    let successfulParams;

    // Try each parameter combination
    for (const test of testParams) {
      console.log(`🧪 Testing: ${test.name}`, test.params);
      
      try {
        ratesResponse = await terminalAfricaAPI.get("/rates/shipment", {
          params: test.params
        });
        
        console.log(`✅ ${test.name} SUCCESS!`);
        successfulParams = test.params;
        break;
      } catch (testError) {
        console.log(`❌ ${test.name} failed:`, testError.response?.data?.message || testError.message);
      }
    }

    if (!ratesResponse) {
      throw new Error("All parameter combinations failed. Last error: Valid parcel id must be provided");
    }

    console.log(
      `✅ ${ratesResponse.data?.data?.length || 0} rates fetched successfully`
    );

    const rates = ratesResponse.data.data || [];

    if (rates.length > 0) {
      console.log("📋 Sample rate details:", {
        carrier: rates[0].carrier_name,
        service: rates[0].carrier_rate_description,
        amount: rates[0].amount,
        currency: rates[0].currency,
        delivery_time: rates[0].delivery_time,
        rate_id: rates[0].rate_id,
      });
    } else {
      console.log("⚠️ No rates returned from Terminal Africa");
    }

    // Format rates for frontend
    const formattedRates = rates.map((rate) => {
      return {
        rate_id: rate.rate_id || rate.id,
        id: rate.rate_id || rate.id,
        carrier_id: rate.carrier_id,
        carrier_name: rate.carrier_name,
        carrier_logo: rate.carrier_logo,
        service: rate.carrier_rate_description || "Standard Delivery",
        amount: rate.amount || 0,
        currency: rate.currency || "NGN",
        estimated_delivery: rate.delivery_time || "3-5 business days",
        delivery_time: rate.delivery_time,
        pickup_time: rate.pickup_time,
        includes_insurance: rate.includes_insurance || false,
        insurance_coverage: rate.insurance_coverage || 0,
        insurance_fee: rate.insurance_fee || 0,
        metadata: rate.metadata || {},
        _original: rate,
      };
    });

    // Sort by price (lowest first)
    formattedRates.sort((a, b) => a.amount - b.amount);

    res.status(200).json({
      success: true,
      message: `Found ${formattedRates.length} shipping rates`,
      data: formattedRates,
      metadata: {
        address_from_id,
        address_to_id,
        parcel_id,
        currency: "NGN",
        timestamp: new Date().toISOString(),
        rates_count: formattedRates.length,
        successful_params: successfulParams
      },
    });
    
  } catch (error) {
    console.error("❌ Error getting shipping rates:", {
      message: error.message,
      stack: error.stack,
      endpoint: "/rates/shipment",
      request_data: {
        address_from_id: req.body?.address_from_id,
        address_to_id: req.body?.address_to_id,
        parcel_id: req.body?.parcel_id,
      },
      axios_config: error.config
        ? {
            url: error.config.url,
            method: error.config.method,
            baseURL: error.config.baseURL,
            params: error.config.params,
            headers: {
              ...error.config.headers,
              Authorization: error.config.headers?.Authorization
                ? "[REDACTED]"
                : "Missing",
            },
          }
        : "No config",
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      },
    });

    // Provide helpful error messages
    let errorMessage = "Failed to get shipping rates";
    let statusCode = 500;

    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      statusCode = error.response.status;
    } else if (error.message.includes("timeout")) {
      errorMessage = "Request timeout. Please try again.";
      statusCode = 408;
    } else if (error.message.includes("Network Error")) {
      errorMessage = "Network error. Check your internet connection.";
      statusCode = 503;
    } else if (error.message.includes("not found")) {
      errorMessage = `Address or parcel not found: ${error.message}`;
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      debug:
        process.env.NODE_ENV === "development"
          ? {
              endpoint: "/rates/shipment",
              error: error.message,
              response: error.response?.data,
              request_params: error.config?.params,
            }
          : undefined,
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

    const terminalAddress = await createTerminalAddress(addressData);

    // ✅ CRITICAL: Use address_id NOT _id or id!
    const addressId = terminalAddress.address_id || terminalAddress.id;
    
    console.log('✅ Address created. Available IDs:', {
      address_id: terminalAddress.address_id,
      _id: terminalAddress._id,
      id: terminalAddress.id,
      using_id: addressId
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: {
        id: addressId,  // ✅ This should be the address_id (AD-...)
        address_id: terminalAddress.address_id, // Include for debugging
        name: terminalAddress.name || addressData.name,
        address: terminalAddress.address || addressData.address,
        city: terminalAddress.city,
        state: terminalAddress.state,
        country: terminalAddress.country,
        // Return full object for debugging
        terminal_response: terminalAddress
      }
    });

  } catch (error) {
    console.error('❌ Error creating address:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating address'
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

    const terminalParcel = await createTerminalParcel(parcelData);

    // ✅ CRITICAL: Use parcel_id NOT _id or id!
    const parcelId = terminalParcel.parcel_id || terminalParcel.id;
    
    console.log('✅ Parcel created. Available IDs:', {
      parcel_id: terminalParcel.parcel_id,
      _id: terminalParcel._id,
      id: terminalParcel.id,
      using_id: parcelId
    });

    res.status(201).json({
      success: true,
      message: 'Parcel created successfully',
      data: {
        id: parcelId,  // ✅ This should be the parcel_id (PC-...)
        parcel_id: terminalParcel.parcel_id, // Include for debugging
        weight: terminalParcel.weight,
        dimensions: `${terminalParcel.length}x${terminalParcel.width}x${terminalParcel.height}`,
        description: terminalParcel.description,
        terminal_response: terminalParcel
      }
    });

  } catch (error) {
    console.error('❌ Error creating parcel:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating parcel'
    });
  }
};
// @desc    Create shipment
// @route   POST /api/shipments/create
// @access  Private
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
      shipment_purpose = "commercial",
    } = req.body;

    console.log("🚚 Creating shipment for user:", userId);

    // Validate required fields
    if (!address_from_id || !address_to_id || !parcel_id || !rate_id) {
      return res.status(400).json({
        success: false,
        message: "Address from ID, address to ID, parcel ID, and rate ID are required",
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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
        user_email: user.email,
        created_via: "quickshipafrica",
        created_at: new Date().toISOString(),
      },
    };

    // Add optional fields
    if (shipment_purpose) shipmentData.shipment_purpose = shipment_purpose;

    console.log("📦 Creating shipment on Terminal Africa with data:", shipmentData);

    // Create shipment on Terminal Africa
    let createResponse;
    try {
      createResponse = await terminalAfricaAPI.post("/shipments", shipmentData);
      console.log("✅ Terminal Africa response:", JSON.stringify(createResponse.data, null, 2));
    } catch (error) {
      console.error("❌ Terminal Africa API error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`Terminal Africa error: ${error.response?.data?.message || error.message}`);
    }

    const terminalShipment = createResponse.data.data;
    
    // CRITICAL: Check if we got a valid response
    if (!terminalShipment) {
      throw new Error("Terminal Africa returned empty shipment data");
    }
    
    if (!terminalShipment.id && !terminalShipment.shipment_id) {
      throw new Error("Terminal Africa response missing shipment ID");
    }

    console.log("✅ Shipment created on Terminal Africa. Full response:", {
      id: terminalShipment.id,
      shipment_id: terminalShipment.shipment_id,
      tracking_number: terminalShipment.tracking_number,
      status: terminalShipment.status,
      address_from: terminalShipment.address_from,
      address_to: terminalShipment.address_to,
      parcel: terminalShipment.parcel
    });

    // Try to get rate details
    let rate = {
      carrier_name: "Unknown Carrier",
      service: "Standard",
      amount: 0,
      currency: "NGN",
      estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Default: 5 days from now
      carrier: {
        slug: "unknown",
        name: "Unknown Carrier"
      }
    };
    
    try {
      const rateResponse = await terminalAfricaAPI.get(`/rates/${rate_id}`);
      const rateData = rateResponse.data.data;
      console.log("📊 Rate details from Terminal Africa:", rateData);
      
      if (rateData) {
        rate = {
          ...rate,
          ...rateData,
          // Parse estimated delivery string to Date if needed
          estimated_delivery: rateData.estimated_delivery || rateData.delivery_time 
            ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Default to 5 days if string
            : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        };
      }
    } catch (rateError) {
      console.warn("⚠️ Could not fetch rate details:", rateError.message);
    }

    // Fetch FULL address and parcel details from Terminal Africa
    let addressFromDetails = {};
    let addressToDetails = {};
    let parcelDetails = {};
    
    try {
      const [fromResponse, toResponse, parcelResponse] = await Promise.all([
        terminalAfricaAPI.get(`/addresses/${address_from_id}`).catch(err => null),
        terminalAfricaAPI.get(`/addresses/${address_to_id}`).catch(err => null),
        terminalAfricaAPI.get(`/parcels/${parcel_id}`).catch(err => null)
      ]);
      
      addressFromDetails = fromResponse?.data?.data || {};
      addressToDetails = toResponse?.data?.data || {};
      parcelDetails = parcelResponse?.data?.data || {};
      
      console.log("📍 Fetched details:", {
        address_from: addressFromDetails?.name,
        address_to: addressToDetails?.name,
        parcel_weight: parcelDetails?.weight
      });
    } catch (fetchError) {
      console.warn("⚠️ Could not fetch all details:", fetchError.message);
    }

    // Get the shipment ID (use whichever field exists)
    const shipmentId = terminalShipment.id || terminalShipment.shipment_id;
    const trackingNumber = terminalShipment.tracking_number || "";

    // Prepare shipment data for our database - with ALL required fields
    const shipmentDataForDB = {
      user: userId,
      terminalShipmentId: shipmentId,
      terminalAddressFromId: address_from_id,
      terminalAddressToId: address_to_id,
      terminalParcelId: parcel_id,
      terminalRateId: rate_id,

      trackingNumber: trackingNumber,
      reference: terminalShipment.reference || `SHIP-${Date.now()}`,
      status: terminalShipment.status || "draft",

      // Sender details - from Terminal Africa response or fetched details
      sender: {
        name: addressFromDetails.name || terminalShipment.address_from?.name || "Unknown Sender",
        address: addressFromDetails.address || terminalShipment.address_from?.address || "Unknown Address",
        city: addressFromDetails.city || terminalShipment.address_from?.city || "",
        state: addressFromDetails.state || terminalShipment.address_from?.state || "",
        country: addressFromDetails.country || terminalShipment.address_from?.country || "NG",
        phone: addressFromDetails.phone || terminalShipment.address_from?.phone || "",
        email: addressFromDetails.email || terminalShipment.address_from?.email || user.email,
      },
      
      // Receiver details
      receiver: {
        name: addressToDetails.name || terminalShipment.address_to?.name || "Unknown Receiver",
        address: addressToDetails.address || terminalShipment.address_to?.address || "Unknown Address",
        city: addressToDetails.city || terminalShipment.address_to?.city || "",
        state: addressToDetails.state || terminalShipment.address_to?.state || "",
        country: addressToDetails.country || terminalShipment.address_to?.country || "NG",
        phone: addressToDetails.phone || terminalShipment.address_to?.phone || "",
        email: addressToDetails.email || terminalShipment.address_to?.email || "",
      },
      
      // Parcel details
      parcel: {
        weight: parcelDetails.weight || terminalShipment.parcel?.weight || 1,
        length: parcelDetails.length || terminalShipment.parcel?.length || 10,
        width: parcelDetails.width || terminalShipment.parcel?.width || 10,
        height: parcelDetails.height || terminalShipment.parcel?.height || 10,
        description: parcelDetails.description || terminalShipment.parcel?.description || "Shipment parcel",
        items: parcelDetails.items || terminalShipment.parcel?.items || [],
      },

      // Shipping details
      shipping: {
        carrier: rate.carrier?.slug || rate.carrier || "unknown",
        carrier_name: rate.carrier_name || rate.carrier?.name || "Unknown Carrier",
        service: rate.service || "Standard",
        rate_id: rate_id,
        amount: rate.amount || 0,
        currency: rate.currency || "NGN",
        estimated_delivery: rate.estimated_delivery, // Already a Date object
      },

      // Metadata
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        terminal_africa_response: terminalShipment
      },
      
      shipment_purpose: shipment_purpose,

      // Payment
      payment: {
        status: "pending",
        amount: rate.amount || 0,
        currency: rate.currency || "NGN",
      },
    };

    console.log("📋 Shipment data for DB:", JSON.stringify(shipmentDataForDB, null, 2));

    // Create and save shipment
    const shipment = new Shipment(shipmentDataForDB);
    await shipment.save();

    console.log("✅ Shipment saved to database:", shipment._id);

    // Try to purchase the shipment
    let purchaseStatus = "not_purchased";
    try {
      await terminalAfricaAPI.post(
        `/shipments/${shipmentId}/purchase`,
        {
          rate: rate_id,
        }
      );

      shipment.status = "pending";
      purchaseStatus = "purchased";
      await shipment.save();
      console.log("✅ Shipment purchased successfully");
    } catch (purchaseError) {
      console.log(
        "⚠️ Shipment created but not purchased:",
        purchaseError.message
      );
      shipment.status = "draft";
      await shipment.save();
    }

    res.status(201).json({
      success: true,
      message: "Shipment created successfully",
      data: {
        shipment: {
          id: shipment._id,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          shipping: shipment.shipping,
          createdAt: shipment.createdAt,
        },
        terminalShipmentId: shipmentId,
        purchaseStatus: purchaseStatus,
        trackingNumber: trackingNumber,
      },
    });
  } catch (error) {
    console.error("❌ Error creating shipment:", {
      message: error.message,
      stack: error.stack,
    });

    // Check if it's a Mongoose validation error
    if (error.name === "ValidationError") {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      
      console.error("📋 Validation Errors:", JSON.stringify(errors, null, 2));
      
      return res.status(400).json({
        success: false,
        message: "Shipment validation failed",
        errors: errors,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create shipment",
    });
  }
};

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
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting shipments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
      user: userId,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    // Get updated tracking info from Terminal Africa
    try {
      const response = await terminalAfricaAPI.get(
        `/shipments/${shipment.terminalShipmentId}`
      );
      const terminalShipment = response.data.data;

      // Update shipment status if changed
      if (shipment.status !== terminalShipment.status) {
        shipment.status = terminalShipment.status;
        shipment.trackingEvents = terminalShipment.tracking_events || [];
        await shipment.save();
      }
    } catch (terminalError) {
      console.log(
        "Could not fetch updated tracking info:",
        terminalError.message
      );
    }

    res.status(200).json({
      success: true,
      data: { shipment },
    });
  } catch (error) {
    console.error("Error getting shipment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
      user: userId,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    // Check if shipment can be cancelled
    if (!["draft", "pending"].includes(shipment.status)) {
      return res.status(400).json({
        success: false,
        message: `Shipment cannot be cancelled in ${shipment.status} status`,
      });
    }

    // Cancel on Terminal Africa
    await terminalAfricaAPI.post(
      `/shipments/${shipment.terminalShipmentId}/cancel`
    );

    // Update in database
    shipment.status = "cancelled";
    shipment.cancelledAt = new Date();
    await shipment.save();

    res.status(200).json({
      success: true,
      message: "Shipment cancelled successfully",
      data: { shipment },
    });
  } catch (error) {
    console.error("Error cancelling shipment:", error);

    if (error.response?.data) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || "Failed to cancel shipment",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while cancelling shipment",
    });
  }
};

// @desc    Get carriers - FIXED
// @route   GET /api/shipments/carriers/all
// @access  Private
exports.getCarriers = async (req, res) => {
  try {
    console.log("🔄 Getting carriers from Terminal Africa...");

    // Get available carriers from Terminal Africa
    const response = await terminalAfricaAPI.get("/carriers");
    const carriers = response.data.data || [];

    console.log(`✅ Found ${carriers.length} carriers`);

    // Format carriers for frontend
    const formattedCarriers = carriers.map((carrier) => ({
      id: carrier.id || carrier._id,
      name: carrier.name || "Unknown Carrier",
      slug: carrier.slug || carrier.name?.toLowerCase().replace(/\s+/g, "-"),
      description: carrier.description || "",
      logo: carrier.logo || "",
      is_active: carrier.is_active !== false,
      services: carrier.services || [],
      countries: carrier.countries || [],
    }));

    res.status(200).json({
      success: true,
      data: formattedCarriers,
    });
  } catch (error) {
    console.error("Error getting carriers:", {
      message: error.message,
      response: error.response?.data,
    });

    let errorMessage = "Failed to get carriers";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage,
    });
  }
};

// @desc    Test Terminal Africa connection
// @route   GET /api/shipments/test
// @access  Private
exports.testConnection = async (req, res) => {
  try {
    console.log("🔍 Testing Terminal Africa connection...");

    // Test authentication
    const authResponse = await terminalAfricaAPI.get("/addresses?limit=1");

    // Test carriers
    const carriersResponse = await terminalAfricaAPI.get("/carriers");
    const carriers = carriersResponse.data.data || [];

    res.status(200).json({
      success: true,
      message: "Terminal Africa connection successful",
      data: {
        authenticated: true,
        carriers_count: carriers.length,
        api_key_exists: !!TERMINAL_AFRICA_API_KEY,
        base_url: TERMINAL_AFRICA_BASE_URL,
        sample_carriers: carriers
          .slice(0, 3)
          .map((c) => ({ name: c.name, id: c.id })),
      },
    });
  } catch (error) {
    console.error("❌ Terminal Africa test failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Terminal Africa connection failed",
      error: error.message,
      details: error.response?.data,
    });
  }
};
exports.purchaseShipment = async (req, res) => {
  try {
    console.log("🔍 Testing Terminal Africa connection...");

    // Test authentication
    const authResponse = await terminalAfricaAPI.get("/addresses?limit=1");

    // Test carriers
    const carriersResponse = await terminalAfricaAPI.get("/carriers");
    const carriers = carriersResponse.data.data || [];

    res.status(200).json({
      success: true,
      message: "Terminal Africa connection successful",
      data: {
        authenticated: true,
        carriers_count: carriers.length,
        api_key_exists: !!TERMINAL_AFRICA_API_KEY,
        base_url: TERMINAL_AFRICA_BASE_URL,
        sample_carriers: carriers
          .slice(0, 3)
          .map((c) => ({ name: c.name, id: c.id })),
      },
    });
  } catch (error) {
    console.error("❌ Terminal Africa test failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Terminal Africa connection failed",
      error: error.message,
      details: error.response?.data,
    });
  }
};

module.exports = exports;
