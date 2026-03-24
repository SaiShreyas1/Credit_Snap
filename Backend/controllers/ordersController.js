const Order = require('../models/ordersModel');
const User = require('../models/userModel');
const Debt = require('../models/debtModel');
const Canteen = require('../models/canteenModel'); // 👈 ADDED: Need this to find the owner's canteen!

// 1. STUDENT: Place an order
// This is called when the student clicks "Place Debt Request" in React
exports.createOrder = async (req, res) => {
  try {
    const { canteenId, items, totalAmount } = req.body;
    
    // Explicitly cast to Number to prevent Javascript string concatenation bugs!
    const numTotalAmount = Number(totalAmount);

    // 0. CHECK LIMITS BEFORE CREATING ORDER
    const student = await User.findById(req.user.id);

    const existingDebt = await Debt.findOne({ student: req.user.id, canteen: canteenId });
    const currentCanteenDebt = existingDebt ? existingDebt.amountOwed : 0;
    const canteenLimit = existingDebt ? existingDebt.limit : 3000;
    
    if (currentCanteenDebt + numTotalAmount > canteenLimit) {
      return res.status(400).json({
        status: 'fail',
        message: `Request failed! You will exceed your ₹${canteenLimit} debt limit at this canteen (Current debt: ₹${currentCanteenDebt}).`
      });
    }

    let newOrder = await Order.create({
      student: req.user.id, // ID from the student's login token
      canteen: canteenId,   // ID of Hall 1 (69bc3ae4...)
      items,
      totalAmount: numTotalAmount
    });

    // Populate student data so the frontend can display the student name immediately
    newOrder = await newOrder.populate('student', 'name rollNo phoneNo hallNo roomNo');

    // 📡 EMIT TO SOCKET.IO ROOM
    const io = req.app.get('io');
    if (io && canteenId) {
      console.log(`📢 Emitting newOrder to room: canteen:${canteenId}`);
      io.to(`canteen:${canteenId}`).emit('newOrder', newOrder);
    }

    res.status(201).json({
      status: 'success',
      data: newOrder
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 2. OWNER: View incoming orders
// This is called when the Owner (Hall 1) opens their dashboard
exports.getOwnerOrders = async (req, res) => {
  try {
    // 1️⃣ Find the specific Canteen that belongs to this logged-in Owner
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });
    
    // If the owner hasn't created a canteen yet, there are no orders
    if (!myCanteen) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: []
      });
    }

    // 2️⃣ We search for orders where 'canteen' matches the Owner's Canteen ID (NOT their User ID!)
    const orders = await Order.find({ canteen: myCanteen._id })
      .populate('student', 'name rollNo phoneNo hallNo roomNo') // Fetches student details from User collection
      .sort('-createdAt'); // Newest orders at the top

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 3. OWNER: Accept/Reject Order & Update Debt
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    let order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // LOGIC: Only increase debt if the order is being ACCEPTED for the first time
    if (status === 'accepted' && order.status === 'pending') {
      const student = await User.findById(order.student);

      // 1. Check if student is over their custom PER-CANTEEN credit limit
      const existingDebt = await Debt.findOne({ student: order.student, canteen: order.canteen });
      const currentCanteenDebt = existingDebt ? existingDebt.amountOwed : 0;
      const canteenLimit = existingDebt ? existingDebt.limit : 3000;
      
      if (currentCanteenDebt + order.totalAmount > canteenLimit) {
        return res.status(400).json({
          status: 'fail',
          message: `Per-canteen debt limit of ₹${canteenLimit} exceeded! Current debt is ₹${currentCanteenDebt}.`
        });
      }

      // 2. Update Student's total debt in User Model
      student.totalDebt += order.totalAmount;
      await student.save();

      // 3. THE MAGIC: Create or update the specific Canteen Debt Ticket!
      await Debt.findOneAndUpdate(
        { student: order.student, canteen: order.canteen }, // Find the exact Khata
        { $inc: { amountOwed: order.totalAmount } },        // Add the new order amount
        { upsert: true, new: true }                         // If it doesn't exist, create it!
      );
    }

    // Save the new status (accepted/rejected)
    order.status = status;
    await order.save();

    // Populate canteen to send back to student
    order = await order.populate('canteen', 'name');

    // 📡 EMIT TO STUDENT'S SOCKET.IO ROOM
    const io = req.app.get('io');
    if (io && order.student) {
      console.log(`📢 Emitting orderStatusUpdated to student room: ${order.student._id || order.student}`);
      io.to(`student:${order.student._id || order.student}`).emit('orderStatusUpdated', order);
      
      // If accepted for the first time, debt was added, so emit debt-updated
      if (status === 'accepted') {
         io.to(`student:${order.student._id || order.student}`).emit('debt-updated');
         io.to(`canteen:${order.canteen._id || order.canteen}`).emit('debt-updated');
      }
    }

    res.status(200).json({
      status: 'success',
      data: order
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};
// 4. STUDENT: View personal order history
exports.getStudentOrders = async (req, res) => {
  try {
    const orders = await Order.find({ student: req.user.id })
      .populate('canteen', 'name')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      data: orders
    });
  } catch (error) {
    res.status(404).json({ status: 'fail', message: error.message });
  }
};

// 5. STUDENT: View complete history (Orders & Payments)
exports.getStudentHistory = async (req, res) => {
  try {
    // 🏆 FIX 1: Use req.user._id (ObjectId) instead of req.user.id (String)
    const allRecords = await Order.find({ student: req.user._id })
      .populate('canteen', 'name')
      .sort({ createdAt: -1 });

    const orderHistory = [];
    const paymentHistory = [];
    const combinedHistory = []; // 🏆 FIX 2: Create a unified array for easier frontend mapping

    allRecords.forEach(record => {
      // Safe check for payment type
      const isPayment = record.items && record.items.length > 0 && record.items[0].name === 'Offline Debt Payment';

      // Safe Date parsing
      const dateObj = record.createdAt ? new Date(record.createdAt) : new Date();
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      
      // Safe status check
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
        type: isPayment ? 'payment' : 'order' // Helper flag for the frontend UI
      };

      if (isPayment) {
        const paymentRecord = { ...formattedRecord, items: 'Debt Clearance' };
        paymentHistory.push(paymentRecord);
        combinedHistory.push(paymentRecord); // Add to unified list
      } else {
        const orderRecord = {
          ...formattedRecord,
          items: Array.isArray(record.items) && record.items.length > 0
            ? record.items.map(i => `${i.quantity}x ${i.name}`).join(', ') 
            : 'Unknown Items'
        };
        orderHistory.push(orderRecord);
        combinedHistory.push(orderRecord); // Add to unified list
      }
    });

    // 🏆 FIX 3: Send back the separated arrays AND the combined history
    res.status(200).json({ 
      status: 'success', 
      data: { 
        orders: orderHistory, 
        payments: paymentHistory,
        allHistory: combinedHistory // React can just map over res.data.data.allHistory!
      } 
    });
  } catch (error) {
    console.error("❌ ERROR IN GET STUDENT HISTORY:", error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. STUDENT: Cancel/Reject a pending order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    // Security check: Make sure this student actually owns this order
    const studentId = req.user._id ? req.user._id.toString() : req.user.id;
    if (order.student.toString() !== studentId) {
      return res.status(403).json({ status: 'fail', message: 'You cannot cancel someone else\'s order.' });
    }

    // Rule check: Only pending orders can be cancelled by the student
    if (order.status !== 'pending') {
      return res.status(400).json({ status: 'fail', message: 'You can only cancel orders that are still pending.' });
    }

    // 🔥 THE FIX: Change status to 'cancelled' instead of deleting it
    order.status = 'cancelled';
    await order.save();

    // 📡 EMIT TO SOCKET.IO: Tell the Canteen Owner dashboard to update!
    const io = req.app.get('io');
    if (io && order.canteen) {
      // This tells the owner's screen to update this specific order to 'cancelled'
      io.to(`canteen:${order.canteen}`).emit('orderStatusUpdated', order);
    }

    res.status(200).json({
      status: 'success',
      message: 'Order successfully cancelled.',
      data: order
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};