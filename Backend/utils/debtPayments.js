const Order = require('../models/ordersModel');

exports.settleDebtPayment = async ({ debt, amountPaid, receiptLabel }) => {
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
    balanceSnapshot: Math.max(0, hydratedDebt.amountOwed) // already rounded properly above
  });

  return {
    canteenDebt: hydratedDebt.amountOwed,
    studentTotalDebt: student.totalDebt
  };
};

