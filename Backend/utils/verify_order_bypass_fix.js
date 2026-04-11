/**
 * @file verify_order_bypass_fix.js
 * @desc Verification script to ensure that orders with expensive items (> ₹3000)
 *       are strictly validated against the student's debt limit.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const MenuItem = require('../models/menuItemModel');
const Order = require('../models/ordersModel');
const Debt = require('../models/debtModel');
const { createOrder } = require('../controllers/ordersController');

async function verify() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    // 1. Setup Test Data
    const student = await User.findOne({ role: 'student' });
    const canteen = await Canteen.findOne({ isOpen: true });
    
    if (!student || !canteen) {
      console.log('⚠️ Could not find test student or open canteen. Please seed the database first.');
      process.exit(1);
    }

    console.log(`👤 Using Student: ${student.name} (${student._id})`);
    console.log(`🏪 Using Canteen: ${canteen.name} (${canteen._id})`);

    // 2. Clear existing debt for clean test
    await Debt.deleteMany({ student: student._id, canteen: canteen._id });
    console.log('🧹 Cleared existing debt for this student at this canteen.');

    // 3. Create a high-priced item
    let expensiveItem = await MenuItem.findOne({ canteenId: canteen._id, price: { $gt: 3000 } });
    if (!expensiveItem) {
      expensiveItem = await MenuItem.create({
        name: 'Super Premium Meal',
        price: 4000,
        canteenId: canteen._id,
        isAvailable: true
      });
      console.log(`💎 Created expensive item: ${expensiveItem.name} @ ₹${expensiveItem.price}`);
    } else {
      console.log(`💎 Found existing expensive item: ${expensiveItem.name} @ ₹${expensiveItem.price}`);
    }

    // 4. Attempt to place an order that exceeds the default limit (3000)
    // We expect this to FAIL now that we've hardened the logic.
    console.log('🚀 Attempting to place an order for ₹4000 (exceeds ₹3000 limit)...');
    
    const req = {
      user: { id: student._id.toString() },
      body: {
        canteenId: canteen._id.toString(),
        items: [{ name: expensiveItem.name, quantity: 1 }],
        totalAmount: 4000
      },
      app: { get: () => ({ to: () => ({ emit: () => {} }) }) } // Mock IO
    };

    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.body = data; return this; }
    };

    await createOrder(req, res);

    if (res.statusCode === 400 && res.body.status === 'fail' && res.body.message.includes('exceed')) {
      console.log('✅ PASS: Order was successfully REJECTED because it exceeds the limit.');
      console.log(`   Message: ${res.body.message}`);
    } else {
      console.log('❌ FAIL: Order was NOT rejected or returned an unexpected status.');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Body: ${JSON.stringify(res.body)}`);
    }

    // 5. Cleanup test item if we created it
    if (expensiveItem.name === 'Super Premium Meal') {
        await MenuItem.findByIdAndDelete(expensiveItem._id);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
