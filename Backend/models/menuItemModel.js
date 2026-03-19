const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Food item must have a name']
  },
  price: {
    type: Number,
    required: [true, 'Food item must have a price']
  },
  isAvailable: {
    type: Boolean,
    default: true // Matches your frontend toggle switch!
  },
  canteenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    required: [true, 'Food must belong to a specific canteen']
  }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);