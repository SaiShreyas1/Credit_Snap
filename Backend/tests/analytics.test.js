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
  let owner, ownerToken;

  beforeEach(async () => {
    await User.deleteMany();
    await Canteen.deleteMany();
    await Order.deleteMany();

    // Create an Owner User
    owner = await User.create({
      name: 'Test Owner',
      email: 'owner@iitk.ac.in',
      password: 'password123',
      phoneNo: '9998887777',
      role: 'owner',
      isVerified: true,
      rollNo: 'N/A', hallNo: 'N/A', roomNo: 'N/A'
    });
    ownerToken = `Bearer ${signToken(owner._id)}`;
  });

  describe('GET /api/analytics/owner', () => {
    it('should block analytics access if missing token (Unauthorized)', async () => {
      const res = await request(app).get('/api/analytics/owner');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should return empty arrays safely when the owner has no linked canteen', async () => {
      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', ownerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.popularOrdersData).toEqual([]);
      expect(res.body.data.weeklyOrdersData).toEqual([]);
      expect(res.body.data.earningsData).toEqual([]);
    });

    it('should return accurate popular, weekly, and earnings data when orders exist', async () => {
      // 1. Create a Canteen
      const canteen = await Canteen.create({
        name: 'Test Canteen',
        ownerId: owner._id,
        defaultLimit: 3000,
        isOpen: true
      });

      const student = await User.create({
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

      // Fixed dates for the tests to be predictable
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);

      // Create orders
      await Order.create([
        {
          student: student._id,
          canteen: canteen._id,
          items: [{ name: 'Samosa', quantity: 3, price: 15 }, { name: 'Tea', quantity: 2, price: 10 }],
          totalAmount: 65,
          status: 'accepted',
          createdAt: today
        },
        {
          student: student._id,
          canteen: canteen._id,
          items: [{ name: 'Samosa', quantity: 1, price: 15 }, { name: 'Coffee', quantity: 1, price: 20 }],
          totalAmount: 35,
          status: 'archived',
          createdAt: threeDaysAgo
        },
        // Debt Payments should be excluded
        {
          student: student._id,
          canteen: canteen._id,
          items: [{ name: 'Offline Debt Payment', quantity: 1, price: 100 }],
          totalAmount: 100,
          status: 'accepted',
          createdAt: today
        },
        // Pending orders should be excluded
        {
          student: student._id,
          canteen: canteen._id,
          items: [{ name: 'Samosa', quantity: 5, price: 15 }],
          totalAmount: 75,
          status: 'pending',
          createdAt: today
        }
      ]);

      const res = await request(app)
        .get('/api/analytics/owner')
        .set('Authorization', ownerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');

      const data = res.body.data;

      // Check Popular Orders
      // Total quantities: Samosa: 3 + 1 = 4, Tea: 2, Coffee: 1
      expect(data.popularOrdersData).toHaveLength(3);
      expect(data.popularOrdersData[0].name).toBe('Samosa');
      expect(data.popularOrdersData[0].value).toBe(4);

      // Check Weekly Orders
      expect(data.weeklyOrdersData).toHaveLength(7);
      // We know there are at least two orders in the last 7 days (today and 3 days ago).
      const totalWeeklyOrdersCount = data.weeklyOrdersData.reduce((acc, curr) => acc + curr.orders, 0);
      expect(totalWeeklyOrdersCount).toBe(2);

      // Check Earnings Data
      expect(data.earningsData.length).toBeGreaterThan(0);
      // Expected total earnings: 65 (today) + 35 (3 days ago) = 100
      const totalEarningsCount = data.earningsData.reduce((acc, curr) => acc + curr.earnings, 0);
      expect(totalEarningsCount).toBe(100);
    });
  });
});
