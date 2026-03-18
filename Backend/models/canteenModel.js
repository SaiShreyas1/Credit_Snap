const mongoose = require('mongoose');

// 1. The Menu Item Blueprint (A sub-blueprint)
// This defines what a single Maggi or Samosa looks like in the database.
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A menu item must have a name']
  },
  price: {
    type: Number,
    required: [true, 'A menu item must have a price']
  },
  isAvailable: {
    type: Boolean,
    default: true // By default, the item is in stock
  }
});

// 2. The Main Canteen Blueprint
const canteenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the canteen'],
    unique: true // No two canteens can have the exact same name
  },
  owner: {
    // 🔗 THE MAGIC LINK: This connects the canteen to a specific user in your database
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A canteen must have an owner linked to it']
  },
  // We put the menu items inside an array [ ] so a canteen can hold multiple items!
  menu: [menuItemSchema], 
  isOpen: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Canteen = mongoose.model('Canteen', canteenSchema);
module.exports = Canteen;