const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * @desc Mongoose schema representing all platform users (Students and Canteen Owners).
 * Handles authentication, role-based fields, and security tokens.
 */
const userSchema = new mongoose.Schema({
  
  // ==========================================
  // 1. BASE PROFILE FIELDS
  // ==========================================
  name: {
    type: String,
    required: [true, 'Please provide a name.'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.']
  },
  phoneNo: {
    type: String,
    required: [true, 'Please provide a phone number.'],
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'owner'],
      message: '{VALUE} is not a valid role.'
    },
    default: 'student'
  },
  profilePhoto: { 
    type: String, 
    default: "" 
  },

  // ==========================================
  // 2. AUTHENTICATION & SECURITY
  // ==========================================
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: [6, 'Password must be at least 6 characters long.'],
    select: false // Hides the password from API responses by default
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // ==========================================
  // 3. STUDENT-SPECIFIC FIELDS
  // ==========================================
  rollNo: {
    type: String,
    required: [
      function() { return this.role === 'student'; },
      'Roll number is required for students.'
    ]
  },
  hallNo: {
    type: String,
    required: [
      function() { return this.role === 'student'; },
      'Hall number is required for students.'
    ]
  },
  roomNo: {
    type: String,
    required: [
      function() { return this.role === 'student'; },
      'Room number is required for students.'
    ]
  },
  totalDebt: {
    type: Number,
    default: 0,
    min: [0, 'Total debt cannot be negative.']
  },
  limit: {
    type: Number,
    default: 3000,
    min: [0, 'Credit limit cannot be negative.']
  }
}, { 
  timestamps: true 
});

// ==========================================
// MIDDLEWARE & HOOKS
// ==========================================

/**
 * Encrypts the password before saving it to the database.
 * Only runs if the password field was actually modified.
 */
userSchema.pre('save', async function() { 
  if (!this.isModified('password')) return;
  
  // Hash the password with a salt round of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Compares a raw password string against the hashed password in the database.
 * @param {string} candidatePassword - The plain text password from the login request.
 * @param {string} userPassword - The hashed password from the database.
 * @returns {Promise<boolean>} True if passwords match.
 */
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 * Generates a random, temporary reset token for forgotten passwords.
 * Hashes the token for database storage, but returns the raw token to send via email.
 * @returns {string} The raw, unhashed reset token.
 */
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash it to store in the database safely
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
