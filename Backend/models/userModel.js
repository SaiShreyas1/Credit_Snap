const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  // --- Student Only Fields ---
  rollNo: {
    type: String,
    // Only required if the user is a student
    required: function() { 
      return this.role === 'student'; 
    }
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

const User = mongoose.model('User', userSchema);
module.exports = User;