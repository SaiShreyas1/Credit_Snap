const mongoose = require('mongoose');
const { encryptValue, decryptValue } = require('../utils/secretCrypto');

const KEY_ID_REGEX = /^rzp_(test|live)_[A-Za-z0-9]+$/;

/**
 * @desc Mongoose schema for Canteen profiles, including settings and payment integration.
 */
const canteenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A canteen must have a name'],
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A canteen must belong to an owner']
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  timings: {
    type: String,
    trim: true,
    default: '4:00 PM - 4:00 AM'
  },
  defaultLimit: {
    type: Number,
    default: 3000,
    min: [0, 'Default limit cannot be negative']
  },
  razorpayMerchantKeyId: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => !value || KEY_ID_REGEX.test(value),
      message: 'Please provide a valid Razorpay key ID.'
    }
  },
  // Stored securely; never returned in standard queries unless explicitly requested
  razorpayMerchantKeySecretEncrypted: {
    type: String,
    select: false 
  }
}, { 
  timestamps: true 
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Encrypts and securely stores the Razorpay Merchant Secret.
 * @param {string} secret - The raw Razorpay secret key.
 */
canteenSchema.methods.setRazorpayMerchantKeySecret = function(secret) {
  const trimmedSecret = (secret || '').trim();
  this.razorpayMerchantKeySecretEncrypted = trimmedSecret ? encryptValue(trimmedSecret) : undefined;
};

/**
 * Decrypts and retrieves the Razorpay Merchant Secret.
 * @returns {string} The decrypted secret key, or an empty string if none exists.
 */
canteenSchema.methods.getRazorpayMerchantKeySecret = function() {
  return this.razorpayMerchantKeySecretEncrypted
    ? decryptValue(this.razorpayMerchantKeySecretEncrypted)
    : '';
};

/**
 * Checks if the canteen has fully configured its Razorpay integration.
 * @returns {boolean} True if both the Key ID and encrypted Secret exist.
 */
canteenSchema.methods.hasRazorpayMerchantCredentials = function() {
  return Boolean(this.razorpayMerchantKeyId && this.razorpayMerchantKeySecretEncrypted);
};

module.exports = mongoose.model('Canteen', canteenSchema);