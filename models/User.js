const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    default: 'NG'
  },
  
  fullPhoneNumber: {
    type: String,
    required: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  otp: {
    code: String,
    expiresAt: Date
  },
  
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  
  lastLogin: Date,
  
  shippingAddresses: [{
    name: {
      type: String,
      default: "Primary Address"
    },
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    address2: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: "NG"
    },
    zipCode: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    addressType: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    instructions: {
      type: String,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

userSchema.pre('save', async function () {
  // Only hash password if modified
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP method
userSchema.methods.generateOTP = function() {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  this.otp = {
    code: otpCode,
    expiresAt: expiresAt
  };
  
  return otpCode;
};

// Check if OTP is valid
userSchema.methods.isOTPValid = function(otp) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }
  
  const now = new Date();
  return this.otp.code === otp && this.otp.expiresAt > now;
};

// Clear OTP after verification
userSchema.methods.clearOTP = function() {
  this.otp = undefined;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

module.exports = User;