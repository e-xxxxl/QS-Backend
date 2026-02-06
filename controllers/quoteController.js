const axios = require("axios");

// Get Quote Rates Controller
exports.getQuoteRates = async (req, res) => {
  try {
    console.log("Received quote request:", req.body);

    const {
      fromCountry,
      fromState,
      fromCity,
      toCountry,
      toState,
      toCity,
      currency,
      weight
    } = req.body;

    // Validate required fields
    if (!fromCountry || !fromCity || !toCountry || !toCity || !weight) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: fromCountry, fromCity, toCountry, toCity, weight"
      });
    }

    // Build correct payload for Terminal Africa
    const payload = {
      pickup_address: {
        city: fromCity,
        state: fromState ,
        country: fromCountry
      },
      delivery_address: {
        city: toCity,
        state: toState ,
        country: toCountry
      },
      parcel: {
        description: "General Goods Shipment", // Description at parcel level
        items: [
          {
            name: "Shipment Item",
            description: "General goods shipment", // ✅ ADD THIS - item description
            type: "general",
            currency: currency || "USD",
            value: 100, // Value in specified currency
            quantity: 1,
            weight: parseFloat(weight),
            weight_unit: "kg"
          }
        ],
        packaging: "box",
        weight_unit: "kg"
      },
      currency: currency || "USD"
    };

    console.log("Sending to Terminal Africa:", JSON.stringify(payload, null, 2));

    // Send request to Terminal Africa API
    const response = await axios.post(
      "https://api.terminal.africa/v1/rates/shipment/quotes",
      payload,
      {
        headers: {
          "Authorization": `Bearer ${process.env.TSHIP_SECRET_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 50000
      }
    );

    console.log("Terminal Africa Response Status:", response.status);
    console.log("Terminal Africa Response Data:", JSON.stringify(response.data, null, 2));

    if (response.data && response.data.success === false) {
      return res.status(400).json({
        success: false,
        message: response.data.message || "Failed to get quotes",
        data: response.data
      });
    }

    // Check if we have rates
    if (!response.data.data || response.data.data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No shipping rates available for this route",
        quotes: [],
        raw: response.data
      });
    }

    // Format the response for frontend
    const quotes = response.data.data.map(rate => ({
      carrier_name: rate.carrier_name,
      carrier_logo: rate.carrier_logo,
      service_name: rate.service_name,
      amount: rate.amount,
      currency: rate.currency,
      estimated_delivery: rate.estimated_delivery || rate.delivery_time,
      delivery_time: rate.delivery_time,
      pickup_time: rate.pickup_time,
      rate_id: rate.rate_id,
      tracking_available: rate.tracking_available || false,
      insurance_available: rate.insurance_available || false,
      metadata: rate.metadata || {}
    }));

    return res.status(200).json({
      success: true,
      message: "Quotes retrieved successfully",
      count: quotes.length,
      quotes: quotes,
      raw: response.data
    });

  } catch (err) {
    console.error("TERMINAL AFRICA QUOTE ERROR DETAILS:");
    console.error("Error Message:", err.message);
    
    if (err.response) {
      console.error("Response Status:", err.response.status);
      console.error("Response Data:", JSON.stringify(err.response.data, null, 2));
      
      // Helpful debugging for specific errors
      if (err.response.status === 400) {
        const errorMsg = err.response.data.message;
        console.log("Validation Error Details:", errorMsg);
        
        // Guide for common errors
        if (errorMsg.includes("description")) {
          console.log("⚠️ Fix: Add 'description' field to all items in the items array");
        }
      }
    }

    // User-friendly error messages
    let errorMessage = "Failed to fetch shipping quotes";
    let statusCode = 500;

    if (err.response) {
      statusCode = err.response.status;
      const data = err.response.data;
      
      if (statusCode === 401) {
        errorMessage = "Invalid API credentials. Please check your Terminal Africa API key.";
      } else if (statusCode === 400) {
        errorMessage = data.message || "Invalid request parameters";
        // Provide specific guidance
        if (data.message.includes("description")) {
          errorMessage = "Item description is required for all items in the shipment.";
        }
      } else if (statusCode === 404) {
        errorMessage = "Shipping service not available for this route.";
      }
    }

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: err.response?.data?.message || err.message,
      details: process.env.NODE_ENV === 'development' ? {
        apiError: err.response?.data,
        payloadSent: payload // This will help debug
      } : undefined
    });
  }
};