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

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Reduced to 5 attempts per 15 minutes for sensitive operations
  message: {
    success: false,
    error: 'Too many attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins towards the limit
  keyGenerator: (req) => {
    // For login, use email in the key to prevent brute force on specific accounts
    if (req.path === '/login' && req.body.email) {
      return `${req.ip}-${req.body.email.toLowerCase()}`;
    }
    return req.ip;
  }
});

// OTP-specific limiter (more lenient since users might need multiple attempts)
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 OTP requests per hour
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login-specific limiter with shorter window but stricter limits
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 login attempts per hour
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Purchase/shipment creation specific limiter
const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Too many purchase attempts, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  strictLimiter,
  otpLimiter,
  loginLimiter,
  purchaseLimiter
};