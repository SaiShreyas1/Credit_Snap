const Order = require('../models/ordersModel');
const User = require('../models/userModel');
const Debt = require('../models/debtModel');
const Canteen = require('../models/canteenModel');
const MenuItem = require('../models/menuItemModel');

// ==========================================
// STUDENT ACTIONS
// ==========================================

/**
 * @desc    Place a new food order (Debt Request)
 * @route   POST /api/orders
 * @access  Private (Student)
 */
exports.createOrder = async (req, res) => {
  try {
    const { canteenId, items, totalAmount } = req.body;

    // Explicitly cast to Number to prevent Javascript string concatenation bugs
    const numTotalAmount = Number(totalAmount);

    if (isNaN(numTotalAmount) || numTotalAmount <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Order total amount must be a valid number greater than zero.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Order must contain at least one item.' });
    }

    for (const item of items) {
      if (item.quantity > 100) {
        return res.status(400).json({ status: 'fail', message: `Cannot order more than 100 of ${item.name}.` });
      }
    }

    // SECURITY: Validate every item actually belongs to this canteen and is available.
    // Also recompute totalAmount server-side to prevent price tampering.
    const canteenMenuItems = await MenuItem.find({ canteenId: canteenId, isAvailable: true });
    const menuMap = new Map(canteenMenuItems.map(m => [m.name.toLowerCase().trim(), m]));

    let recomputedTotal = 0;
    for (const item of items) {
      const menuEntry = menuMap.get(item.name.toLowerCase().trim());
      if (!menuEntry) {
        return res.status(400).json({
          status: 'fail',
          message: `Item '${item.name}' is not available in this canteen.`
        });
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ status: 'fail', message: `Invalid quantity for item '${item.name}'.` });
      }
      // Use DB price, not the client-supplied price
      recomputedTotal += menuEntry.price * qty;
    }

    // 1. SAFETY CHECK: Enforce Per-Canteen Credit Limits before creating the order
    const student = await User.findById(req.user.id);
    const targetCanteen = await Canteen.findById(canteenId);

    if (!targetCanteen || !targetCanteen.isOpen) {
      return res.status(400).json({ status: 'fail', message: 'This canteen is currently closed and not accepting orders.' });
    }

    const existingDebt = await Debt.findOne({ student: req.user.id, canteen: canteenId });
    const currentCanteenDebt = existingDebt ? existingDebt.amountOwed : 0;
    const canteenLimit = existingDebt ? existingDebt.limit : (targetCanteen?.defaultLimit || 3000);

    if (currentCanteenDebt + recomputedTotal > canteenLimit) {
      return res.status(400).json({
        status: 'fail',
        message: `Request failed! You will exceed your ₹${canteenLimit} debt limit at this canteen (Current debt: ₹${currentCanteenDebt}).`
      });
    }

    // 2. Create the Order using the server-recomputed total (not the client's value)
    // Build items array with DB-authoritative prices
    const sanitizedItems = items.map(item => {
      const menuEntry = menuMap.get(item.name.toLowerCase().trim());
      return { name: menuEntry.name, quantity: Number(item.quantity), price: menuEntry.price };
    });

    let newOrder = await Order.create({
      student: req.user.id,
      canteen: canteenId,
      items: sanitizedItems,
      totalAmount: recomputedTotal
    });

    // Populate student data so the frontend can display the student name immediately
    newOrder = await newOrder.populate('student', 'name rollNo phoneNo hallNo roomNo');

    // 3. 📡 Broadcast to the specific canteen's live dashboard
    const io = req.app.get('io');
    if (io && canteenId) {
      io.to(`canteen:${canteenId}`).emit('newOrder', newOrder);
    }

    res.status(201).json({ status: 'success', data: newOrder });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    View personal order history (Simple List)
 * @route   GET /api/orders/student
 * @access  Private (Student)
 */
exports.getStudentOrders = async (req, res) => {
  try {
    const orders = await Order.find({ student: req.user.id })
      .populate('canteen', 'name')
      .sort('-createdAt');

    res.status(200).json({ status: 'success', data: orders });
  } catch (error) {
    res.status(404).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    View complete history (Formatted unified array of Food Orders & Payments)
 * @route   GET /api/orders/history
 * @access  Private (Student)
 */
exports.getStudentHistory = async (req, res) => {
  try {
    const allRecords = await Order.find({ student: req.user._id })
      .populate('canteen', 'name')
      .sort({ createdAt: -1 });

    const orderHistory = [];
    const paymentHistory = [];
    const combinedHistory = [];

    allRecords.forEach(record => {
      // Flag to separate actual food orders from Khata payment receipts
      const isPayment =
        record.items &&
        record.items.length > 0 &&
        (record.items[0].name === 'Offline Debt Payment' || record.items[0].name === 'Online Debt Payment');

      // Date Formatting
      const dateObj = record.createdAt ? new Date(record.createdAt) : new Date();
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();

      const safeStatus = record.status
        ? record.status.charAt(0).toUpperCase() + record.status.slice(1)
        : 'Pending';

      const formattedRecord = {
        id: record._id,
        canteen: record.canteen ? record.canteen.name : 'Unknown Canteen',
        status: safeStatus,
        amount: record.totalAmount || 0,
        date: `${day}-${month}-${year}`,
        time: dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: isPayment ? 'payment' : 'order'
      };

      if (isPayment) {
        const paymentRecord = { ...formattedRecord, items: 'Debt Clearance' };
        paymentHistory.push(paymentRecord);
        combinedHistory.push(paymentRecord);
      } else {
        const orderRecord = {
          ...formattedRecord,
          items: Array.isArray(record.items) && record.items.length > 0
            ? record.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
            : 'Unknown Items'
        };
        orderHistory.push(orderRecord);
        combinedHistory.push(orderRecord);
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        orders: orderHistory,
        payments: paymentHistory,
        allHistory: combinedHistory
      }
    });
  } catch (error) {
    console.error("[Order Controller] ❌ ERROR IN GET STUDENT HISTORY:", error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * @desc    Cancel a pending order
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (Student)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    const studentId = req.user._id ? req.user._id.toString() : req.user.id;
    if (order.student.toString() !== studentId) {
      return res.status(403).json({ status: 'fail', message: 'You cannot cancel someone else\'s order.' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ status: 'fail', message: 'You can only cancel orders that are still pending.' });
    }

    order.status = 'cancelled';
    await order.save();

    // 📡 Notify the Owner dashboard to update this specific order to 'cancelled'
    const io = req.app.get('io');
    if (io && order.canteen) {
      io.to(`canteen:${order.canteen}`).emit('orderStatusUpdated', order);
    }

    res.status(200).json({ status: 'success', message: 'Order successfully cancelled.', data: order });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * @desc    Auto-cancel any pending order the student has at a given canteen.
 *          Called when a student clicks "Add more items" on the checkout page
 *          so they can modify their cart without the race condition of an owner
 *          accepting the old order while the new one is being submitted.
 * @route   PATCH /api/orders/cancel-pending-at-canteen
 * @access  Private (Student)
 */
exports.cancelPendingAtCanteen = async (req, res) => {
  try {
    const { canteenId } = req.body;
    const studentId = req.user._id || req.user.id;

    if (!canteenId) {
      return res.status(400).json({ status: 'fail', message: 'canteenId is required.' });
    }

    const pendingOrder = await Order.findOne({
      student: studentId,
      canteen: canteenId,
      status: 'pending'
    });

    // Idempotent: if no pending order exists, just return success (nothing to cancel)
    if (!pendingOrder) {
      return res.status(200).json({ status: 'success', message: 'No pending order to cancel.' });
    }

    pendingOrder.status = 'cancelled';
    await pendingOrder.save();

    // 📡 Instantly remove the card from the owner's live dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`canteen:${canteenId}`).emit('orderStatusUpdated', pendingOrder);
    }

    res.status(200).json({ status: 'success', message: 'Pending order cancelled. You may now place a new order.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};



// ==========================================
// OWNER ACTIONS
// ==========================================

/**
 * @desc    View all incoming orders for the logged-in owner's canteen
 * @route   GET /api/orders/owner
 * @access  Private (Owner)
 */
exports.getOwnerOrders = async (req, res) => {
  try {
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });

    if (!myCanteen) {
      return res.status(200).json({ status: 'success', results: 0, data: [] });
    }

    const orders = await Order.find({ canteen: myCanteen._id })
      .populate('student', 'name rollNo phoneNo hallNo roomNo')
      .sort('-createdAt');

    res.status(200).json({ status: 'success', results: orders.length, data: orders });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Accept/Reject an order and update the student's debt total
 * @route   PATCH /api/orders/status
 * @access  Private (Owner)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    let order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // RACE CONDITION GUARD: Prevent accepting/rejecting an order that was already
    // cancelled by the student (e.g., they clicked "Add more items" to edit their cart).
    if (order.status === 'cancelled') {
      return res.status(400).json({
        status: 'fail',
        message: 'This order was already cancelled by the student and cannot be accepted or rejected.'
      });
    }

    const studentId = order.student._id || order.student;
    const canteenId = order.canteen._id || order.canteen;

    // THE KHATA MATH: Only increase debt if the order is being accepted for the first time
    if (status === 'accepted' && order.status === 'pending') {
      const student = await User.findById(studentId);

      const existingDebt = await Debt.findOne({ student: studentId, canteen: canteenId });
      const currentCanteenDebt = existingDebt ? existingDebt.amountOwed : 0;

      const canteenObj = await Canteen.findById(canteenId);
      const canteenLimit = existingDebt ? existingDebt.limit : (canteenObj?.defaultLimit || 3000);

      if (currentCanteenDebt + order.totalAmount > canteenLimit) {
        return res.status(400).json({
          status: 'fail',
          message: `Per-canteen debt limit of ₹${canteenLimit} exceeded! Current debt is ₹${currentCanteenDebt}.`
        });
      }

      // 1. Update overall student total
      student.totalDebt += order.totalAmount;
      await student.save();

      // 2. Create or update the specific Canteen Debt Ticket
      await Debt.findOneAndUpdate(
        { student: studentId, canteen: canteenId },
        {
          $inc: { amountOwed: order.totalAmount },
          $setOnInsert: { limit: canteenObj?.defaultLimit || 3000 }
        },
        { upsert: true, new: true }
      );

      // 3. Freeze the remaining debt snapshot natively into the order itself
      order.balanceSnapshot = currentCanteenDebt + order.totalAmount;
    }

    order.status = status;
    await order.save();
    order = await order.populate('canteen', 'name');

    // 📡 EMIT TO SOCKET.IO ROOMS
    const io = req.app.get('io');
    if (io && studentId) {
      // Notify student their order was updated
      io.to(`student:${studentId}`).emit('orderStatusUpdated', order);

      // If a debt was actively created, trigger table refreshes and threshold warnings
      if (status === 'accepted') {
        io.to(`student:${studentId}`).emit('debt-updated');
        io.to(`canteen:${canteenId}`).emit('debt-updated');

        try {
          const updatedDebt = await Debt.findOne({ student: studentId, canteen: canteenId }).populate('student', 'name');

          if (updatedDebt && updatedDebt.limit > 0) {
            const pct = (updatedDebt.amountOwed / updatedDebt.limit) * 100;
            if (pct >= 80) {
              io.to(`canteen:${canteenId}`).emit('debt-threshold', {
                studentName: updatedDebt.student?.name || 'A student',
                pct,
                amountOwed: updatedDebt.amountOwed,
                limit: updatedDebt.limit
              });
            }
          }
        } catch (thresholdErr) {
          console.error('[Order Controller] ⚠️ Failed to emit debt-threshold:', thresholdErr.message);
        }
      }
    }

    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Clear selected processed orders from the active dashboard UI
 * @route   PATCH /api/orders/clear
 * @access  Private (Owner)
 */
exports.clearOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Please provide an array of order IDs to clear.' });
    }

    const ownerId = req.user._id || req.user.id;
    const myCanteen = await Canteen.findOne({ ownerId });
    if (!myCanteen) {
      return res.status(403).json({ status: 'fail', message: 'You are not authorized to clear these orders.' });
    }

    const clearResult = await Order.updateMany(
      {
        _id: { $in: orderIds },
        canteen: { $in: [myCanteen._id, ownerId] },
        status: { $ne: 'pending' }
      },
      { isCleared: true }
    );

    if (!clearResult.matchedCount) {
      return res.status(404).json({
        status: 'fail',
        message: 'No processed orders were found to clear for this canteen.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Successfully cleared orders from dashboard.',
      data: {
        matchedCount: clearResult.matchedCount,
        modifiedCount: clearResult.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};