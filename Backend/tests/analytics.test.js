const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../app');
const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const Order = require('../models/ordersModel');

// Ensure a JWT secret exists for testing
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_test_secret_for_jwt';

// Quick utility to generate test tokens
const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
  let dbUri = process.env.MONGO_URI_TEST;
  if (!dbUri && process.env.MONGO_URI) {
    dbUri = process.env.MONGO_URI.replace('CreditSnap?', 'CreditSnap_Test_Analytics?');
  } else if (!dbUri) {
    dbUri = 'mongodb://127.0.0.1:27017/creditsnap_test_analytics';
  }
  await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
});

afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

describe('Analytics Controller API', () => {
  let owner1, owner1Token;
  let owner2, owner2Token;
  let student, canteen1, canteen2;
  
  beforeEach(async () => {
    await User.deleteMany();
    await Canteen.deleteMany();
    await Order.deleteMany();

    // Create Owner 1
    owner1 = await User.create({
      name: 'Test Owner 1',
      email: 'owner1@iitk.ac.in',
      password: 'password123',
      phoneNo: '9998887771',
      role: 'owner',
      isVerified: true,
      rollNo: 'N/A', hallNo: 'N/A', roomNo: 'N/A'
    });
    owner1Token = `Bearer ${signToken(owner1._id)}`;

    // Create Owner 2 (To test data isolation)
    owner2 = await User.create({
      name: 'Test Owner 2',
      email: 'owner2@iitk.ac.in',
      password: 'password123',
      phoneNo: '9998887772',
      role: 'owner',
      isVerified: true,
      rollNo: 'N/A', hallNo: 'N/A', roomNo: 'N/A'
    });
    owner2Token = `Bearer ${signToken(owner2._id)}`;

    // Create typical Student
    student = await User.create({
      name: 'Test Student',
      email: 'student@iitk.ac.in',
      password: 'password123',
      phoneNo: '1112223333',
      role: 'student',
      rollNo: '210123',
      hallNo: '13',
      roomNo: 'A100',
      isVerified: true
    });
  });

  describe('Auth & Authorization', () => {
    it('should block access if no token is provided', async () => {
      const res = await request(app).get('/api/analytics/owner');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should block access if an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', 'Bearer invalid_token_here');
      expect(res.statusCode).toBe(401);
    });

    it('should return empty data safely if logged in as student (no canteen matches)', async () => {
      const studentToken = `Bearer ${signToken(student._id)}`;
      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', studentToken);
        
      expect(res.statusCode).toBe(200);
      expect(res.body.data.popularOrdersData).toEqual([]);
      expect(res.body.data.weeklyOrdersData).toEqual([]);
      expect(res.body.data.earningsData).toEqual([]);
    });
  });

  describe('Empty States', () => {
    it('should return empty arrays safely when owner currently has no listed canteen', async () => {
      // owner1 token but no canteen1 created
      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', owner1Token);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.popularOrdersData).toEqual([]);
    });

    it('should return 0 counters and empty top orders when canteen exists but has absolutely NO orders', async () => {
      await Canteen.create({
        name: 'Test Canteen 1',
        ownerId: owner1._id,
        defaultLimit: 3000,
        isOpen: true
      });

      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', owner1Token);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.popularOrdersData).toEqual([]);
      // Should still have 7 days in weekly limit but all 0
      expect(res.body.data.weeklyOrdersData).toHaveLength(7);
      expect(res.body.data.weeklyOrdersData.every(d => d.orders === 0)).toBe(true);
      expect(res.body.data.earningsData).toEqual([]);
    });
  });

  describe('Data Filtering & Isolation', () => {
    beforeEach(async () => {
      canteen1 = await Canteen.create({
        name: 'Test Canteen 1',
        ownerId: owner1._id,
        defaultLimit: 3000,
        isOpen: true
      });
      
      canteen2 = await Canteen.create({
        name: 'Test Canteen 2', // Data from here should not show up for owner 1
        ownerId: owner2._id,
        defaultLimit: 3000,
        isOpen: true
      });
    });

    it('should ignore pending/rejected orders and debt payments completely', async () => {
      // Insert mixed orders for canteen 1
      await Order.create([
        {
          student: student._id,
          canteen: canteen1._id,
          items: [{ name: 'Samosa', quantity: 2, price: 15 }], // 30
          totalAmount: 30,
          status: 'pending' // SHOULD BE IGNORED
        },
        {
          student: student._id,
          canteen: canteen1._id,
          items: [{ name: 'Samosa', quantity: 1, price: 15 }], // 15
          totalAmount: 15,
          status: 'rejected' // SHOULD BE IGNORED
        },
        {
          student: student._id,
          canteen: canteen1._id,
          items: [{ name: 'Offline Debt Payment', quantity: 1, price: 100 }], // 100
          totalAmount: 100,
          status: 'accepted' // DEBT PAYMENT SHOULD BE IGNORED
        },
        {
          student: student._id,
          canteen: canteen1._id,
          items: [{ name: 'Online Debt Payment', quantity: 1, price: 150 }], // 150
          totalAmount: 150,
          status: 'accepted' // DEBT PAYMENT SHOULD BE IGNORED
        },
        {
          student: student._id,
          canteen: canteen1._id,
          items: [{ name: 'Valid Samosa', quantity: 3, price: 15 }], // 45
          totalAmount: 45,
          status: 'accepted' // THIS SHOULD COUNT
        }
      ]);

      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', owner1Token);

      const data = res.body.data;
      
      // ONLY valid samosa order should appear
      expect(data.popularOrdersData).toHaveLength(1);
      expect(data.popularOrdersData[0].name).toBe('Valid Samosa');
      expect(data.popularOrdersData[0].value).toBe(3); // Quantity

      expect(data.weeklyOrdersData.reduce((acc, d) => acc + d.orders, 0)).toBe(1);
      
      expect(data.earningsData).toHaveLength(1);
      expect(data.earningsData[0].earnings).toBe(45); // total amount
    });

    it('should strictly isolate data between distinct canteens', async () => {
      // Insert valid orders for canteen 1
      await Order.create({
        student: student._id,
        canteen: canteen1._id,
        items: [{ name: 'Canteen1 Burger', quantity: 2, price: 50 }],
        totalAmount: 100,
        status: 'accepted'
      });

      // Insert valid orders for canteen 2
      await Order.create({
        student: student._id,
        canteen: canteen2._id,
        items: [{ name: 'Canteen2 Pizza', quantity: 1, price: 200 }],
        totalAmount: 200,
        status: 'accepted'
      });

      // Fetch Canteen 1 data
      const res1 = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      expect(res1.body.data.popularOrdersData[0].name).toBe('Canteen1 Burger');
      expect(res1.body.data.popularOrdersData).toHaveLength(1);
      expect(res1.body.data.earningsData.reduce((acc, d) => acc + d.earnings, 0)).toBe(100);

      // Fetch Canteen 2 data
      const res2 = await request(app).get('/api/analytics/owner').set('Authorization', owner2Token);
      expect(res2.body.data.popularOrdersData[0].name).toBe('Canteen2 Pizza');
      expect(res2.body.data.popularOrdersData).toHaveLength(1);
      expect(res2.body.data.earningsData.reduce((acc, d) => acc + d.earnings, 0)).toBe(200);
    });
  });

  describe('Complex Aggregations (Top 5, Multi-month, 7-Days)', () => {
    beforeEach(async () => {
      canteen1 = await Canteen.create({
        name: 'Test Canteen 1',
        ownerId: owner1._id,
        defaultLimit: 3000,
        isOpen: true
      });
    });

    it('should accurately limit popular items to the top 5 by quantity sorted descending', async () => {
      const items = [
        { name: 'Item A', quantity: 2, price: 10 },
        { name: 'Item B', quantity: 20, price: 10 }, // Rank 1
        { name: 'Item C', quantity: 15, price: 10 }, // Rank 2
        { name: 'Item D', quantity: 5, price: 10 },  // Rank 4
        { name: 'Item E', quantity: 1, price: 10 },  // Rank 6 (Should be excluded)
        { name: 'Item F', quantity: 10, price: 10 }, // Rank 3
        { name: 'Item G', quantity: 3, price: 10 },  // Rank 5
      ];
      
      await Order.create({
        student: student._id,
        canteen: canteen1._id,
        items,
        totalAmount: 560,
        status: 'accepted'
      });

      const res = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      const pops = res.body.data.popularOrdersData;

      expect(pops).toHaveLength(5);
      expect(pops[0].name).toBe('Item B');
      expect(pops[0].value).toBe(20);
      
      expect(pops[1].name).toBe('Item C');
      expect(pops[4].name).toBe('Item G'); // 5th item
      
      // Enforce the color scheme mentioned in the controller
      const expectedColors = ['#A78BFA', '#FF8A8A', '#38BDF8', '#FB923C', '#60A5FA'];
      pops.forEach((p, idx) => {
        expect(p.color).toBe(expectedColors[idx % expectedColors.length]);
      });
    });

    it('should calculate monthly earnings sorted chronologically across different months', async () => {
      const currentYear = new Date().getFullYear();
      
      // Force createdAt dates
      const febOrderDate = new Date(`${currentYear}-02-15T12:00:00Z`);
      const mayOrderDate = new Date(`${currentYear}-05-10T12:00:00Z`);
      const mayOrderDate2 = new Date(`${currentYear}-05-20T12:00:00Z`);

      await Order.insertMany([
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Snack', quantity: 1, price: 100 }], totalAmount: 100, status: 'accepted', createdAt: febOrderDate },
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Snack', quantity: 2, price: 100 }], totalAmount: 200, status: 'accepted', createdAt: mayOrderDate },
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Snack', quantity: 3, price: 100 }], totalAmount: 300, status: 'accepted', createdAt: mayOrderDate2 }
      ]);

      const res = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      const earnings = res.body.data.earningsData;

      // Grouped by month: Feb and May should exist
      expect(earnings).toHaveLength(2);
      expect(earnings[0].month).toBe('Feb');
      expect(earnings[0].earnings).toBe(100);

      expect(earnings[1].month).toBe('May');
      expect(earnings[1].earnings).toBe(500); // 200 + 300
    });

    it('should handle conflicts gracefully with tied quantities and process extreme monetary values', async () => {
      const currentYear = new Date().getFullYear();
      
      const janOrderDate = new Date(`${currentYear}-01-10T12:00:00Z`);
      const mayOrderDate = new Date(`${currentYear}-05-15T12:00:00Z`);
      const decOrderDate = new Date(`${currentYear}-12-30T12:00:00Z`);

      // Extreme values for items (prices and quantities)
      const extremeOrderItems1 = [
        { name: 'Item Alpha', quantity: 2000, price: 0 },         // Free item, massive quantity
        { name: 'Item Beta', quantity: 500, price: 9999999 },     // High price, moderate quantity
        { name: 'Item Gamma', quantity: 50, price: 10 },
      ];
      
      // Creating ties for the top 5 limit cutoff. 
      // Current Ranks before this order:
      // 1. Item Alpha: 2000
      // 2. Item Beta: 500
      // 3. Item Gamma: 50
      // We will add 3 items with quantity 30. All tie for 4th/5th/6th place, creating a conflict.
      const tiesOrderItems = [
        { name: 'Tie Item X', quantity: 30, price: 50 },
        { name: 'Tie Item Y', quantity: 30, price: 100 },
        { name: 'Tie Item Z', quantity: 30, price: 20 },
        { name: 'Item Delta', quantity: 1, price: 10 }, // Last place item
      ];

      await Order.insertMany([
        { student: student._id, canteen: canteen1._id, items: extremeOrderItems1, totalAmount: 4999999500, status: 'accepted', createdAt: janOrderDate }, // 500 * 9999999
        { student: student._id, canteen: canteen1._id, items: tiesOrderItems, totalAmount: 5110, status: 'accepted', createdAt: mayOrderDate }, // 30*50 + 30*100 + 30*20 + 10
        // A standard normal order in December to ensure small values still process correctly alongside huge ones
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Item Gamma', quantity: 2, price: 10 }], totalAmount: 20, status: 'accepted', createdAt: decOrderDate },
        // Introduce exact floating point amounts specifically to cause precision/drift errors (e.g. producing ...9999998)
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Precision Item', quantity: 1, price: 1644.44 }], totalAmount: 1644.44, status: 'accepted', createdAt: decOrderDate },
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Precision Item', quantity: 1, price: 0.01 }], totalAmount: 0.01, status: 'accepted', createdAt: decOrderDate },
        // Floating point drift case: 0.1 + 0.2 is famously not 0.3 in IEEE 754
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Drift Item', quantity: 1, price: 0.1 }], totalAmount: 0.1, status: 'accepted', createdAt: decOrderDate },
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Drift Item', quantity: 1, price: 0.2 }], totalAmount: 0.2, status: 'accepted', createdAt: decOrderDate }
      ]);

      const res = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      const data = res.body.data;
      
      // ... (Top 5 checks omitted for brevity in chunk but kept in file) ...
      
      // 1. Check Top 5 conflict resolution
      const pops = data.popularOrdersData;
      expect(pops).toHaveLength(5); // Must strictly remain 5 despite the tie
      
      // We know Alpha (2000), Beta (500), and Gamma (52) are the top 3.
      expect(pops[0].name).toBe('Item Alpha');
      expect(pops[1].name).toBe('Item Beta');
      expect(pops[2].name).toBe('Item Gamma');
      expect(pops[2].value).toBe(52); // Verify aggregation across different orders works
      
      // The 4th and 5th items should be exactly two of the three tied items (X, Y, Z).
      // MongoDB decides the break based on internal sort (usually natural insertion order or _id), 
      // but it must cut it cleanly at 5.
      const tiedItemsInTop5 = pops.filter(p => p.value === 30).map(p => p.name);
      expect(tiedItemsInTop5).toHaveLength(2); // Only 2 out of the 3 tied items should make it
      expect(['Tie Item X', 'Tie Item Y', 'Tie Item Z']).toEqual(expect.arrayContaining(tiedItemsInTop5));
      
      // The lowest quantity item should absolutely not be there
      expect(pops.find(p => p.name === 'Item Delta')).toBeUndefined();

      // 2. Check earnings (Extreme + Normal Values without overflow or type issues)
      const earnings = data.earningsData;
      expect(earnings).toHaveLength(3); // Jan, May, Dec

      expect(earnings[0].month).toBe('Jan');
      expect(earnings[0].earnings).toBe(4999999500); 

      expect(earnings[1].month).toBe('May');
      expect(earnings[1].earnings).toBe(5110);

      expect(earnings[2].month).toBe('Dec');
      // 20 (base) + 1644.44 + 0.01 + 0.1 + 0.2 = 1664.75 exactly.
      // If rounding isn't implemented, this might return 1664.7500000000002
      expect(earnings[2].earnings).toBe(1664.75);
    });

    it('should strictly limit to 5 items when there are 6 potential candidates with ties at the cutoff', async () => {
      // 6 items with varying quantities, including a tie at the 5th/6th spot.
      const items = [
        { name: 'Winner 1', quantity: 100, price: 10 },
        { name: 'Winner 2', quantity: 80, price: 10 },
        { name: 'Winner 3', quantity: 60, price: 10 },
        { name: 'Winner 4', quantity: 40, price: 10 },
        { name: 'Tied Item A', quantity: 20, price: 10 }, // Tied for 5th or 6th
        { name: 'Tied Item B', quantity: 20, price: 10 }, // Tied for 5th or 6th
      ];

      await Order.create({
        student: student._id,
        canteen: canteen1._id,
        items,
        totalAmount: 3200,
        status: 'accepted'
      });

      const res = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      const pops = res.body.data.popularOrdersData;

      // The count must be exactly 5, despite there being a tie for the 5th slot.
      expect(pops).toHaveLength(5);

      // Verify the top 4 are definitely there
      const names = pops.map(p => p.name);
      expect(names).toContain('Winner 1');
      expect(names).toContain('Winner 2');
      expect(names).toContain('Winner 3');
      expect(names).toContain('Winner 4');

      // Verify ONE and ONLY ONE of the tied items made it in
      const tiedCount = names.filter(n => n === 'Tied Item A' || n === 'Tied Item B').length;
      expect(tiedCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 cleanly if the database throws an error', async () => {
      // Spy on Order.aggregate to force an error.
      const aggregateSpy = jest.spyOn(Order, 'aggregate').mockImplementationOnce(() => {
        throw new Error('Simulated Database Crash');
      });

      await Canteen.create({
        name: 'Test Canteen',
        ownerId: owner1._id,
        defaultLimit: 3000,
        isOpen: true
      });

      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', owner1Token);

      expect(res.statusCode).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Simulated Database Crash');

      aggregateSpy.mockRestore();
    });
  });
});
