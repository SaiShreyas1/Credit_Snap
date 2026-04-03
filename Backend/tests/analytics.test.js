const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../app');
const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const Order = require('../models/ordersModel');

//Ensure a JWT secret exists for testing
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_test_secret_for_jwt';

//Quick utility to generate test tokens
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

    //Create Owner 1
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

    //Create Owner 2 (To test data isolation)
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
      await Order.create({
        student: student._id,
        canteen: canteen2._id,
        items: [{ name: 'Canteen2 Pizza', quantity: 1, price: 200 }],
        totalAmount: 200,
        status: 'accepted'
      });
      const res1 = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      expect(res1.body.data.popularOrdersData[0].name).toBe('Canteen1 Burger');
      expect(res1.body.data.popularOrdersData).toHaveLength(1);
      expect(res1.body.data.earningsData.reduce((acc, d) => acc + d.earnings, 0)).toBe(100);
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
      expect(pops[4].name).toBe('Item G');
      
      //Enforce the color scheme mentioned in the controller
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

    it('should successfully map last 7 days of Weekly Orders accurately by day of week', async () => {
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);
      
      await Order.insertMany([
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Weekly Item', quantity: 1, price: 50 }], totalAmount: 50, status: 'accepted', createdAt: today },
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Weekly Item', quantity: 1, price: 50 }], totalAmount: 50, status: 'accepted', createdAt: threeDaysAgo },
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Weekly Item', quantity: 1, price: 50 }], totalAmount: 50, status: 'accepted', createdAt: threeDaysAgo }
      ]);

      const res = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      const weekly = res.body.data.weeklyOrdersData;

      expect(weekly).toHaveLength(7);
      
      // Since orderedDays pushes chronologically, index 6 is always "Today"
      expect(weekly[6].orders).toBe(1);
      
      // 3 days ago maps to index 3 (6=Today, 5=1 day ago, 4=2 days ago, 3=3 days ago)
      expect(weekly[3].orders).toBe(2);

      // Verify that days without orders safely fall back to exactly 0
      expect(weekly[5].orders).toBe(0);
      expect(weekly[4].orders).toBe(0);
    });

    it('should successfully include archived orders in earnings and popularity aggregations', async () => {
      // The controller explicitly allows 'accepted' and 'archived'. Validating archived tracking.
      await Order.create([
        { student: student._id, canteen: canteen1._id, items: [{ name: 'Late Samosa', quantity: 2, price: 20 }], totalAmount: 40, status: 'archived' }
      ]);

      const res = await request(app).get('/api/analytics/owner').set('Authorization', owner1Token);
      
      // Assert earnings ingestion
      const earnings = res.body.data.earningsData;
      expect(earnings.length).toBeGreaterThan(0);
      expect(earnings[earnings.length - 1].earnings).toBe(40);

      // Assert popular orders ingestion
      const pops = res.body.data.popularOrdersData;
      expect(pops).toHaveLength(1);
      expect(pops[0].name).toBe('Late Samosa');
      expect(pops[0].value).toBe(2);
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
