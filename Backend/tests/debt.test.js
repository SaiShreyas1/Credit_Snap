const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../app');
const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
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
    dbUri = process.env.MONGO_URI.replace('CreditSnap?', 'CreditSnap_Test_Debts?');
  } else if (!dbUri) {
    dbUri = 'mongodb://127.0.0.1:27017/creditsnap_test_debts';
  }
  await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
});

afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

describe('Debt & Credit Tracking API', () => {
  let student, owner, canteen, debt, studentToken, ownerToken;

  beforeEach(async () => {
    await User.deleteMany();
    await Canteen.deleteMany();
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
      isVerified: true,
      totalDebt: 500 // Student has 500 total debt initially in this test
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

    // 4. Create a Debt Record for the Student in the Canteen
    debt = await Debt.create({
      student: student._id,
      canteen: canteen._id,
      amountOwed: 500,
      limit: 3000
    });
  });

  describe('GET /api/debts/my-debts (Student Fetch)', () => {
    it('should fetch active debts for the logged-in student', async () => {
      const res = await request(app)
        .get('/api/debts/my-debts')
        .set('Authorization', studentToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].amountOwed).toBe(500);
      expect(res.body.data[0].canteen.name).toBe('Test Canteen'); // Assuming population
    });

    it('should block unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/debts/my-debts');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });
  });

  describe('GET /api/debts/active (Owner Fetch)', () => {
    it('should fetch all active student debts for the owner\'s canteen', async () => {
      const res = await request(app)
        .get('/api/debts/active')
        .set('Authorization', ownerToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].student.name).toBe('Test Student');
      expect(res.body.data[0].amountOwed).toBe(500);
    });
  });

  describe('POST /api/debts/:id/pay (Clear Offline)', () => {
    it('should successfully process a partial offline payment', async () => {
      const res = await request(app)
        .post(`/api/debts/${debt._id}/pay`)
        .set('Authorization', ownerToken)
        .send({ amountPaid: 200 });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toMatch(/Successfully deducted/i);

      // Verify DB update
      const updatedDebt = await Debt.findById(debt._id);
      expect(updatedDebt.amountOwed).toBe(300); // 500 - 200 = 300
    });

    it('should fail if payment amount exceeds current debt', async () => {
      const res = await request(app)
        .post(`/api/debts/${debt._id}/pay`)
        .set('Authorization', ownerToken)
        .send({ amountPaid: 600 }); // owes 500, tries to pay 600

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Amount exceeds current debt/i);
    });

    it('should fail if payment amount is invalid or negative', async () => {
      const res = await request(app)
        .post(`/api/debts/${debt._id}/pay`)
        .set('Authorization', ownerToken)
        .send({ amountPaid: -50 });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/greater than zero/i);
    });
  });

  describe('PATCH /api/debts/:id/limit (Credit Tracking)', () => {
    it('should successfully update the credit limit for a student', async () => {
      const res = await request(app)
        .patch(`/api/debts/${debt._id}/limit`)
        .set('Authorization', ownerToken)
        .send({ limit: 4000 });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.limit).toBe(4000);

      const updatedDebt = await Debt.findById(debt._id);
      expect(updatedDebt.limit).toBe(4000);
    });

    it('should fail if the new credit limit is below current debt', async () => {
      const res = await request(app)
        .patch(`/api/debts/${debt._id}/limit`)
        .set('Authorization', ownerToken)
        .send({ limit: 200 }); // owes 500, tries to set limit to 200

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Cannot set limit/i);
    });
  });
});
