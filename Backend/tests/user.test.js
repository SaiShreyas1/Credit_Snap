const mongoose = require('mongoose');
const request = require('supertest');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../app');
const User = require('../models/userModel');
const crypto = require('crypto');

//Mock the email utility to prevent actual emails from being sent during testing
jest.mock('../utils/email', () => jest.fn().mockResolvedValue(true));
const sendEmail = require('../utils/email');

//Basic student details we'll reuse
const baseStudent = {
  name: 'Test Student',
  email: 'teststudent@iitk.ac.in',
  password: 'password123',
  phoneNo: '1234567890',
  role: 'student',
  rollNo: '210000',
  hallNo: '13',
  roomNo: 'A101'
};

beforeAll(async () => {
  // Connect to a specific test database using Atlas URI
  let dbUri = process.env.MONGO_URI_TEST;
  if (!dbUri && process.env.MONGO_URI) {
    dbUri = process.env.MONGO_URI.replace('CreditSnap?', 'CreditSnap_Test?');
  } else if (!dbUri) {
    dbUri = 'mongodb://127.0.0.1:27017/creditsnap_test_auth';
  }
  await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
});

afterEach(async () => {
  // Clean up the user collection after each test
  await User.deleteMany();
  jest.clearAllMocks();
});

afterAll(async () => {
  // Drop the test database and close the connection
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

describe('User Authentication API', () => {

  describe('POST /api/users/signup', () => {
    it('should successfully register a student with valid @iitk.ac.in email', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send(baseStudent);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toMatch(/verify your account/i);

      // Verify user was saved in DB
      const user = await User.findOne({ email: baseStudent.email });
      expect(user).toBeTruthy();
      expect(user.isVerified).toBe(false);
      expect(user.role).toBe('student');
      expect(user.emailVerificationToken).toBeDefined();

      // Ensure email utility was called
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should fail registration with non @iitk.ac.in email', async () => {
      const invalidEmailStudent = { ...baseStudent, email: 'teststudent@gmail.com' };
      const res = await request(app)
        .post('/api/users/signup')
        .send(invalidEmailStudent);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/valid @iitk.ac.in email/i);
    });

    it('should prevent registering directly as an owner', async () => {
      const ownerAttempt = { ...baseStudent, role: 'owner' };
      const res = await request(app)
        .post('/api/users/signup')
        .send(ownerAttempt);

      expect(res.statusCode).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Canteen owner accounts cannot be created/i);
    });

    it('should block signup if email is already in use by verified account', async () => {
      // Create and verify an account
      await User.create({ ...baseStudent, isVerified: true });

      const res = await request(app)
        .post('/api/users/signup')
        .send(baseStudent);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/email already exists/i);
    });

    it('should replace an unverified account during signup with same email', async () => {
      // Create an unverified account
      await User.create({ ...baseStudent, emailVerificationToken: 'oldtoken', isVerified: false });

      const res = await request(app)
        .post('/api/users/signup')
        .send(baseStudent);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');

      // Expect a new user is created and previous one is replaced
      const count = await User.countDocuments({ email: baseStudent.email });
      expect(count).toBe(1);
    });
  });

  describe('GET /api/users/verifyEmail/:token', () => {
    it('should successfully verify a valid token', async () => {
      // Create an unverified user
      const token = 'valid-test-token';
      const user = await User.create({ 
        ...baseStudent, 
        emailVerificationToken: token, 
        isVerified: false 
      });

      const res = await request(app)
        .get(`/api/users/verifyEmail/${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined(); // JWT is returned
      expect(res.body.data.user.isVerified).toBe(true);

      const verifiedUser = await User.findById(user._id);
      expect(verifiedUser.isVerified).toBe(true);
      expect(verifiedUser.emailVerificationToken).toBeUndefined();
    });

    it('should fail with an invalid token', async () => {
      const res = await request(app)
        .get('/api/users/verifyEmail/invalid-token');

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/invalid or has expired/i);
    });
  });

  describe('POST /api/users/login', () => {
    let mockUser;

    beforeEach(async () => {
      // Create a verified user before each login test
      mockUser = await User.create({ ...baseStudent, isVerified: true });
    });

    it('should successfully login a verified user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: baseStudent.email, password: baseStudent.password });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
    });

    it('should reject login for an unverified user', async () => {
      mockUser.isVerified = false;
      await mockUser.save({ validateBeforeSave: false });

      const res = await request(app)
        .post('/api/users/login')
        .send({ email: baseStudent.email, password: baseStudent.password });

      expect(res.statusCode).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/verify your email/i);
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: baseStudent.email, password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Incorrect email or password/i);
    });

    it('should reject login if email does not exist', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'nonexistent@iitk.ac.in', password: 'password123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('should reject login if email or password are not provided', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: baseStudent.email });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/provide email and password/i);
    });
  });

  describe('Password Recovery (Forgot & Reset)', () => {
    let mockUser;

    beforeEach(async () => {
      mockUser = await User.create({ ...baseStudent, isVerified: true });
    });

    it('POST /forgotPassword should successfully create a reset token and send email', async () => {
      const res = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: baseStudent.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toMatch(/Token sent to email/i);

      // Verify user has the hashed token and expiry set
      const updatedUser = await User.findById(mockUser._id);
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();

      // Ensure mock email was triggered
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it('POST /forgotPassword should fail if user does not exist', async () => {
      const res = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'nobody@iitk.ac.in' });

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe('fail');
    });

    it('PATCH /resetPassword/:token should successfully reset password with valid token', async () => {
      // Manually trigger reset token mechanism
      const resetToken = mockUser.createPasswordResetToken();
      await mockUser.save({ validateBeforeSave: false });

      const res = await request(app)
        .patch(`/api/users/resetPassword/${resetToken}`)
        .send({ password: 'newSecurePassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();

      // Ensure token was cleared
      const updatedUser = await User.findById(mockUser._id).select('+password');
      expect(updatedUser.passwordResetToken).toBeUndefined();
      expect(updatedUser.passwordResetExpires).toBeUndefined();

      // Ensure password was updated
      const isMatch = await updatedUser.correctPassword('newSecurePassword123', updatedUser.password);
      expect(isMatch).toBe(true);
    });

    it('PATCH /resetPassword/:token should fail with an invalid/expired token', async () => {
      const res = await request(app)
        .patch('/api/users/resetPassword/invalid-token')
        .send({ password: 'newSecurePassword123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/invalid or has expired/i);
    });
  });

});
