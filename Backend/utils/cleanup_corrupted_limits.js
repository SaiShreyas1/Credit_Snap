/**
 * @file cleanup_corrupted_limits.js
 * @desc Emergency utility script to identify and reset corrupted student debt limits.
 *       Finds all debt records with limits exceeding 100,000 (standard is 3,000)
 *       and resets them to the canteen's default limit or 3,000.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Debt = require('../models/debtModel');
const Canteen = require('../models/canteenModel');

const REASONABLE_LIMIT_THRESHOLD = 3000; // Reset everything above the standard default
const GLOBAL_DEFAULT_LIMIT = 3000;

async function cleanup() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    console.log(`🔍 Searching for debt records with limits > ₹${REASONABLE_LIMIT_THRESHOLD}...`);
    
    console.log(`🔍 Searching for debt records with limits > ₹${REASONABLE_LIMIT_THRESHOLD}...`);
    
    const corruptedDebts = await Debt.find({ limit: { $gt: REASONABLE_LIMIT_THRESHOLD } }).populate('canteen');
    
    if (corruptedDebts.length > 0) {
      console.log(`🚨 Found ${corruptedDebts.length} corrupted debt records. starting reset...`);
      for (const debt of corruptedDebts) {
        const oldLimit = debt.limit;
        const newLimit = debt.canteen?.defaultLimit || GLOBAL_DEFAULT_LIMIT;
        debt.limit = newLimit;
        await debt.save();
        console.log(`🛠️ Reset limit for student ${debt.student} at ${debt.canteen?.name || 'Unknown Canteen'}: ₹${oldLimit} -> ₹${newLimit}`);
      }
    } else {
      console.log('✨ No corrupted debt limits found.');
    }

    console.log(`🔍 Searching for canteens with corrupted defaultLimits > ₹${REASONABLE_LIMIT_THRESHOLD}...`);
    const corruptedCanteens = await Canteen.find({ defaultLimit: { $gt: REASONABLE_LIMIT_THRESHOLD } });

    if (corruptedCanteens.length > 0) {
      console.log(`🚨 Found ${corruptedCanteens.length} corrupted canteens. starting reset...`);
      for (const canteen of corruptedCanteens) {
        const oldLimit = canteen.defaultLimit;
        canteen.defaultLimit = GLOBAL_DEFAULT_LIMIT;
        await canteen.save();
        console.log(`🛠️ Reset defaultLimit for canteen ${canteen.name}: ₹${oldLimit} -> ₹${GLOBAL_DEFAULT_LIMIT}`);
      }
    } else {
      console.log('✨ No corrupted canteen limits found.');
    }

    console.log('✅ Cleanup process completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
