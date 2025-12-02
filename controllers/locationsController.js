const axios = require("axios");

// Get countries from Terminal Africa
exports.getCountries = async (req, res) => {
  try {
    console.log("Fetching countries from Terminal Africa...");
    
    const response = await axios.get("https://sandbox.terminal.africa/v1/countries", {
      headers: {
        "Authorization": `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    });

    console.log("Countries API response received");
    
    if (response.data && response.data.status === true) {
      // Map the response to use isoCode as the country code
      const countries = Array.isArray(response.data.data) 
        ? response.data.data
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(country => ({
              isoCode: country.isoCode,
              iso2: country.isoCode, // Add iso2 alias for compatibility
              name: country.name,
              flag: country.flag,
              currency: country.currency,
              phonecode: country.phonecode
            }))
        : [];
      
      console.log(`Fetched ${countries.length} countries`);
      
      return res.status(200).json({
        success: true,
        count: countries.length,
        countries
      });
    } else {
      console.log("Countries API returned false status:", response.data?.message);
      throw new Error(response.data?.message || "Failed to fetch countries");
    }

  } catch (err) {
    console.error("Error fetching countries:", err.message);
    console.error("Error details:", err.response?.data || err.response?.status);
    
    // Fallback to static countries
    const fallbackCountries = [
      { isoCode: "NG", iso2: "NG", name: "Nigeria", flag: "🇳🇬" },
      { isoCode: "US", iso2: "US", name: "United States", flag: "🇺🇸" },
      { isoCode: "GB", iso2: "GB", name: "United Kingdom", flag: "🇬🇧" },
      { isoCode: "CA", iso2: "CA", name: "Canada", flag: "🇨🇦" },
    ];
    
    return res.status(200).json({
      success: true,
      count: fallbackCountries.length,
      countries: fallbackCountries,
      note: "Using fallback data due to API error"
    });
  }
};

// Get states for a country
// Update the getStates function to better handle different API responses
exports.getStates = async (req, res) => {
  try {
    const { country_code } = req.query;
    
    console.log("Fetching states for country_code:", country_code);
    
    
    if (!country_code) {
      return res.status(400).json({
        success: false,
        message: "country_code query parameter is required"
      });
    }

    const response = await axios.get(`https://sandbox.terminal.africa/v1/states?country_code=${country_code}`, {
      headers: {
        "Authorization": `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    });

    console.log("States API response status:", response.status);
    console.log("States API data sample:", response.data?.data?.[0]); // Log first state for debugging
    
    if (response.data && response.data.status === true) {
      // States might have different field names - check what's available
      const states = Array.isArray(response.data.data) 
        ? response.data.data
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(state => {
              // Try different possible field names for state code
              const stateCode = state.isoCode || state.stateCode || state.code || state.abbreviation || state.name;
              
              return {
                name: state.name,
                code: stateCode, // This is the state code we need for cities API
                isoCode: stateCode,
                countryCode: state.countryCode || country_code
              };
            })
        : [];
      
      console.log(`Fetched ${states.length} states for ${country_code}`);
      console.log("First state sample:", states[0]); // Debug log
      
      return res.status(200).json({
        success: true,
        count: states.length,
        states,
        countryCode: country_code
      });
    } else {
      console.log("States API returned false status:", response.data?.message);
      return res.status(200).json({
        success: true,
        count: 0,
        states: [],
        countryCode: country_code,
        note: "No states found or API error"
      });
    }

  } catch (err) {
    console.error("Error fetching states:", err.message);
    console.error("Error response:", err.response?.data);
    
    // Provide fallback states
    const fallbackStates = getFallbackStates(req.query.country_code);
    
    return res.status(200).json({
      success: true,
      count: fallbackStates.length,
      states: fallbackStates,
      countryCode: req.query.country_code,
      note: "Using fallback data due to API error"
    });
  }
};

// Get cities for a state - UPDATED to use state_code parameter
exports.getCities = async (req, res) => {
  try {
    console.log("=== GET CITIES CALLED ===");
    console.log("Full URL:", req.originalUrl);
    console.log("Full query object:", req.query);
    console.log("All query keys:", Object.keys(req.query));
    
    const { country_code, state_code } = req.query;
    
    console.log("Destructured - country_code:", country_code);
    console.log("Destructured - state_code:", state_code);
    console.log("Direct access - req.query.state_code:", req.query.state_code);
    console.log("Direct access - req.query.state:", req.query.state);
    
    if (!country_code || !state_code || state_code === "undefined") {
      console.log("Missing required parameters for cities API");
      return res.status(400).json({
        success: false,
        message: "Both country_code and state_code query parameters are required"
      });
    }

    // Try different encoding approaches
    let url = `https://sandbox.terminal.africa/v1/cities?country_code=${country_code}&state_code=${state_code}`;
    console.log("Requesting URL:", url);
    
    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${process.env.TSHIP_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    });

    console.log("Cities API response status:", response.status);
    
    if (response.data && response.data.status === true) {
      const cities = Array.isArray(response.data.data) 
        ? response.data.data
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(city => ({
              name: city.name,
              stateCode: state_code,
              countryCode: country_code
            }))
        : [];
      
      console.log(`Fetched ${cities.length} cities for state_code ${state_code}, country ${country_code}`);
      
      return res.status(200).json({
        success: true,
        count: cities.length,
        cities,
        stateCode: state_code,
        countryCode: country_code
      });
    } else {
      console.log("Cities API returned false status:", response.data?.message);
      console.log("Cities API response data:", response.data);
      
      // Try a fallback - if no cities found, return at least the state name as a city
      const fallbackCities = [
        { name: state_code, stateCode: state_code, countryCode: country_code }
      ];
      
      return res.status(200).json({
        success: true,
        count: fallbackCities.length,
        cities: fallbackCities,
        stateCode: state_code,
        countryCode: country_code,
        note: "Using fallback city data"
      });
    }

  } catch (err) {
    console.error("Error fetching cities:", err.message);
    console.error("Error response:", err.response?.data);
    
    // Provide fallback cities
    const fallbackCities = getFallbackCitiesByStateCode(req.query.state_code);
    
    return res.status(200).json({
      success: true,
      count: fallbackCities.length,
      cities: fallbackCities,
      stateCode: req.query.state_code,
      countryCode: req.query.country_code,
      note: "Using fallback data due to API error"
    });
  }
};

// Update the fallback function to use state code instead of name
function getFallbackCitiesByStateCode(stateCode) {
  const fallbackCities = {
    "LA": [
      { name: "Ikeja", stateCode: "LA" },
      { name: "Victoria Island", stateCode: "LA" },
      { name: "Lekki", stateCode: "LA" },
    ],
    "FCT": [
      { name: "Garki", stateCode: "FCT" },
      { name: "Wuse", stateCode: "FCT" },
      { name: "Maitama", stateCode: "FCT" },
    ],
    "CA": [
      { name: "Los Angeles", stateCode: "CA" },
      { name: "San Francisco", stateCode: "CA" },
    ],
    "LND": [
      { name: "Central London", stateCode: "LND" },
      { name: "Westminster", stateCode: "LND" },
    ]
  };
  
  return fallbackCities[stateCode] || [{ name: stateCode || "Main City", stateCode: stateCode }];
}
// Helper functions for fallback data
function getFallbackStates(countryCode) {
  const fallbackStates = {
    "NG": [
      { name: "Lagos", code: "LA" },
      { name: "Abuja", code: "FCT" },
      { name: "Kano", code: "KN" },
      { name: "Rivers", code: "RI" },
      { name: "Oyo", code: "OY" },
      { name: "Kaduna", code: "KD" },
      { name: "Enugu", code: "EN" },
    ],
    "US": [
      { name: "California", code: "CA" },
      { name: "Texas", code: "TX" },
      { name: "New York", code: "NY" },
      { name: "Florida", code: "FL" },
    ],
    "GB": [
      { name: "London", code: "LND" },
      { name: "Manchester", code: "MAN" },
      { name: "Birmingham", code: "BIR" },
    ],
    "CA": [
      { name: "Ontario", code: "ON" },
      { name: "Quebec", code: "QC" },
      { name: "British Columbia", code: "BC" },
    ]
  };
  
  return fallbackStates[countryCode] || [];
}

function getFallbackCities(stateName) {
  const fallbackCities = {
    "Lagos": [
      { name: "Ikeja" },
      { name: "Victoria Island" },
      { name: "Lekki" },
      { name: "Surulere" },
    ],
    "Abuja": [
      { name: "Garki" },
      { name: "Wuse" },
      { name: "Maitama" },
      { name: "Asokoro" },
    ],
    "California": [
      { name: "Los Angeles" },
      { name: "San Francisco" },
      { name: "San Diego" },
    ],
    "London": [
      { name: "Central London" },
      { name: "Westminster" },
      { name: "Camden" },
    ]
  };
  
  return fallbackCities[stateName] || [{ name: "Main City" }];
}