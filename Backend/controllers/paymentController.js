const crypto = require('crypto');
const Razorpay = require('razorpay');

const Canteen = require('../models/canteenModel');
const Debt = require('../models/debtModel');
const Payment = require('../models/paymentModel');
const { settleDebtPayment } = require('../utils/debtPayments');

const buildSignature = (secret, orderId, paymentId) => (
  crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
);

const getGatewayErrorMessage = (error, fallbackMessage) => (
  error?.error?.description ||
  error?.description ||
  error?.message ||
  error?.response?.body?.error?.description ||
  error?.response?.body?.description ||
  fallbackMessage
);

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

const getRazorpayClient = ({ keyId, keySecret }) => new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

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

    if (debt.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'You can only pay your own debts.' });
    }

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

    const amount = Number(requestedAmount.toFixed(2));
    // Razorpay receipts must be unique and at most 40 characters.
    const receipt = `debt_${Date.now()}_${debt._id.toString().slice(-8)}`;
    const merchantCredentials = getMerchantCredentials(debt.canteen);
    const razorpay = getRazorpayClient(merchantCredentials);
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
    console.error('Razorpay createDebtOrder error:', error);
    res.status(400).json({ status: 'fail', message });
  }
};

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

    claimedPayment.status = 'paid';
    claimedPayment.settledAt = new Date();
    claimedPayment.failureReason = '';
    await claimedPayment.save();

    const io = req.app.get('io');
    if (io) {
      if (debt.student?._id) {
        io.to(`student:${debt.student._id}`).emit('debt-updated');
        
        // 🌟 NEW: Emit successful payment notification to the student
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

    console.error('Razorpay verifyDebtPayment error:', error);
    res.status(400).json({ status: 'fail', message });
  }
};