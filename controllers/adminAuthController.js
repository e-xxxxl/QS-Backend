const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d' // Default to 30 days if not set
  });
};

// @desc    Admin Login
// @route   POST /api/admin/auth/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if admin exists with password
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact super admin.'
      });
    }

    // Check if account is locked
    if (admin.isLocked && admin.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Try again in 15 minutes.'
      });
    }

    // Check password
    const isPasswordMatch = await admin.comparePassword(password);
    
    if (!isPasswordMatch) {
      // Increment login attempts
      if (admin.incLoginAttempts) {
        await admin.incLoginAttempts();
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (admin.resetLoginAttempts) {
      await admin.resetLoginAttempts();
    }
    
    // Update last login
    admin.lastLogin = Date.now();
    await admin.save();

    // Create token
    const token = generateToken(admin._id);

    // Remove password from response
    admin.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get current admin
// @route   GET /api/admin/auth/me
// @access  Private/Admin
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    
    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Logout admin
// @route   POST /api/admin/auth/logout
// @access  Private/Admin
exports.adminLogout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};