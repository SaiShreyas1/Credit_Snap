const mongoose = require('mongoose');

/**
 * @desc Mongoose schema representing an individual food or beverage item 
 * available at a specific canteen.
 */
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Food item must have a name.'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Food item must have a price.'],
    min: [0, 'Price cannot be negative.']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  canteenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    required: [true, 'Food item must be associated with a specific canteen.']
  }
}, { 
  timestamps: true 
});

// ==========================================
// DATABASE INDEXES
// ==========================================

// Enforce unique item names within the same canteen to prevent duplicate menu entries.
// This acts as a database-level failsafe for the controller logic.
menuItemSchema.index({ canteenId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);