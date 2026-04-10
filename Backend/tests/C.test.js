const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' }); 
const app = require('../app'); 
const User = require('../models/userModel'); 
const Canteen = require('../models/canteenModel'); // Assuming you have a canteen model!

describe('Security - Cross-Owner Data Isolation (IDOR)', () => {
  let ownerAToken;
  let canteenB_Id;

  // --- CONNECT & CLEAN DB ---
  beforeAll(async () => {
    const dbUri = process.env.MONGO_URI_TEST; 
    await mongoose.connect(dbUri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Canteen.deleteMany({});

    // 1. Register and Verify Owner A
    await request(app).post('/api/users/signup').send({
      name: 'Hacker Owner A', email: 'ownera@gmail.com', password: 'password123', role: 'owner'
    });
    await User.findOneAndUpdate({ email: 'ownera@gmail.com' }, { isVerified: true });
    
    // Log Owner A in to steal their token
    const loginA = await request(app).post('/api/users/login').send({
      email: 'ownera@gmail.com', password: 'password123'
    });
    ownerAToken = loginA.body.token;

    // 2. Register Owner B and create their Canteen
    await request(app).post('/api/users/signup').send({
      name: 'Victim Owner B', email: 'ownerb@gmail.com', password: 'password123', role: 'owner'
    });
    const ownerB = await User.findOne({ email: 'ownerb@gmail.com' });

    // Create a dummy canteen owned by Owner B
    const newCanteen = await Canteen.create({
      name: "Owner B's Cafe",
      owner: ownerB._id, // This belongs to B!
      menu: []
    });
    canteenB_Id = newCanteen._id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // --- THE ATTACK TEST ---
  it('should BLOCK Owner A from updating Owner B\'s canteen', async () => {
    const response = await request(app)
      // Attempting to hit Owner B's canteen URL...
      .patch(`/api/canteens/${canteenB_Id}`) 
      // ...but using Owner A's token!
      .set('Authorization', `Bearer ${ownerAToken}`) 
      .send({
        name: "HACKED BY OWNER A"
      });

    // We EXPECT the backend to realize the IDs don't match and throw a 403 Forbidden error
    expect(response.statusCode).toBe(403); 
  });
});