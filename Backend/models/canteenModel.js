const mongoose = require('mongoose');

const canteenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A canteen must have a name']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A canteen must belong to an owner']
  },
  isOpen: {
    type: Boolean,
    default: false // Matches your React initial state logic
  },
  defaultLimit: {
    type: Number,
    default: 3000
  }
}, { timestamps: true });

module.exports = mongoose.model('Canteen', canteenSchema);