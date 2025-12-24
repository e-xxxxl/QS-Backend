const axios = require("axios");

// Track a shipment - handles both POST and GET
exports.trackShipment = async (req, res) => {
  try {
    // Get shipment_id from params (for GET /:shipment_id) OR from body (for POST /track)
    const shipment_id = req.params.shipment_id || req.body.shipment_id;
    const { email } = req.body; // Optional email for additional validation

    console.log(`Tracking shipment: ${shipment_id}`);
    console.log("Request method:", req.method);
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    
    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        message: "Shipment ID is required"
      });
    }

    // Call Terminal Africa API to track shipment
    const response = await axios.get(`https://sandbox.terminal.africa/v1/shipments/track/${shipment_id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    });

    console.log("Tracking API response status:", response.status);
    
    if (response.data && response.data.status === true) {
      const trackingData = response.data.data || {};
      
      // Format the tracking data according to Terminal Africa's response structure
      const formattedTracking = {
        shipmentId: trackingData.shipment_id || shipment_id,
        trackingNumber: trackingData.carrier_tracking_number || shipment_id,
        status: trackingData.status || "unknown",
        statusDescription: getStatusDescription(trackingData.status),
        
        // Carrier information
        carrier: trackingData.carrier || {},
        carrierTrackingNumber: trackingData.carrier_tracking_number,
        
        // Address information
        origin: formatAddress(trackingData.address_from, "origin"),
        destination: formatAddress(trackingData.address_to, "destination"),
        
        // Dates
        pickupDate: trackingData.pickup_date,
        deliveryDate: trackingData.delivery_date,
        deliveryArranged: trackingData.delivery_arranged,
        estimatedDelivery: trackingData.delivery_date || trackingData.delivery_arranged,
        
        // Tracking events
        events: formatTrackingEvents(trackingData.events || []),
        trackingStatus: trackingData.tracking_status || {},
        
        // Metadata
        createdAt: trackingData.created_at,
        updatedAt: trackingData.updated_at,
        
        // Package details (might need to fetch from another endpoint)
        packageDetails: {
          description: "Check shipment details for package information"
        }
      };
      
      return res.status(200).json({
        success: true,
        message: "Tracking information retrieved",
        tracking: formattedTracking
      });
    } else {
      console.log("Tracking API returned false status:", response.data?.message);
      
      // Return the actual API error message
      return res.status(400).json({
        success: false,
        message: response.data?.message || "Failed to track shipment",
        tracking: null
      });
    }

  } catch (err) {
    console.error("Error tracking shipment:", err.message);
    console.error("Error response:", err.response?.data);
    
    // Check if it's a 404 - shipment not found
    if (err.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found. Please check your tracking ID.",
        tracking: null
      });
    }
    
    // Check for other API errors
    if (err.response?.data) {
      return res.status(err.response.status).json({
        success: false,
        message: err.response.data.message || "Tracking API error",
        tracking: null
      });
    }
    
    // General error
    return res.status(500).json({
      success: false,
      message: "Failed to track shipment. Please try again later.",
      tracking: null
    });
  }
};

// Helper function to format address
function formatAddress(addressData, type) {
  if (!addressData) {
    return {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      phone: "",
      email: "",
      isResidential: false
    };
  }
  
  return {
    name: `${addressData.first_name || ""} ${addressData.last_name || ""}`.trim(),
    firstName: addressData.first_name || "",
    lastName: addressData.last_name || "",
    address: addressData.line1 || "",
    address2: addressData.line2 || "",
    city: addressData.city || "",
    state: addressData.state || "",
    country: addressData.country || "",
    zip: addressData.zip || "",
    phone: addressData.phone || "",
    email: addressData.email || "",
    isResidential: addressData.is_residential || false,
    coordinates: addressData.coordinates || null,
    userId: addressData.user || "",
    addressId: addressData.address_id || ""
  };
}

// Helper function to format tracking events
function formatTrackingEvents(events) {
  if (!Array.isArray(events)) return [];
  
  return events.map(event => ({
    status: event.status || "Unknown",
    description: event.description || event.message || "",
    location: event.location || "",
    timestamp: event.timestamp || event.date || event.created_at || "",
    date: formatDate(event.timestamp || event.date || event.created_at),
    city: event.city || "",
    state: event.state || "",
    country: event.country || "",
    zip: event.zip || ""
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by date (newest first)
}

// Helper function to get status description
function getStatusDescription(status) {
  const statusMap = {
    "draft": "Shipment is in draft stage",
    "pending": "Shipment is pending processing",
    "processing": "Shipment is being processed",
    "in_transit": "Shipment is in transit",
    "out_for_delivery": "Shipment is out for delivery",
    "delivered": "Shipment has been delivered",
    "failed": "Delivery attempt failed",
    "cancelled": "Shipment has been cancelled",
    "exception": "There's an exception with the shipment",
    "unknown": "Status unknown"
  };
  
  return statusMap[status?.toLowerCase()] || "Status unknown";
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

// Get shipment details for more package info
exports.getShipmentDetails = async (req, res) => {
  try {
    // Get shipment_id from params (for GET /:shipment_id/details)
    const { shipment_id } = req.params;
    
    console.log(`Getting details for shipment: ${shipment_id}`);
    
    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        message: "Shipment ID is required"
      });
    }

    const response = await axios.get(`https://sandbox.terminal.africa/v1/shipments/${shipment_id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    });

    if (response.data && response.data.status === true) {
      const shipmentData = response.data.data || {};
      
      // Extract package details
      const packageDetails = {
        weight: shipmentData.weight ? `${shipmentData.weight} kg` : null,
        dimensions: shipmentData.dimensions ? 
          `${shipmentData.dimensions.length || 0} × ${shipmentData.dimensions.width || 0} × ${shipmentData.dimensions.height || 0} cm` : null,
        description: shipmentData.description || "No description",
        value: shipmentData.value ? 
          `${shipmentData.currency || 'NGN'} ${shipmentData.value}` : null,
        items: shipmentData.items || []
      };
      
      return res.status(200).json({
        success: true,
        message: "Shipment details retrieved",
        packageDetails,
        shipment: shipmentData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data?.message || "Failed to get shipment details",
        packageDetails: null
      });
    }

  } catch (err) {
    console.error("Error getting shipment details:", err.message);
    
    return res.status(500).json({
      success: false,
      message: "Failed to get shipment details",
      packageDetails: null
    });
  }
};