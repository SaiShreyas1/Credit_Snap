const Order = require('../models/ordersModel');
const Canteen = require('../models/canteenModel');
const mongoose = require('mongoose');

exports.getOwnerAnalytics = async (req, res) => {
  try {
    // 1. Look up the specific Canteen owned by the logged-in user
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });

    // 🛡️ Safety Check: If the owner has no canteen yet, return empty charts
    if (!myCanteen) {
      return res.status(200).json({
        status: 'success',
        data: {
          popularOrdersData: [],
          weeklyOrdersData: [],
          earningsData: []
        }
      });
    }

    // 2. Use the ACTUAL Canteen ID for the database search
    const searchId = myCanteen._id;

    // 3. Define valid statuses (only count accepted/completed orders)
    const validStatuses = ['accepted', 'completed'];

    // Ignore debt-payment receipts so analytics only reflect real food orders
    const baseMatchCondition = {
      canteen: searchId,
      status: { $in: validStatuses },
      'items.name': { $nin: ['Offline Debt Payment', 'Online Debt Payment'] }
    };

    // ==========================================
    // PIE CHART: Most Ordered Items (Top 5)
    // ==========================================
    const popularOrdersRaw = await Order.aggregate([
      { $match: baseMatchCondition },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', value: { $sum: '$items.quantity' } } },
      { $sort: { value: -1 } },
      { $limit: 5 }
    ]);

    const colors = ['#A78BFA', '#FF8A8A', '#38BDF8', '#FB923C', '#60A5FA'];
    const popularOrdersData = popularOrdersRaw.map((item, index) => ({
      name: item._id,
      value: item.value,
      color: colors[index % colors.length]
    }));

    // ==========================================
    // WEEKLY ORDERS: Last 7 Days
    // ==========================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyOrdersRaw = await Order.aggregate([
      { 
        $match: { 
          ...baseMatchCondition, // Spread the base conditions
          createdAt: { $gte: sevenDaysAgo } 
        } 
      },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, orders: { $sum: 1 } } }
    ]);

    // MongoDB $dayOfWeek returns 1 for Sunday, 7 for Saturday
    const dayNamesMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    const weeklyOrdersData = [2, 3, 4, 5, 6, 7, 1].map(num => {
      const found = weeklyOrdersRaw.find(d => d._id === num);
      return {
        day: dayNamesMap[num],
        orders: found ? found.orders : 0
      };
    });

    // ==========================================
    // MONTHLY EARNINGS: Revenue by Month
    // ==========================================
    const earningsRaw = await Order.aggregate([
      { $match: baseMatchCondition },
      { $group: { _id: { $month: '$createdAt' }, earnings: { $sum: '$totalAmount' } } },
      { $sort: { '_id': 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const earningsData = earningsRaw.map(record => ({
      month: monthNames[record._id - 1],
      earnings: record.earnings
    }));

    res.status(200).json({
      status: 'success',
      data: {
        popularOrdersData,
        weeklyOrdersData,
        earningsData
      }
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
