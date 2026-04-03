const mongoose = require('mongoose');

/**
 * @desc Mongoose schema representing a financial transaction (payment)
 * made by a student to a canteen to clear their Khata debt via Razorpay.
 */
const paymentSchema = new mongoose.Schema({
  
  // ==========================================
  // 1. TRANSACTION RELATIONSHIPS
  // ==========================================
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A payment must be linked to a student.']
  },
  canteen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    required: [true, 'A payment must be linked to a canteen.']
  },
  debt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debt',
    required: [true, 'A payment must be applied to a specific debt record.']
  },

  // ==========================================
  // 2. FINANCIAL DETAILS
  // ==========================================
  purpose: {
    type: String,
    enum: {
      values: ['debt'],
      message: '{VALUE} is not a valid payment purpose.'
    },
    required: [true, 'Payment purpose is required.']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required.'],
    min: [1, 'Payment amount must be at least 1 rupee.']
  },
  currency: {
    type: String,
    default: 'INR'
  },

  // ==========================================
  // 3. PAYMENT PROVIDER DETAILS (Razorpay)
  // ==========================================
  provider: {
    type: String,
    enum: ['razorpay', 'offline'],
    default: 'razorpay'
  },
  receipt: {
    type: String,
    required: [true, 'A unique receipt ID is required.'],
    unique: true
  },
  providerOrderId: {
    type: String,
    required: [function() { return this.provider === 'razorpay'; }, 'Provider Order ID is required for online payments.'],
    sparse: true,
    unique: true
  },
  providerPaymentId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple 'null' or missing values for incomplete payments
  },
  providerKeyId: {
    type: String
  },
  providerSignature: {
    type: String
  },

  // ==========================================
  // 4. TRANSACTION STATUS
  // ==========================================
  status: {
    type: String,
    enum: {
      values: ['created', 'processing', 'paid', 'failed'],
      message: '{VALUE} is not a valid payment status.'
    },
    default: 'created'
  },
  settledAt: {
    type: Date
  },
  failureReason: {
    type: String
  }
}, { 
  timestamps: true 
});

// ==========================================
// DATABASE INDEXES (For Query Performance)
// ==========================================

// Optimizes queries for a student viewing their past payment history
paymentSchema.index({ student: 1, createdAt: -1 });

// Optimizes queries for a canteen owner viewing their income ledger
paymentSchema.index({ canteen: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);