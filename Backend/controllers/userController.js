const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// 🛠️ HELPER FUNCTION: Generates the Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d' 
  });
};

// 🚀 1. SIGNUP LOGIC (WITH DEBUG LOGS)
exports.signup = async (req, res) => {
  try {
    console.log("Checkpoint 1: Request received from Thunder Client!");
    
    console.log("Checkpoint 2: Attempting to save user to MongoDB...");
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      rollNo: req.body.rollNo,
    });
    console.log("Checkpoint 3: User successfully saved to Database!");

    const token = signToken(newUser._id);
    console.log("Checkpoint 4: Token generated!");

    // 🔒 SECURITY FIX: Hide the password from the final output
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      token,
      data: { user: newUser }
    });
  } catch (error) {
    console.log("❌ ERROR CAUGHT:", error);
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 🚀 2. LOGIN LOGIC
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password exist in the request
    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Please provide email and password!' });
    }

    // 2. Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
    }

    // 3. If everything is ok, send token to client
    const token = signToken(user._id);
    
    // 🔒 SECURITY FIX: Hide the password from the final output
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      token,
      data: { user }
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};