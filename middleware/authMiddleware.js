const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware called for:', req.originalUrl);
    console.log('🔐 Authorization header:', req.headers.authorization);
    
    let token;
    
    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Token found in headers');
    }
    
    // Check if token exists in cookies (alternative)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('🔐 Token found in cookies');
    }
    
    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }
    
    console.log('🔐 Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    console.log('🔐 Decoded token:', decoded);
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found for ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      console.log('❌ Email not verified for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first'
      });
    }
    
    // Check if account is active
    if (user.accountStatus !== 'active') {
      console.log('❌ Account not active:', user.accountStatus);
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }
    
    // Attach user to request object
    req.user = user;
    console.log('✅ User authenticated:', user._id, user.email);
    next();
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    next();
  };
};
// @desc    Check if user is admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
};

module.exports = exports;