const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNo: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false // Hides the password from API responses by default
  },
  role: {
    type: String,
    enum: ['student', 'owner'],
    default: 'student'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // --- Student Only Fields ---
  rollNo: {
    type: String,
    // Only required if the user is a student
    required: function() { 
      return this.role === 'student'; 
    }
  },
  hallNo: {
    type: String,
    required: function() { return this.role === 'student'; }
  },
  roomNo: {
    type: String,
    required: function() { return this.role === 'student'; }
  },
  totalDebt: {
    type: Number,
    default: 0
  },
  limit: {
    type: Number,
    default: 3000
  }
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// 🔒 SECURITY MAGIC: Encrypt password before saving to the database
userSchema.pre('save', async function() { 
  // If the password wasn't modified, skip this
  if (!this.isModified('password')) return; 
  
  // Hash the password with a strength of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// Helper method to check if a typed password matches the database hash
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// 🔑 Generate a random, temporary reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // We hash it to store in database for security
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // We return the plain, UNHASHED token to send via email
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;