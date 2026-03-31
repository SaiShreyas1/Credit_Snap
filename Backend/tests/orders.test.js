const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../app');
const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const Order = require('../models/ordersModel');
const Debt = require('../models/debtModel');

// Ensure a JWT secret exists for testing
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_test_secret_for_jwt';

// Quick utility to generate test tokens
const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
  let dbUri = process.env.MONGO_URI_TEST;
  if (!dbUri && process.env.MONGO_URI) {
    dbUri = process.env.MONGO_URI.replace('CreditSnap?', 'CreditSnap_Test_Orders?');
  } else if (!dbUri) {
    dbUri = 'mongodb://127.0.0.1:27017/creditsnap_test_orders';
  }
  await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
});

afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

describe('Order Processing API', () => {
  let student, owner, canteen, studentToken, ownerToken;

  beforeEach(async () => {
    await User.deleteMany();
    await Canteen.deleteMany();
    await Order.deleteMany();
    await Debt.deleteMany();

    // 1. Create a Student User
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
    studentToken = `Bearer ${signToken(student._id)}`;

    // 2. Create an Owner User
    owner = await User.create({
      name: 'Test Owner',
      email: 'owner@iitk.ac.in',
      password: 'password123',
      phoneNo: '9998887777',
      role: 'owner',
      isVerified: true,
      // Pass bypass values for student fields to satisfy Mongoose checks internally
      rollNo: 'N/A', hallNo: 'N/A', roomNo: 'N/A'
    });
    ownerToken = `Bearer ${signToken(owner._id)}`;

    // 3. Create a Canteen
    canteen = await Canteen.create({
      name: 'Test Canteen',
      ownerId: owner._id,
      defaultLimit: 3000,
      isOpen: true
    });
  });

  describe('POST /api/orders/place', () => {
    it('should successfully place a new order as a student', async () => {
      const orderData = {
        canteenId: canteen._id,
        items: [{ name: 'Samosa', quantity: 2, price: 15 }],
        totalAmount: 30
      };

      const res = await request(app)
        .post('/api/orders/place')
        .set('Authorization', studentToken)
        .send(orderData);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalAmount).toBe(30);
      expect(res.body.data.status).toBe('pending');

      const savedOrder = await Order.findById(res.body.data._id);
      expect(savedOrder).toBeTruthy();
    });

    it('should block order placement if missing token (Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/orders/place')
        .send({ canteenId: canteen._id, totalAmount: 50 });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should refuse order if the total exceeds canteen default debt limit', async () => {
      const orderData = {
        canteenId: canteen._id,
        items: [{ name: 'Party Pack', quantity: 1, price: 3500 }],
        totalAmount: 3500 // Exceeds default limit of 3000
      };

      const res = await request(app)
        .post('/api/orders/place')
        .set('Authorization', studentToken)
        .send(orderData);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/exceed your ₹3000 debt limit/i);
    });

    it('should refuse order if current debt + order exceeds limit', async () => {
      // Manually inject existing debt of 2900
      await Debt.create({
        student: student._id,
        canteen: canteen._id,
        amountOwed: 2900,
        limit: 3000
      });

      const orderData = {
        canteenId: canteen._id,
        items: [{ name: 'Samosa', quantity: 10, price: 15 }],
        totalAmount: 150 // 2900 + 150 = 3050 (Exceeds 3000)
      };

      const res = await request(app)
        .post('/api/orders/place')
        .set('Authorization', studentToken)
        .send(orderData);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/exceed your ₹3000 debt/i);
    });
  });

  describe('GET Order Retrievals', () => {
    beforeEach(async () => {
      // Seed some orders
      await Order.create([
        { student: student._id, canteen: canteen._id, items: [{ name: 'A', quantity: 1, price: 50 }], totalAmount: 50 },
        { student: student._id, canteen: canteen._id, items: [{ name: 'B', quantity: 1, price: 100 }], totalAmount: 100 }
      ]);
    });

    it('should allow student to fetch their own active orders', async () => {
      const res = await request(app)
        .get('/api/orders/my-active-orders')
        .set('Authorization', studentToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should allow owner to fetch incoming orders to their canteen', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', ownerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBe(2);
      expect(res.body.data[0].student.name).toBe('Test Student'); // Testing populate
    });
    
    it('should block owner from calling student specific routes safely', async () => {
       // Since owner calls a student route, the controller queries by student ID (which matches the owner ID returning 0)
       const res = await request(app)
        .get('/api/orders/my-active-orders')
        .set('Authorization', ownerToken);
        
       expect(res.statusCode).toBe(200);
       expect(res.body.data.length).toBe(0); 
    });
  });

  describe('PATCH /api/orders/update-status', () => {
    let order;

    beforeEach(async () => {
      order = await Order.create({
        student: student._id,
        canteen: canteen._id,
        items: [{ name: 'Tea', quantity: 2, price: 10 }],
        totalAmount: 20,
        status: 'pending'
      });
    });

    it('should successfully update status to accepted AND increment debt', async () => {
      const res = await request(app)
        .patch('/api/orders/update-status')
        .set('Authorization', ownerToken)
        .send({ orderId: order._id, status: 'accepted' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('accepted');

      // VERIFY KHATA DEBT WAS CREATED AND INCREMENTED
      const debtTicket = await Debt.findOne({ student: student._id, canteen: canteen._id });
      expect(debtTicket).toBeTruthy();
      expect(debtTicket.amountOwed).toBe(20);

      // VERIFY STUDENT OVERALL DEBT WAS INCREMENTED
      const updatedStudent = await User.findById(student._id);
      expect(updatedStudent.totalDebt).toBe(20);
    });

    it('should NOT increment debt if status is updated to rejected', async () => {
      const res = await request(app)
        .patch('/api/orders/update-status')
        .set('Authorization', ownerToken)
        .send({ orderId: order._id, status: 'rejected' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('rejected');

      const debtTicket = await Debt.findOne({ student: student._id, canteen: canteen._id });
      expect(debtTicket).toBeNull(); // No debt created for rejected order
    });

    it('should block acceptance if updating the order breaches debt limit', async () => {
      // Simulate existing massive debt
      await Debt.create({
        student: student._id,
        canteen: canteen._id,
        amountOwed: 2990,
        limit: 3000
      });

      // The order is for 20, existing debt is 2990. 2990 + 20 = 3010 (> 3000 limit)
      const res = await request(app)
        .patch('/api/orders/update-status')
        .set('Authorization', ownerToken)
        .send({ orderId: order._id, status: 'accepted' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/limit of ₹3000 exceeded/i);

      // Ensure the order status remained 'pending'
      const unchangedOrder = await Order.findById(order._id);
      expect(unchangedOrder.status).toBe('pending');
    });

    it('should allow student to cancel their own pending order', async () => {
      const res = await request(app)
        .patch(`/api/orders/${order._id}/cancel`)
        .set('Authorization', studentToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });
    
    it('should NOT allow student to cancel an accepted order', async () => {
      order.status = 'accepted';
      await order.save();
      
      const res = await request(app)
        .patch(`/api/orders/${order._id}/cancel`)
        .set('Authorization', studentToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/only cancel orders that are still pending/i);
    });
  });
});
