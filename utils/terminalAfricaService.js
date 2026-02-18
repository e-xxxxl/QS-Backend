// // utils/terminalAfricaService.js
// const axios = require('axios'); // Install axios: npm install axios

// class TerminalAfricaService {
//   // Add this helper function at the top of the class or in the same file
// normalizeStatus(status) {
//   if (!status) return 'pending';
  
//   const statusLower = status.toLowerCase();
  
//   // Map Terminal Africa statuses to our statuses
//   const statusMap = {
//     'draft': 'pending',
//     'processing': 'processing',
//     'in_transit': 'in_transit',
//     'delivered': 'delivered',
//     'cancelled': 'cancelled',
//     'failed': 'cancelled'
//   };
  
//   return statusMap[statusLower] || 'pending';
// }


//   constructor() {
//     this.baseURL = process.env.TERMINAL_AFRICA_BASE_URL;
//     this.apiKey = process.env.TSHIP_SECRET_KEY;
//   }


// async createShipment(shipmentData) {
//   try {
//     console.log('🚀 Creating shipment on Terminal Africa...');
    
//     const { 
//       address_from_id, 
//       address_to_id, 
//       parcel_id, 
//       rate_id, 
//       metadata = {} 
//     } = shipmentData;

//     // Validate required fields
//     if (!address_from_id || !address_to_id || !rate_id) {
//       throw new Error('Missing required shipment data: address_from, address_to, or rate_id');
//     }

//     // Ensure items array has proper structure
//     const items = (metadata.items && Array.isArray(metadata.items) && metadata.items.length > 0) 
//       ? metadata.items.map(item => ({
//           name: item.name || item.description || 'Shipment Item',
//           description: item.description || 'Shipment Item',
//           quantity: parseInt(item.quantity) || 1,
//           value: parseFloat(item.value) || 0,
//           currency: item.currency || 'NGN',
//           weight: parseFloat(item.weight) || parseFloat(metadata.parcel_weight) || 1
//         }))
//       : [{
//           name: 'Shipment Item',
//           description: metadata.parcel_description || 'Shipment parcel',
//           quantity: 1,
//           value: parseFloat(metadata.original_amount) || 0,
//           currency: 'NGN',
//           weight: parseFloat(metadata.parcel_weight) || 1
//         }];

//     // Try different payload structures based on Terminal Africa's API
//     const terminalData = {
//       address_from: address_from_id,
//       address_to: address_to_id,
//       parcel: {
//         weight: parseFloat(metadata.parcel_weight),
//         length: parseFloat(metadata.parcel_length),
//         width: parseFloat(metadata.parcel_width),
//         height: parseFloat(metadata.parcel_height),
//         items: items
//       },
//       rate: rate_id,  // Try 'rate' instead of 'rate_id'
//       shipment_purpose: metadata.shipment_purpose || 'commercial'
//     };

//     console.log('📦 Creating shipment with inline parcel object');
//     console.log('📦 Terminal Africa request data:', JSON.stringify(terminalData, null, 2));

//     // Make API request
//     const response = await axios.post(
//       `${this.baseURL}/shipments`, 
//       terminalData,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${this.apiKey}`
//         },
//         timeout: 30000,
//         validateStatus: (status) => status >= 200 && status < 500
//       }
//     );

//     console.log('📊 Terminal Africa response FULL:', {
//       status: response.status,
//       data: response.data
//     });

//     // Check if response indicates success (even if success flag is undefined)
//     if ((response.data && response.data.success === true) || 
//         (response.data && response.data.message === 'Shipment created successfully')) {
      
//       console.log('✅ Main format succeeded!');
//       const terminalShipment = response.data.data || response.data;
      
//       return {
//         success: true,
//         shipment_id: terminalShipment.shipment_id || terminalShipment.id,
//         tracking_number: terminalShipment.tracking_number || 'TRACK_' + Date.now(),
//        status: this.normalizeStatus(terminalShipment.status), // Use the helper
//         carrier: terminalShipment.carrier || metadata.carrier || 'quickdelivery',
//         carrier_name: terminalShipment.carrier_name || metadata.carrier_name || 'Fez Delivery',
//         rate_id: terminalShipment.rate_id || rate_id,
//         label_url: terminalShipment.label_url,
//         tracking_url: terminalShipment.tracking_url,
//         estimated_delivery: terminalShipment.estimated_delivery_date || terminalShipment.estimated_delivery,
//         amount: terminalShipment.amount || parseFloat(metadata.total_amount) || 0,
//         currency: terminalShipment.currency || metadata.currency || 'NGN'
//       };
//     }

//     // If we get here, the main format failed
//     const errorMessage = response.data?.message || 'Unknown error creating shipment';
//     console.error('❌ Terminal Africa API error:', {
//       status: response.status,
//       message: errorMessage,
//       data: response.data
//     });
    
//     // If validation failed, try alternative format
//     if (errorMessage.includes('could not be validated')) {
//       console.log('🔄 Trying alternative payload format...');
//       return await this.createShipmentAlternative(shipmentData);
//     }
    
//     throw new Error(errorMessage);

//   } catch (error) {
//     console.error('❌ Terminal Africa shipment creation error:', error.message);
    
//     if (error.response) {
//       console.error('Error response:', {
//         status: error.response.status,
//         statusText: error.response.statusText,
//         data: error.response.data
//       });
//     }
    
//     throw new Error(`Failed to create shipment on Terminal Africa: ${error.message}`);
//   }
// }


// async createShipmentAlternative(shipmentData) {
//   try {
//     const { 
//       address_from_id, 
//       address_to_id, 
//       parcel_id, 
//       rate_id, 
//       metadata = {} 
//     } = shipmentData;

//     console.log('🔄 Attempting alternative shipment creation format...');

//     // Format 2: Using parcels array with parcel_id
//     const terminalData = {
//       address_from: address_from_id,
//       address_to: address_to_id,
//       parcels: parcel_id ? [parcel_id] : undefined,
//       rate: rate_id,
//       metadata: {
//         shipment_purpose: metadata.shipment_purpose || 'commercial',
//         ...metadata // Include all metadata
//       }
//     };

//     // If no parcel_id, include parcel data
//     if (!parcel_id) {
//       const items = metadata.items || [{
//         name: 'Shipment Item',
//         description: metadata.parcel_description || 'Shipment parcel',
//         quantity: 1,
//         value: parseFloat(metadata.original_amount) || 0,
//         currency: 'NGN',
//         weight: parseFloat(metadata.parcel_weight) || 1
//       }];

//       terminalData.parcels = [{
//         weight: parseFloat(metadata.parcel_weight) || 1,
//         length: parseFloat(metadata.parcel_length) || 10,
//         width: parseFloat(metadata.parcel_width) || 10,
//         height: parseFloat(metadata.parcel_height) || 10,
//         items: items
//       }];
//     }

//     console.log('📦 Alternative request data:', JSON.stringify(terminalData, null, 2));

//     const response = await axios.post(
//       `${this.baseURL}/shipments`, 
//       terminalData,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${this.apiKey}`
//         },
//         timeout: 30000
//       }
//     );

//     console.log('📊 Alternative response FULL:', {
//       status: response.status,
//       data: response.data
//     });

//     // FIXED: Handle the case where success might be undefined but message indicates success
//     if (response.data && (response.data.success === true || response.data.message === 'Shipment created successfully')) {
//       console.log('✅ Alternative format SUCCEEDED!');
      
//       // Extract data from response - handle different response structures
//       const terminalShipment = response.data.data || response.data;
      
//       console.log('📦 Parsed terminal shipment data:', terminalShipment);
      
//       // Get carrier info from metadata or response
//       const carrierName = terminalShipment.carrier_name || 
//                          metadata.carrier_name || 
//                          metadata.carrier || 
//                          'Fez Delivery';
      
//       // Get amount from metadata or response
//       const amount = terminalShipment.amount || 
//                     parseFloat(metadata.total_amount) || 
//                     parseFloat(metadata.original_amount) || 
//                     0;
      
//       return {
//         success: true,
//         shipment_id: terminalShipment.shipment_id || terminalShipment.id || 'check-dashboard',
//         tracking_number: terminalShipment.tracking_number || 'TRACK_' + Date.now(),
//          status: this.normalizeStatus(terminalShipment.status), // Normalize here
//         carrier: terminalShipment.carrier || metadata.carrier || 'quickdelivery',
//         carrier_name: carrierName,
//         rate_id: terminalShipment.rate_id || rate_id,
//         label_url: terminalShipment.label_url,
//         tracking_url: terminalShipment.tracking_url,
//         estimated_delivery: terminalShipment.estimated_delivery_date || 
//                           terminalShipment.estimated_delivery ||
//                           metadata.estimated_delivery,
//         amount: amount,
//         currency: terminalShipment.currency || metadata.currency || 'NGN',
//         note: 'Created via alternative format'
//       };
//     } else {
//       console.error('❌ Alternative format failed:', response.data);
//       throw new Error(response.data?.message || 'Alternative format failed');
//     }

//   } catch (error) {
//     console.error('❌ Alternative format failed with error:', error.message);
    
//     // Check if error message actually indicates success
//     if (error.message.includes('Shipment created successfully') || 
//         (error.response && error.response.data?.message === 'Shipment created successfully')) {
//       console.log('⚠️ Error message indicates success, treating as success...');
      
//       // Extract data from error response if available
//       const errorData = error.response?.data || {};
      
//       return {
//         success: true,
//         shipment_id: errorData.data?.shipment_id || errorData.data?.id || 'check-dashboard',
//         tracking_number: errorData.data?.tracking_number || 'pending',
//         status: errorData.data?.status || 'processing',
//         carrier: errorData.data?.carrier || shipmentData.metadata?.carrier || 'unknown',
//         carrier_name: errorData.data?.carrier_name || shipmentData.metadata?.carrier_name || 'Fez Delivery',
//         rate_id: shipmentData.rate_id,
//         label_url: errorData.data?.label_url,
//         tracking_url: errorData.data?.tracking_url,
//         estimated_delivery: errorData.data?.estimated_delivery_date || errorData.data?.estimated_delivery,
//         amount: parseFloat(shipmentData.metadata?.total_amount) || 0,
//         currency: shipmentData.metadata?.currency || 'NGN',
//         note: 'Created but response parsing issue'
//       };
//     }
    
//     throw error;
//   }
// }
// async testConnection() {
//     try {
//       const response = await axios.get(`${this.baseURL}/addresses`, {
//         headers: {
//           'Authorization': `Bearer ${this.apiKey}`
//         }
//       });

//       return {
//         success: response.data.success,
//         status: response.status,
//         message: 'Terminal Africa connection successful'
//       };
//     } catch (error) {
//       console.error('❌ Terminal Africa connection test failed:', error);
//       throw error;
//     }
//   }

//   async debugParcelIssue() {
//   try {
//     console.log('🔍 Debugging parcel issue...');
    
//     // Test 1: Check if the parcel already exists
//     const parcelId = 'PC-T7DBWC87FXVOO0OM'; // From your logs
    
//     try {
//       const parcelResponse = await axios.get(`${this.baseURL}/parcels/${parcelId}`, {
//         headers: {
//           'Authorization': `Bearer ${this.apiKey}`
//         }
//       });
      
//       console.log('✅ Parcel exists:', parcelResponse.data);
      
//       // Try creating shipment with parcel ID
//       const testShipment = {
//         shipment: {
//           address_from: 'AD-MKVUG4QBHC950QDF',
//           address_to: 'AD-U0VWZ4GEOTMB11K8',
//           parcels: [parcelId], // Just the ID since it exists
//           rates: ['RT-S3CRYC7NRBZ5UP8K'],
//           metadata: {},
//           async: false
//         }
//       };
      
//       console.log('📦 Testing with parcel ID:', JSON.stringify(testShipment, null, 2));
      
//       const response = await axios.post(`${this.baseURL}/shipments`, testShipment, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${this.apiKey}`
//         }
//       });
      
//       console.log('✅ Shipment created with parcel ID:', response.data);
//       return response.data;
      
//     } catch (parcelError) {
//       console.log('❌ Parcel not found or other issue:', parcelError.response?.data || parcelError.message);
      
//       // Test 2: Create a new parcel first
//       const newParcel = {
//         parcel: {
//           weight: 73,
//           length: 76,
//           width: 17,
//           height: 26,
//           items: [{
//             description: "Test item",
//             quantity: 1,
//             value: 1000,
//             currency: "NGN",
//             weight: 73
//           }]
//         }
//       };
      
//       console.log('📦 Creating new parcel:', JSON.stringify(newParcel, null, 2));
      
//       const parcelCreateResponse = await axios.post(`${this.baseURL}/parcels`, newParcel, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${this.apiKey}`
//         }
//       });
      
//       if (parcelCreateResponse.data.success) {
//         const newParcelId = parcelCreateResponse.data.data.id;
//         console.log('✅ New parcel created:', newParcelId);
        
//         // Now try creating shipment with new parcel ID
//         const testShipment2 = {
//           shipment: {
//             address_from: 'AD-MKVUG4QBHC950QDF',
//             address_to: 'AD-U0VWZ4GEOTMB11K8',
//             parcels: [newParcelId],
//             rates: ['RT-S3CRYC7NRBZ5UP8K'],
//             metadata: {},
//             async: false
//           }
//         };
        
//         const shipmentResponse = await axios.post(`${this.baseURL}/shipments`, testShipment2, {
//           headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${this.apiKey}`
//           }
//         });
        
//         console.log('✅ Shipment created with new parcel:', shipmentResponse.data);
//         return shipmentResponse.data;
//       }
//     }
    
//   } catch (error) {
//     console.error('❌ Debug failed:', error);
    
//     if (error.response) {
//       console.error('Full error details:', {
//         status: error.response.status,
//         statusText: error.response.statusText,
//         headers: error.response.headers,
//         data: error.response.data,
//         config: {
//           url: error.config?.url,
//           method: error.config?.method,
//           data: error.config?.data
//         }
//       });
//     }
    
//     throw error;
//   }
// }
// }



// module.exports = new TerminalAfricaService();






// utils/terminalAfricaService.js
const axios = require('axios'); // Install axios: npm install axios

class TerminalAfricaService {
  // Add this helper function at the top of the class or in the same file
normalizeStatus(status) {
  if (!status) return 'pending';
  
  const statusLower = status.toLowerCase();
  
  // Map Terminal Africa statuses to our statuses
  const statusMap = {
    'draft': 'pending',
    'processing': 'processing',
    'in_transit': 'in_transit',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'failed': 'cancelled'
  };
  
  return statusMap[statusLower] || 'pending';
}


  constructor() {
    this.baseURL = process.env.TERMINAL_AFRICA_BASE_URL;
    this.apiKey = process.env.TSHIP_SECRET_KEY;
  }


  // utils/terminalAfricaService.js  ← Replace your entire createShipment + createShipmentAlternative

async createShipment(shipmentData) {
  try {
    console.log('🚀 Creating shipment on Terminal Africa...');

    const { 
      address_from_id, 
      address_to_id, 
      parcel_id,      // ← This is the key! You already have it
      rate_id, 
      metadata = {} 
    } = shipmentData;

    if (!address_from_id || !address_to_id || !parcel_id) {
      throw new Error('address_from_id, address_to_id and parcel_id are required');
    }

    // ✅ CORRECT payload for single parcel (exactly what the docs require)
    const terminalData = {
      address_from: address_from_id,
      address_to: address_to_id,
      parcel: parcel_id,                    // ← STRING ID, not object!
      shipment_purpose: metadata.shipment_purpose || 'commercial',
      metadata: {
        ...metadata,
        user_email: metadata.user_email ,
        created_via: 'quickshipafrica',
        paid_via_paystack: true,
        paystack_reference: metadata.paystack_reference || ''
      }
    };

    console.log('📦 Final Terminal Africa request (correct format):', 
      JSON.stringify(terminalData, null, 2));

    const response = await axios.post(
      `${this.baseURL}/shipments`,
      terminalData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 30000
      }
    );

    console.log('✅ Terminal Africa create response:', {
      status: response.status,
      success: response.data?.success,
      shipment_id: response.data?.data?.shipment_id || response.data?.data?.id
    });

    const terminalShipment = response.data.data || response.data;

    // Optional: If you want to "book" the rate immediately (recommended for paid flows)
    // Many users do this right after create
    let purchased = false;
    if (rate_id) {
      try {
        await axios.post(
          `${this.baseURL}/shipments/${terminalShipment.shipment_id || terminalShipment.id}/purchase`,
          { rate: rate_id },
          { headers: { Authorization: `Bearer ${this.apiKey}` } }
        );
        purchased = true;
        console.log('✅ Rate purchased successfully');
      } catch (purchaseErr) {
        console.warn('⚠️ Shipment created but rate purchase failed (still usable):', purchaseErr.message);
      }
    }

    return {
      success: true,
      shipment_id: terminalShipment.shipment_id || terminalShipment.id,
      tracking_number: terminalShipment.tracking_number || `TRACK_${Date.now()}`,
      status: terminalShipment.status || 'pending',
      carrier: terminalShipment.carrier || metadata.carrier ,
      carrier_name: terminalShipment.carrier_name || metadata.carrier_name ,
      rate_id: rate_id,
      label_url: terminalShipment.label_url,
      tracking_url: terminalShipment.tracking_url,
      estimated_delivery: terminalShipment.estimated_delivery || metadata.estimated_delivery,
      amount: parseFloat(metadata.total_amount) || 0,
      currency: 'NGN',
      purchased
    };

  } catch (error) {
    console.error('❌ Terminal Africa shipment creation error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw new Error(`Failed to create shipment on Terminal Africa: ${error.message}`);
  }
}


async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/addresses`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: response.data.success,
        status: response.status,
        message: 'Terminal Africa connection successful'
      };
    } catch (error) {
      console.error('❌ Terminal Africa connection test failed:', error);
      throw error;
    }
  }

  async debugParcelIssue() {
  try {
    console.log('🔍 Debugging parcel issue...');
    
    // Test 1: Check if the parcel already exists
    const parcelId = 'PC-T7DBWC87FXVOO0OM'; // From your logs
    
    try {
      const parcelResponse = await axios.get(`${this.baseURL}/parcels/${parcelId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      console.log('✅ Parcel exists:', parcelResponse.data);
      
      // Try creating shipment with parcel ID
      const testShipment = {
        shipment: {
          address_from: 'AD-MKVUG4QBHC950QDF',
          address_to: 'AD-U0VWZ4GEOTMB11K8',
          parcels: [parcelId], // Just the ID since it exists
          rates: ['RT-S3CRYC7NRBZ5UP8K'],
          metadata: {},
          async: false
        }
      };
      
      console.log('📦 Testing with parcel ID:', JSON.stringify(testShipment, null, 2));
      
      const response = await axios.post(`${this.baseURL}/shipments`, testShipment, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      console.log('✅ Shipment created with parcel ID:', response.data);
      return response.data;
      
    } catch (parcelError) {
      console.log('❌ Parcel not found or other issue:', parcelError.response?.data || parcelError.message);
      
      // Test 2: Create a new parcel first
      const newParcel = {
        parcel: {
          weight: 73,
          length: 76,
          width: 17,
          height: 26,
          items: [{
            description: "Test item",
            quantity: 1,
            value: 1000,
            currency: "NGN",
            weight: 73
          }]
        }
      };
      
      console.log('📦 Creating new parcel:', JSON.stringify(newParcel, null, 2));
      
      const parcelCreateResponse = await axios.post(`${this.baseURL}/parcels`, newParcel, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (parcelCreateResponse.data.success) {
        const newParcelId = parcelCreateResponse.data.data.id;
        console.log('✅ New parcel created:', newParcelId);
        
        // Now try creating shipment with new parcel ID
        const testShipment2 = {
          shipment: {
            address_from: 'AD-MKVUG4QBHC950QDF',
            address_to: 'AD-U0VWZ4GEOTMB11K8',
            parcels: [newParcelId],
            rates: ['RT-S3CRYC7NRBZ5UP8K'],
            metadata: {},
            async: false
          }
        };
        
        const shipmentResponse = await axios.post(`${this.baseURL}/shipments`, testShipment2, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        console.log('✅ Shipment created with new parcel:', shipmentResponse.data);
        return shipmentResponse.data;
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    
    if (error.response) {
      console.error('Full error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
    }
    
    throw error;
  }
}
}



module.exports = new TerminalAfricaService();