const express = require('express');
const paymentController = require('../controllers/paymentController');
const userController = require('../controllers/userController');

const router = express.Router();

// ==========================================
// ROUTER MIDDLEWARE
// ==========================================

// Protect all payment routes: User must be authenticated with a valid JWT.
// Financial routes should never be publicly accessible.
router.use(userController.protect);

// ==========================================
// PAYMENT ROUTES (Razorpay Integration)
// ==========================================

/**
 * @route   POST /api/payments/debts/:debtId/create-order
 * @desc    Initialize a new Razorpay order to pay off a specific Khata debt.
 * @access  Private (Student)
 */
router.post('/debts/:debtId/create-order', paymentController.createDebtOrder);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify the Razorpay payment signature and update the debt ledger upon success.
 * @access  Private (Student)
 */
router.post('/verify', paymentController.verifyDebtPayment);

/**
 * @route   POST /api/payments/record-failure
 * @desc    Records an incomplete transaction natively as a failed Order when the Razorpay widget aborts.
 * @access  Private (Student)
 */
router.post('/record-failure', paymentController.recordPaymentFailure);

module.exports = router;