const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a student']
  },
  canteen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    required: [true, 'Order must belong to a canteen']
  },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'archived'],
    default: 'pending'
  },
  failureReason: {
    type: String,
    default: ''
  },
  balanceSnapshot: {
    type: Number,
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  isCleared: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);