// const rateLimit = require('express-rate-limit');

// // General API rate limiter
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   message: {
//     success: false,
//     error: 'Too many requests from this IP, please try again after 15 minutes'
//   },
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

// // Strict rate limiter for sensitive operations (login, registration, etc.)
// const strictLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 7, // Limit each IP to 5 requests per windowMs for sensitive operations
//   message: {
//     success: false,
//     error: 'Too many attempts, please try again after 15 minutes'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // Purchase/shipment creation specific limiter
// const purchaseLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 10, // Limit each IP to 10 purchase attempts per hour
//   message: {
//     success: false,
//     error: 'Too many purchase attempts, please try again after an hour'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// module.exports = {
//   apiLimiter,
//   strictLimiter,
//   purchaseLimiter
// };

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit'); // Add this import

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter with proper IPv6 handling
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // For login, use email combined with properly handled IP
    if (req.path === '/login' && req.body.email) {
      // Use ipKeyGenerator for the IP part to handle IPv6 subnets correctly
      const ipKey = ipKeyGenerator(req.ip);
      return `${ipKey}-${req.body.email.toLowerCase()}`;
    }
    // For other routes, just use the properly handled IP
    return ipKeyGenerator(req.ip);
  }
});

// OTP-specific limiter
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip) // Use ipKeyGenerator here too
});


// Purchase/shipment creation specific limiter
const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    error: 'Too many purchase attempts, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip) // Use ipKeyGenerator here too
});

module.exports = {
  apiLimiter,
  strictLimiter,
  otpLimiter,
  purchaseLimiter
};