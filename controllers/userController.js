const User = require('../models/User');

// @desc    Add shipping address to user profile
// @route   POST /api/user/shipping-address
// @access  Private (requires authentication)
exports.addShippingAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      address,
      address2,
      city,
      state,
      country,
      zipCode,
      phone,
      isDefault
    } = req.body;

    console.log('📦 Adding shipping address for user:', userId);
    console.log('Address data:', { address, city, state, country, phone });

    // Validate required fields
    if (!address || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: 'Address, city, state, and country are required'
      });
    }

    // Validate phone number (required)
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone format (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number (at least 10 digits)'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If this address is set as default, unset other defaults
    if (isDefault) {
      user.shippingAddresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Create new address object with phone
    const newAddress = {
      name: name || 'Primary Address',
      address: address.trim(),
      address2: address2 ? address2.trim() : '',
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      zipCode: zipCode ? zipCode.trim() : '',
      phone: phoneDigits, // Store digits only
      isDefault: isDefault || false,
      addressType: 'home', // Default value
      instructions: '', // Empty by default
      createdAt: new Date()
    };

    // Add address to user's shipping addresses
    user.shippingAddresses.push(newAddress);
    
    // If this is the first address, set it as default
    if (user.shippingAddresses.length === 1) {
      user.shippingAddresses[0].isDefault = true;
    }

    // Save user
    await user.save();

    console.log('✅ Shipping address added successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Shipping address added successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          shippingAddresses: user.shippingAddresses
        },
        address: newAddress
      }
    });

  } catch (error) {
    console.error('❌ Error adding shipping address:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Handle CastError (invalid user ID)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while adding shipping address'
    });
  }
};

// Update other controller functions to include phone in responses...

// @desc    Get user's shipping addresses
// @route   GET /api/user/shipping-addresses
// @access  Private (requires authentication)
exports.getShippingAddresses = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('shippingAddresses firstName lastName email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        addresses: user.shippingAddresses,
        defaultAddress: user.shippingAddresses.find(addr => addr.isDefault) || null,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('Error getting shipping addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
// @desc    Update shipping address
// @route   PUT /api/user/shipping-address/:addressId
// @access  Private (requires authentication)
exports.updateShippingAddress = async (req, res) => {
  try {
    const userId = req.user._id; // Changed from req.user.userId
    const addressId = req.params.addressId;
    const updateData = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the address index
    const addressIndex = user.shippingAddresses.findIndex(
      addr => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      user.shippingAddresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Update the address
    user.shippingAddresses[addressIndex] = {
      ...user.shippingAddresses[addressIndex].toObject(),
      ...updateData,
      _id: user.shippingAddresses[addressIndex]._id // Preserve the ID
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address: user.shippingAddresses[addressIndex]
      }
    });

  } catch (error) {
    console.error('Error updating shipping address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete shipping address
// @route   DELETE /api/user/shipping-address/:addressId
// @access  Private (requires authentication)
exports.deleteShippingAddress = async (req, res) => {
  try {
    const userId = req.user._id; // Changed from req.user.userId
    const addressId = req.params.addressId;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the address
    const addressIndex = user.shippingAddresses.findIndex(
      addr => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const wasDefault = user.shippingAddresses[addressIndex].isDefault;

    // Remove the address
    user.shippingAddresses.splice(addressIndex, 1);

    // If we deleted the default address and there are other addresses,
    // set the first one as default
    if (wasDefault && user.shippingAddresses.length > 0) {
      user.shippingAddresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: {
        remainingAddresses: user.shippingAddresses
      }
    });

  } catch (error) {
    console.error('Error deleting shipping address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Set default shipping address
// @route   PUT /api/user/shipping-address/:addressId/set-default
// @access  Private (requires authentication)
exports.setDefaultShippingAddress = async (req, res) => {
  try {
    const userId = req.user._id; // Changed from req.user.userId
    const addressId = req.params.addressId;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the address
    const addressIndex = user.shippingAddresses.findIndex(
      addr => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset all defaults
    user.shippingAddresses.forEach(addr => {
      addr.isDefault = false;
    });

    // Set the selected address as default
    user.shippingAddresses[addressIndex].isDefault = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: {
        defaultAddress: user.shippingAddresses[addressIndex]
      }
    });

  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};