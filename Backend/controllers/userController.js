const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const jwt = require('jsonwebtoken');

// 🛠️ HELPER FUNCTION: Generates the Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d' 
  });
};

// 🚀 1. SIGNUP LOGIC
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

    // 🏆 FIXED: Automatically create a Canteen if the user is an owner!
    if (newUser.role === 'owner') {
      await Canteen.create({
        name: `${newUser.name}'s Canteen`,
        ownerId: newUser._id,
        isOpen: false
      });
      console.log("Checkpoint 3.5: Canteen auto-created for new owner!");
    }

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

// 🛡️ 3. THE BOUNCER: Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    // 1. Get the token from the Thunder Client "Auth" or "Headers" tab
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    // 2. Decode the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user in the database using the ID hidden inside the token
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    // 4. Attach the user data to the request so the next function can use it
    req.user = currentUser;
    next(); // Let them pass!

  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};

// 👤 4. GET MY PROFILE LOGIC
exports.getMyProfile = (req, res) => {
  // Because the 'protect' bouncer already found the user, we just send it back!
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
};