const Order = require('../models/ordersModel');
const Payment = require('../models/paymentModel');
const crypto = require('crypto');

exports.settleDebtPayment = async ({ debt, amountPaid, receiptLabel, transactionId = null }) => {
  const numericAmount = Number(amountPaid);

  if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Please enter a valid numeric amount greater than zero.');
  }

  let hydratedDebt = debt;
  if (!hydratedDebt) {
    throw new Error('Debt record not found!');
  }

  if (!hydratedDebt.student || !hydratedDebt.student._id) {
    hydratedDebt = await hydratedDebt.populate('student');
  }

  const student = hydratedDebt.student;
  if (!student) {
    throw new Error('Student record not found for this debt.');
  }

  if (numericAmount > hydratedDebt.amountOwed) {
    throw new Error(`Amount exceeds current debt! The maximum deduction is ₹${hydratedDebt.amountOwed}.`);
  }

  hydratedDebt.amountOwed = Math.round((hydratedDebt.amountOwed - numericAmount) * 100) / 100;
  await hydratedDebt.save();

  student.totalDebt = Math.round(Math.max(0, student.totalDebt - numericAmount) * 100) / 100;
  await student.save();

  await Order.create({
    student: student._id,
    canteen: hydratedDebt.canteen,
    items: [{
      name: receiptLabel,
      quantity: 1,
      price: numericAmount
    }],
    totalAmount: numericAmount,
    status: 'accepted',
    balanceSnapshot: Math.max(0, hydratedDebt.amountOwed), // already rounded properly above
    transactionId: transactionId
  });

  // Also store offline payments in the database
  if (receiptLabel === 'Offline Debt Payment') {
    await Payment.create({
      student: student._id,
      canteen: hydratedDebt.canteen,
      debt: hydratedDebt._id,
      purpose: 'debt',
      amount: numericAmount,
      provider: 'offline',
      receipt: `rcpt_offline_${crypto.randomBytes(8).toString('hex')}`,
      providerOrderId: `offline_order_${crypto.randomBytes(8).toString('hex')}`,
      status: 'paid',
      settledAt: new Date()
    });
  }

  return {
    canteenDebt: hydratedDebt.amountOwed,
    studentTotalDebt: student.totalDebt
  };
};

