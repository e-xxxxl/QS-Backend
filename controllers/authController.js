const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const validator = require('validator');
const crypto = require('crypto');

// Email transporter setup for quickship.africa
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST || 'smtp.quickship.africa',
//   port: parseInt(process.env.EMAIL_PORT) || 465,
//   secure: true, // true for port 465 (SSL)
//   auth: {
//     user: process.env.EMAIL_USER || 'contact@quickship.africa',
//     pass: process.env.EMAIL_PASSWORD
//   },
//   tls: {
//     rejectUnauthorized: false
//   },
//   connectionTimeout: 10000,
//   greetingTimeout: 10000,
//   socketTimeout: 10000,
//   debug: process.env.EMAIL_DEBUG === 'true',
//   logger: process.env.EMAIL_LOGGER === 'true'
// });


 const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email from .env
        pass: process.env.EMAIL_PASS, // Your password from .env
      },
    });
// Test email connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email server connection failed:', error.message);
  } else {
    console.log('✅ Email server is ready to    send messages from:', process.env.EMAIL_USER);
  }
});

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key-change-this', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Send OTP Email
const sendOTPEmail = async (email, otpCode, firstName, retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    console.log(`📧 Attempting to send OTP to: ${email}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"QuickShipAfrica" <contact@quickship.africa>`,
      to: email,
      replyTo: process.env.EMAIL_REPLY_TO || 'contact@quickship.africa',
      subject: 'Verify Your Email - QuickShipAfrica',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - QuickShipAfrica</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; background-color: #f9fafb; }
            .otp-code { 
              display: inline-block; 
              background-color: white; 
              padding: 20px 40px; 
              border-radius: 12px; 
              border: 2px dashed #f97316; 
              font-size: 32px; 
              font-weight: bold; 
              letter-spacing: 8px; 
              color: #1f2937;
              margin: 30px 0;
              text-align: center;
            }
            .footer { background-color: #1f2937; padding: 20px; text-align: center; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 5px 0; }
            @media (max-width: 600px) {
              .content { padding: 20px 15px; }
              .otp-code { font-size: 24px; padding: 15px 25px; letter-spacing: 6px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>QuickShipAfrica</h1>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${firstName},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                Thank you for signing up with QuickShipAfrica! To complete your registration, 
                please use the following verification code:
              </p>
              
              <div style="text-align: center;">
                <div class="otp-code">${otpCode}</div>
              </div>
              
              <p style="color: #4b5563; font-size: 14px;">
                This code will expire in <strong>10 minutes</strong>. If you didn't request this verification, 
                please ignore this email.
              </p>
              
              <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
                <strong>Need help?</strong> Contact our support team at <a href="mailto:contact@quickship.africa" style="color: #f97316;">contact@quickship.africa</a>
              </p>
              
              <p style="color: #4b5563; font-size: 14px; margin-top: 30px;">
                Best regards,<br>
                <strong>The QuickShipAfrica Team</strong>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName},

Thank you for signing up with QuickShipAfrica!

To verify your email address and complete your registration, use the following 6-digit code:

${otpCode}

Enter this code on the verification page to activate your account.

This code will expire in 10 minutes.

If you didn't request this verification, please ignore this email.

Need help? Contact our support team at contact@quickship.africa

Best regards,
The QuickShipAfrica Team

© ${new Date().getFullYear()} QuickShipAfrica. All rights reserved.
This email was sent to ${email}`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    
    return info;
    
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    
    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendOTPEmail(email, otpCode, firstName, retryCount + 1);
    }
    
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, countryCode, phoneNumber, email, password } = req.body;

    console.log('📝 User signup attempt:', { email, firstName, lastName });

    // Validate input
    if (!firstName || !lastName || !countryCode || !phoneNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create full phone number
    const fullPhoneNumber = `+${getCountryPhoneCode(countryCode)}${phoneNumber}`;

    // Create new user
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      countryCode,
      phoneNumber: phoneNumber.trim(),
      fullPhoneNumber,
      email: email.toLowerCase().trim(),
      password
    });

    // Generate OTP
    const otpCode = user.generateOTP();
    console.log(`🔑 Generated OTP for ${email}: ${otpCode}`);

    // Save user to database
    await user.save();
    console.log(`✅ User saved to database: ${user._id}`);

    // Save OTP to OTP collection for tracking
    const otpRecord = new OTP({
      userId: user._id,
      email: user.email,
      otpCode,
      type: 'email_verification',
      expiresAt: user.otp.expiresAt
    });
    await otpRecord.save();

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otpCode, user.firstName);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      
      // Delete user if email fails (optional)
      await User.findByIdAndDelete(user._id);
      await OTP.deleteMany({ userId: user._id });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    // Generate token (optional - you might want to wait until email is verified)
    const token = generateToken(user._id);

    // Don't send password in response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Check your email for verification code.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          requiresVerification: true
        },
        token, // Optional: include token if you want auto-login
        redirectTo: `/verify-otp?email=${encodeURIComponent(user.email)}`
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.'
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔍 OTP verification attempt:', { email, otp });

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified',
        data: {
          user: {
            id: user._id,
            email: user.email,
            isEmailVerified: true
          }
        }
      });
    }

    // Check if OTP is valid
    if (!user.isOTPValid(otp)) {
      // Update OTP attempts
      const otpRecord = await OTP.findOne({ 
        userId: user._id, 
        otpCode: otp,
        isUsed: false
      });

      if (otpRecord) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        if (otpRecord.attempts >= 5) {
          otpRecord.isUsed = true;
          await otpRecord.save();
          user.clearOTP();
          await user.save();

          return res.status(400).json({
            success: false,
            message: 'Too many failed attempts. Please request a new OTP'
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as used
    const otpRecord = await OTP.findOne({ 
      userId: user._id, 
      otpCode: otp,
      isUsed: false
    });

    if (otpRecord) {
      otpRecord.isUsed = true;
      await otpRecord.save();
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.clearOTP();
    await user.save();

    console.log(`✅ Email verified for: ${email}`);

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified
        },
        token,
        redirectTo: '/dashboard'
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔄 Resend OTP request for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if user has reached max OTP resend attempts (optional)
    const recentOTPs = await OTP.countDocuments({
      userId: user._id,
      type: 'email_verification',
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    if (recentOTPs >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.'
      });
    }

    // Generate new OTP
    const otpCode = user.generateOTP();
    console.log(`🔑 New OTP generated for ${email}: ${otpCode}`);
    
    await user.save();

    // Save OTP record
    const otpRecord = new OTP({
      userId: user._id,
      email: user.email,
      otpCode,
      type: 'email_verification',
      expiresAt: user.otp.expiresAt
    });
    await otpRecord.save();

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otpCode, user.firstName);
    } catch (emailError) {
      console.error('Failed to resend OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'New verification code sent successfully!',
      data: {
        email: user.email,
        expiresIn: '10 minutes'
      }
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Generate new OTP for verification
      const otpCode = user.generateOTP();
      await user.save();

      // Save OTP record
      const otpRecord = new OTP({
        userId: user._id,
        email: user.email,
        otpCode,
        type: 'email_verification',
        expiresAt: user.otp.expiresAt
      });
      await otpRecord.save();

      // Send new OTP email
      try {
        await sendOTPEmail(user.email, otpCode, user.firstName);
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
      }

      return res.status(401).json({
        success: false,
        message: 'Please verify your email first. A new verification code has been sent.',
        requiresVerification: true,
        email: user.email,
        redirectTo: `/verify-otp?email=${encodeURIComponent(user.email)}`
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Don't send password in response
    user.password = undefined;

    console.log(`✅ Login successful for: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin
        },
        token,
        redirectTo: '/dashboard'
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Return success even if user doesn't exist (for security)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token expiry (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Send reset email
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"QuickShipAfrica" <contact@quickship.africa>`,
      to: user.email,
      subject: 'Password Reset Request - QuickShipAfrica',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">QuickShipAfrica</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937;">Hello ${user.firstName},</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              You requested to reset your password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #f97316; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #4b5563; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request a password reset, 
              please ignore this email.
            </p>
            <p style="color: #4b5563; font-size: 14px;">
              Or copy and paste this link: <br>
              <code style="background-color: #e5e7eb; padding: 5px 10px; border-radius: 4px; font-size: 12px;">
                ${resetUrl}
              </code>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log('🔑 Reset password attempt with token:', token?.substring(0, 20) + '...');

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token to match what's stored in database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

// Helper function to get country phone code
function getCountryPhoneCode(countryCode) {
  const phoneCodes = {
    'US': '1',
    'CA': '1',
    'NG': '234',
    'UK': '44',
    'GB': '44',
    'KE': '254',
    'GH': '233',
    'ZA': '27'
  };
  
  return phoneCodes[countryCode] || '234'; // Default to Nigeria
}

module.exports = exports;