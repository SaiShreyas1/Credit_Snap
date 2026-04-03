const crypto = require('crypto');
const Razorpay = require('razorpay');

const Canteen = require('../models/canteenModel');
const Debt = require('../models/debtModel');
const Payment = require('../models/paymentModel');
const Order = require('../models/ordersModel');
const { settleDebtPayment } = require('../utils/debtPayments');

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generates an HMAC SHA256 signature to verify Razorpay webhooks/callbacks.
 */
const buildSignature = (secret, orderId, paymentId) => (
  crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
);

/**
 * Extracts a readable error message from Razorpay's nested error objects.
 */
const getGatewayErrorMessage = (error, fallbackMessage) => (
  error?.error?.description ||
  error?.description ||
  error?.message ||
  error?.response?.body?.error?.description ||
  error?.response?.body?.description ||
  fallbackMessage
);

/**
 * Retrieves and validates the specific Canteen's Razorpay API keys.
 */
const getMerchantCredentials = (canteen) => {
  const keyId = canteen?.razorpayMerchantKeyId?.trim();
  const keySecret = canteen?.getRazorpayMerchantKeySecret?.();

  if (!keyId || !keySecret) {
    throw new Error(
      `${canteen?.name || 'This canteen'} has not configured its Razorpay merchant account yet. Ask the canteen owner to add their Razorpay API keys in Canteen Settings.`
    );
  }

  return { keyId, keySecret };
};

/**
 * Initializes a new Razorpay client scoped to a specific canteen's credentials.
 */
const getRazorpayClient = ({ keyId, keySecret }) => new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

// ==========================================
// CORE PAYMENT CONTROLLERS
// ==========================================

/**
 * @desc    Step 1: Creates a new Razorpay Order for a student's debt payment.
 * @route   POST /api/payments/create/:debtId
 * @access  Private (Student Only)
 */
exports.createDebtOrder = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ status: 'fail', message: 'Only students can pay debts online.' });
    }

    const debt = await Debt.findById(req.params.debtId)
      .populate('student', 'name email phoneNo')
      .populate({
        path: 'canteen',
        select: 'name razorpayMerchantKeyId +razorpayMerchantKeySecretEncrypted'
      });

    if (!debt) {
      return res.status(404).json({ status: 'fail', message: 'Debt record not found!' });
    }

    // Security Check: Prevent users from paying someone else's debt
    if (debt.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'You can only pay your own debts.' });
    }

    // Validate the requested payment amount
    const requestedAmount = Number(req.body.amount || debt.amountOwed);
    if (!requestedAmount || Number.isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Please enter a valid amount to pay.' });
    }

    if (requestedAmount > debt.amountOwed) {
      return res.status(400).json({
        status: 'fail',
        message: `Amount exceeds current debt! The maximum payment is ₹${debt.amountOwed}.`
      });
    }

    // Setup Razorpay Order Payload
    const amount = Number(requestedAmount.toFixed(2));
    const receipt = `debt_${Date.now()}_${debt._id.toString().slice(-8)}`;
    const merchantCredentials = getMerchantCredentials(debt.canteen);
    const razorpay = getRazorpayClient(merchantCredentials);
    
    // Razorpay requires amounts in smaller currency units (Paise for INR)
    const amountInPaise = Math.round(amount * 100);
    
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        debtId: debt._id.toString(),
        studentId: req.user._id.toString(),
        canteenId: debt.canteen._id.toString(),
        purpose: 'debt_payment'
      }
    });

    // Create a 'Created' status record in our local database
    const paymentRecord = await Payment.create({
      purpose: 'debt',
      student: req.user._id,
      canteen: debt.canteen._id,
      debt: debt._id,
      amount,
      currency: 'INR',
      receipt,
      providerOrderId: razorpayOrder.id,
      providerKeyId: merchantCredentials.keyId
    });

    res.status(201).json({
      status: 'success',
      data: {
        paymentRecordId: paymentRecord._id,
        keyId: merchantCredentials.keyId,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        merchantName: debt.canteen.name,
        description: `Debt payment for ${debt.canteen.name}`,
        prefill: {
          name: req.user.name,
          email: req.user.email,
          contact: req.user.phoneNo
        }
      }
    });
  } catch (error) {
    const message = getGatewayErrorMessage(error, 'Unable to create the Razorpay order right now.');
    console.error('[Payment Controller] ❌ Razorpay createDebtOrder error:', error);
    res.status(400).json({ status: 'fail', message });
  }
};

/**
 * @desc    Step 2: Verifies the Razorpay callback signature and settles the debt.
 * @route   POST /api/payments/verify
 * @access  Private (Student Only)
 */
exports.verifyDebtPayment = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ status: 'fail', message: 'Only students can verify debt payments.' });
    }

    const {
      paymentRecordId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!paymentRecordId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ status: 'fail', message: 'Missing Razorpay verification details.' });
    }

    const payment = await Payment.findById(paymentRecordId);
    if (!payment) {
      return res.status(404).json({ status: 'fail', message: 'Payment record not found!' });
    }

    if (payment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'You can only verify your own payments.' });
    }

    // Idempotency Check: Prevent duplicate processing if the user refreshes
    if (payment.status === 'paid') {
      return res.status(200).json({
        status: 'success',
        message: 'Payment already verified.',
        data: { alreadyProcessed: true }
      });
    }

    if (payment.providerOrderId !== razorpay_order_id) {
      return res.status(400).json({ status: 'fail', message: 'Razorpay order mismatch detected.' });
    }

    // Lock the record into 'processing' state to prevent race conditions
    const claimedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'created' },
      {
        $set: {
          status: 'processing',
          providerPaymentId: razorpay_payment_id,
          providerSignature: razorpay_signature,
          failureReason: ''
        }
      },
      { new: true }
    );

    if (!claimedPayment) {
      const latestPayment = await Payment.findById(payment._id);
      if (latestPayment && latestPayment.status === 'paid') {
        return res.status(200).json({
          status: 'success',
          message: 'Payment already verified.',
          data: { alreadyProcessed: true }
        });
      }
      return res.status(409).json({
        status: 'fail',
        message: 'This payment is already being processed. Please refresh and check your debt balance.'
      });
    }

    const canteen = await Canteen
      .findById(claimedPayment.canteen)
      .select('name razorpayMerchantKeyId +razorpayMerchantKeySecretEncrypted');

    if (!canteen) {
      claimedPayment.status = 'failed';
      claimedPayment.failureReason = 'Canteen record was missing during verification.';
      await claimedPayment.save();
      return res.status(404).json({ status: 'fail', message: 'Canteen record not found!' });
    }

    // Signature Verification Math
    const merchantCredentials = getMerchantCredentials(canteen);
    const expectedSignature = buildSignature(
      merchantCredentials.keySecret,
      razorpay_order_id,
      razorpay_payment_id
    );

    if (expectedSignature !== razorpay_signature) {
      claimedPayment.status = 'failed';
      claimedPayment.failureReason = 'Invalid Razorpay signature.';
      await claimedPayment.save();
      return res.status(400).json({ status: 'fail', message: 'Invalid Razorpay signature.' });
    }

    const razorpay = getRazorpayClient(merchantCredentials);
    let gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    // Auto-capture the payment if Razorpay left it in the 'authorized' state
    if (gatewayPayment.status === 'authorized') {
      gatewayPayment = await razorpay.payments.capture(
        razorpay_payment_id,
        gatewayPayment.amount,
        gatewayPayment.currency
      );
    }

    if (gatewayPayment.status !== 'captured') {
      throw new Error(`Razorpay payment is in "${gatewayPayment.status}" state and cannot settle this debt yet.`);
    }

    // THE SETTLEMENT: Actually reduce the math on the student's debt!
    const debt = await Debt.findById(claimedPayment.debt).populate('student');
    if (!debt) {
      claimedPayment.status = 'failed';
      claimedPayment.failureReason = 'Debt record was missing during verification.';
      await claimedPayment.save();
      return res.status(404).json({ status: 'fail', message: 'Debt record not found!' });
    }

    const settlement = await settleDebtPayment({
      debt,
      amountPaid: claimedPayment.amount,
      receiptLabel: 'Online Debt Payment'
    });

    // Mark the record as fully successful
    claimedPayment.status = 'paid';
    claimedPayment.settledAt = new Date();
    claimedPayment.failureReason = '';
    await claimedPayment.save();

    // 📡 Emit live updates to both the Student and Owner dashboards
    const io = req.app.get('io');
    if (io) {
      if (debt.student?._id) {
        io.to(`student:${debt.student._id}`).emit('debt-updated');
        io.to(`student:${debt.student._id}`).emit('payment-successful', {
          amount: claimedPayment.amount,
          canteenName: canteen.name
        });
      }
      if (debt.canteen) {
        io.to(`canteen:${debt.canteen}`).emit('debt-updated');
        io.to(`canteen:${debt.canteen}`).emit('payment-received', {
          studentName: debt.student?.name || 'A student',
          amount: claimedPayment.amount,
          canteenName: canteen.name
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully paid ₹${claimedPayment.amount}.`,
      data: settlement
    });
  } catch (error) {
    const message = getGatewayErrorMessage(error, 'Unable to verify the Razorpay payment right now.');

    // If an error occurs, try to safely mark the local payment record as failed
    if (req.body && req.body.paymentRecordId) {
      await Payment.findOneAndUpdate({
        _id: req.body.paymentRecordId,
        status: { $ne: 'paid' }
      }, {
        $set: {
          status: 'failed',
          failureReason: message
        }
      }).catch(() => null);
    }

    console.error('[Payment Controller] ❌ Razorpay verifyDebtPayment error:', error);
    res.status(400).json({ status: 'fail', message });
  }
};

/**
 * @desc    Records an incomplete transaction natively as a failed Order when the Razorpay widget aborts.
 * @route   POST /api/payments/record-failure
 * @access  Private (Student)
 */
exports.recordPaymentFailure = async (req, res) => {
  try {
    const { paymentRecordId, reason, error_description } = req.body;
    
    if (paymentRecordId) {
      const payment = await Payment.findOneAndUpdate(
        { _id: paymentRecordId, status: { $ne: 'paid' } },
        { 
          $set: { 
            status: 'failed',
            failureReason: reason || error_description || 'Payment cancelled or failed at gateway.' 
          } 
        },
        { new: true }
      ).catch(() => null);

      // Create a matching 'rejected' Order document so history UIs catch it natively
      if (payment && payment.providerOrderId) {
        const orderExists = await Order.findOne({ transactionId: payment.providerOrderId });
        if (!orderExists) {
          await Order.create({
            student: payment.student,
            canteen: payment.canteen,
            items: [{ name: 'Online Debt Payment', quantity: 1, price: payment.amount }],
            totalAmount: payment.amount,
            status: 'rejected',
            failureReason: payment.failureReason,
            transactionId: payment.providerOrderId
          });
          
          const io = req.app.get('io');
          if (io) {
            io.to(`student:${payment.student}`).emit('orderStatusUpdated');
            io.to(`canteen:${payment.canteen}`).emit('orderStatusUpdated');
          }
        }
      }
    }
    
    res.status(200).json({ status: 'success', message: 'Failure recorded successfully.' });
  } catch (error) {
    console.error('[Payment Controller] ❌ recordPaymentFailure error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record payment failure.' });
  }
};
