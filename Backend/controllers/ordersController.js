const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Debt = require('../models/debtModel');

// 🍕 STUDENT: Places order from /canteens
exports.createOrder = async (req, res) => {
  try {
    const { canteenId, items, totalAmount } = req.body;
    const newOrder = await Order.create({
      student: req.user.id,
      canteen: canteenId,
      items,
      totalAmount
    });
    res.status(201).json({ status: 'success', data: newOrder });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 📊 OWNER: Fetches orders for /dashboard
exports.getOwnerOrders = async (req, res) => {
  try {
    // req.user.managedCanteen must be set for the Owner user in DB
    const orders = await Order.find({ canteen: req.user.managedCanteen })
      .populate('student', 'name rollNo phone')
      .sort('-createdAt');
    res.status(200).json({ status: 'success', data: orders });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 👤 STUDENT: Fetches their own orders for /student/dashboard
exports.getStudentOrders = async (req, res) => {
  try {
    const orders = await Order.find({ student: req.user.id })
      .populate('canteen', 'name')
      .sort('-createdAt');
    res.status(200).json({ status: 'success', data: orders });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// ✅ OWNER: Accepts order on /dashboard (INCREASES DEBT)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Logic for Debt Increase
    if (status === 'accepted' && order.status === 'pending') {
      const student = await User.findById(order.student);

      if (student.totalDebt + order.totalAmount > student.limit) {
        return res.status(400).json({ message: 'Insufficient credit limit!' });
      }

      // Update Student Global Debt
      await User.findByIdAndUpdate(order.student, { $inc: { totalDebt: order.totalAmount } });

      // Update Canteen-specific Debt record
      await Debt.findOneAndUpdate(
        { student: order.student, canteen: order.canteen },
        { $inc: { amountOwed: order.totalAmount } },
        { upsert: true }
      );
    }

    order.status = status;
    await order.save();
    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};