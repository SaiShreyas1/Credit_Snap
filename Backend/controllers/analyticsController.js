const Order = require('../models/ordersModel');
const Canteen = require('../models/canteenModel');
const mongoose = require('mongoose');

/**
 * @desc    Get dashboard analytics for the logged-in canteen owner
 * @route   GET /api/analytics/owner
 * @access  Private (Owner Only)
 */
exports.getOwnerAnalytics = async (req, res) => {
  try {
    // ==========================================
    // 1. CANTEEN LOOKUP & SAFETY CHECK
    // ==========================================
    // Find the specific Canteen document tied to the logged-in owner's User ID
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });

    // If the owner hasn't finished setting up their canteen yet, safely return empty arrays
    // This prevents the frontend charts from crashing due to undefined data
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

    // ==========================================
    // 2. BASE QUERY FILTERS
    // ==========================================
    const searchId = myCanteen._id;
    const validStatuses = ['accepted', 'archived']; // Only count successful food orders

    // The base match filters out "Debt Payments" so the analytics reflect actual food/item sales,
    // not just students clearing their Khata balance.
    const baseMatchCondition = {
      canteen: searchId,
      status: { $in: validStatuses },
      'items.name': { $nin: ['Offline Debt Payment', 'Online Debt Payment'] }
    };

    // ==========================================
    // 3. PIE CHART: Most Ordered Items (Top 5)
    // ==========================================
    // Unwinds the items array to count every individual item sold, then ranks them.
    const popularOrdersRaw = await Order.aggregate([
      { $match: baseMatchCondition },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', value: { $sum: '$items.quantity' } } },
      { $sort: { value: -1 } },
      { $limit: 5 }
    ]);

    // Map specific colors to the top 5 items for consistent UI styling
    const colors = ['#A78BFA', '#FF8A8A', '#38BDF8', '#FB923C', '#60A5FA'];
    const popularOrdersData = popularOrdersRaw.map((item, index) => ({
      name: item._id,
      value: item.value,
      color: colors[index % colors.length]
    }));

    // ==========================================
    // 4. WEEKLY ORDERS: Last 7 Days (Dynamic & Timezone Accurate)
    // ==========================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Group orders by day of the week, forced into Indian Standard Time (+05:30) 
    // to ensure late-night orders aren't accidentally counted as the previous day.
    const weeklyOrdersRaw = await Order.aggregate([
      { 
        $match: { 
          ...baseMatchCondition, 
          createdAt: { $gte: sevenDaysAgo } 
        } 
      },
      { 
        $group: { 
          _id: { $dayOfWeek: { date: '$createdAt', timezone: '+05:30' } }, 
          orders: { $sum: 1 } 
        } 
      }
    ]);

    const dayNamesMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    
    // Dynamically generate the last 7 days ending with TODAY, so the chart flows naturally
    const orderedDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      orderedDays.push(d.getDay() + 1); // JavaScript getDay is 0-6, MongoDB is 1-7
    }

    // Map the database results into our perfectly ordered 7-day array
    const weeklyOrdersData = orderedDays.map(num => {
      const found = weeklyOrdersRaw.find(d => d._id === num);
      return {
        day: dayNamesMap[num],
        orders: found ? found.orders : 0
      };
    });

    // ==========================================
    // 5. MONTHLY EARNINGS: Revenue by Month
    // ==========================================
    // Sums up the totalAmount of all valid orders, grouped by month (IST Timezone).
    const earningsRaw = await Order.aggregate([
      { $match: baseMatchCondition },
      { 
        $group: { 
          _id: { $month: { date: '$createdAt', timezone: '+05:30' } }, 
          earnings: { $sum: '$totalAmount' } 
        } 
      },
      { $sort: { '_id': 1 } } // Sort chronologically (Jan -> Dec)
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const earningsData = earningsRaw.map(record => ({
      month: monthNames[record._id - 1],
      earnings: record.earnings
    }));

    // ==========================================
    // 6. FINAL RESPONSE
    // ==========================================
    res.status(200).json({
      status: 'success',
      data: {
        popularOrdersData,
        weeklyOrdersData,
        earningsData
      }
    });

  } catch (error) {
    console.error("[Analytics Controller Error]:", error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};