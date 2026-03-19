const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  // 🔗 The Student
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 🔗 The Canteen they owe money to
  canteen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    required: true
  },
  // 💰 The running balance for this specific relationship
  amountOwed: {
    type: Number,
    default: 0,
    min: [0, 'Debt cannot be negative']
  }
}, { timestamps: true });

// This ensures a student only has ONE debt record per canteen
debtSchema.index({ student: 1, canteen: 1 }, { unique: true });

module.exports = mongoose.model('Debt', debtSchema);