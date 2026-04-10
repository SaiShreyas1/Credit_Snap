const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/email');

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Sanitizes the canteen object before sending it to the client.
 * Hides the raw encrypted Razorpay secret and returns a boolean flag instead.
 */
const serializeOwnerCanteen = (canteen) => {
  if (!canteen) return null;

  const serialized = canteen.toObject ? canteen.toObject() : { ...canteen };
  serialized.razorpayMerchantSecretConfigured = Boolean(canteen.razorpayMerchantKeySecretEncrypted);
  delete serialized.razorpayMerchantKeySecretEncrypted;

  return serialized;
};

/**
 * Generates a JSON Web Token (JWT) for authentication.
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// ==========================================
// AUTHENTICATION CONTROLLERS
// ==========================================

/**
 * @desc    Register a new student user
 * @route   POST /api/users/signup
 * @access  Public
 */
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, rollNo, phoneNo, hallNo, roomNo } = req.body;
    const signupRole = 'student';

    if (role && role !== signupRole) {
      return res.status(403).json({
        status: 'fail',
        message: 'Canteen owner accounts cannot be created through public signup.'
      });
    }

    if (!email || !email.endsWith('@iitk.ac.in')) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please sign up with a valid @iitk.ac.in email address.'
      });
    }

    if (phoneNo && !/^\d{10}$/.test(phoneNo)) {
      return res.status(400).json({ status: 'fail', message: 'Mobile number must be exactly 10 digits.' });
    }
    if (name && !/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({ status: 'fail', message: 'Name can only contain alphabets and spaces.' });
    }
    if (rollNo && !/^[a-zA-Z0-9]+$/.test(rollNo)) {
      return res.status(400).json({ status: 'fail', message: 'Roll number must be alphanumeric.' });
    }
    if (roomNo && !/^[a-zA-Z0-9-]+$/.test(roomNo)) {
      return res.status(400).json({ status: 'fail', message: 'Room number must only contain alphanumeric characters and hyphens.' });
    }

    // 1. Cleanup unverified ghost accounts or block existing active accounts
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      if (!existingEmail.isVerified) {
        await User.findByIdAndDelete(existingEmail._id);
        if (existingEmail.role === 'owner') await Canteen.findOneAndDelete({ ownerId: existingEmail._id });
      } else {
        return res.status(400).json({ status: 'fail', message: 'An account with this email already exists.' });
      }
    }

    const existingPhone = await User.findOne({ phoneNo });
    if (existingPhone) {
      if (!existingPhone.isVerified) {
        await User.findByIdAndDelete(existingPhone._id);
        if (existingPhone.role === 'owner') await Canteen.findOneAndDelete({ ownerId: existingPhone._id });
      } else {
        return res.status(400).json({ status: 'fail', message: 'An account with this phone number already exists.' });
      }
    }

    if (rollNo) {
      const existingRollNo = await User.findOne({ rollNo });
      if (existingRollNo) {
        if (!existingRollNo.isVerified) {
          await User.findByIdAndDelete(existingRollNo._id);
        } else {
          return res.status(400).json({ status: 'fail', message: 'An account with this roll number already exists.Contact the Admins if you think this is a mistake.' });
        }
      }
    }

    // 2. Generate email verification token for students
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = await User.create({
      name,
      email,
      phoneNo,
      password,
      role: signupRole,
      rollNo,
      hallNo,
      roomNo,
      emailVerificationToken: verificationToken,
      isVerified: false
    });

    
    // 3. Send verification email for student signup
    const frontendBaseUrl = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyURL = `${frontendBaseUrl}/verify-email/${verificationToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #f97316;">Welcome to Credit Snap!</h2>
        <p>Please verify your email address to complete your registration by clicking the button below:</p>
        <div style="margin: 30px 0;">
          <a href="${verifyURL}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 0.9em; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace;">${verifyURL}</p>
      </div>
    `;

    try {
      await sendEmail({
        email: newUser.email,
        subject: 'Credit Snap - Verify Your Email Address',
        message: `Please verify your email address by clicking here: ${verifyURL}`,
        html
      });

      res.status(201).json({
        status: 'success',
        message: 'Signup successful. Please check your email to verify your account.'
      });
    } catch (err) {
      console.error("[Auth Controller] Verification Email Error:", err);
      // Rollback database creation if email fails
      await User.findByIdAndDelete(newUser._id);
      
      return res.status(500).json({ status: 'error', message: 'Error sending verification email. Please try again later.' });
    }
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Verify student email via token
 * @route   GET /api/users/verify-email/:token
 * @access  Public
 */
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ emailVerificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired.' });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    const jwtToken = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token: jwtToken,
      data: { user }
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Authenticate user and assign token
 * @route   POST /api/users/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ status: 'fail', message: `Access denied. Please select the correct role tab.` });
    }

    if (!user.isVerified) {
      return res.status(401).json({ status: 'fail', message: 'Please verify your email address to log in.' });
    }

    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      canteenId: user.role === 'owner' ? (await Canteen.findOne({ ownerId: user._id }))._id : null,
      data: { user }
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Middleware to protect routes (Verifies JWT)
 * @access  Private
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};

// ==========================================
// PROFILE MANAGEMENT
// ==========================================

/**
 * @desc    Get the logged-in user's profile and canteen details
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = req.user;
    let canteen = null;

    if (user.role === 'owner') {
      canteen = await Canteen.findOne({ ownerId: user._id }).select('+razorpayMerchantKeySecretEncrypted');
    }

    let serializedUser = user.toObject ? user.toObject() : { ...user };
    if (serializedUser.totalDebt !== undefined) {
      serializedUser.totalDebt = Math.round(serializedUser.totalDebt * 100) / 100;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: serializedUser,
        canteen: serializeOwnerCanteen(canteen)
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Update the logged-in user's profile and canteen details
 * @route   PATCH /api/users/profile
 * @access  Private
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if name is explicitly set to empty
    const providedName = req.body.adminName !== undefined ? req.body.adminName : req.body.name;
    if (providedName !== undefined) {
      if (providedName.trim() === '') {
        return res.status(400).json({ status: 'fail', message: 'name cannot be empty' });
      }
      if (!/^[a-zA-Z\s]+$/.test(providedName)) {
        return res.status(400).json({ status: 'fail', message: 'Name can only contain alphabets and spaces.' });
      }
    }

    if (req.body.rollNo && !/^[a-zA-Z0-9]+$/.test(req.body.rollNo)) {
      return res.status(400).json({ status: 'fail', message: 'Roll number must be alphanumeric.' });
    }
    if (req.body.roomNo && !/^[a-zA-Z0-9-]+$/.test(req.body.roomNo)) {
      return res.status(400).json({ status: 'fail', message: 'Room number must only contain alphanumeric characters and hyphens.' });
    }

    // Check if phone number has exactly 10 digits
    if (req.body.phone && !/^\d{10}$/.test(req.body.phone)) {
      return res.status(400).json({ status: 'fail', message: 'number of digits in phone number is not equal to 10' });
    }

    // Check for duplicate phone number from other users
    if (req.body.phone && req.body.phone !== user.phoneNo) {
      const existingPhoneUser = await User.findOne({ phoneNo: req.body.phone, _id: { $ne: user._id } });
      if (existingPhoneUser) {
        return res.status(400).json({ status: 'fail', message: 'mobile number already exists' });
      }
    }
    
    if (req.body.adminName) user.name = req.body.adminName;
    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phoneNo = req.body.phone;
    if (req.body.hallNo) user.hallNo = req.body.hallNo;
    if (req.body.roomNo) user.roomNo = req.body.roomNo;
    if (req.body.profilePhoto !== undefined) {
      const photo = req.body.profilePhoto;

      if (photo === '' || photo === null) {
        user.profilePhoto = '';
      } else {
        // 1. Must be a base64 data URI
        const dataUriRegex = /^data:(image\/(jpeg|png|webp|gif));base64,/;
        if (!dataUriRegex.test(photo)) {
          return res.status(400).json({
            status: 'fail',
            message: 'Profile photo must be a valid image (jpeg, png, webp, or gif).'
          });
        }

        // 2. Decode and check actual byte size (limit: 500 KB)
        const MAX_BYTES = 500 * 1024; // 500 KB
        const base64Data = photo.split(',')[1] || '';
        // Base64 encodes 3 bytes into 4 chars, so decoded size ≈ base64Length * 0.75
        const approxBytes = Math.ceil((base64Data.length * 3) / 4);
        if (approxBytes > MAX_BYTES) {
          return res.status(400).json({
            status: 'fail',
            message: `Profile photo exceeds the 500 KB size limit. Please compress the image and try again.`
          });
        }

        user.profilePhoto = photo;
      }
    }
    
    await user.save({ validateBeforeSave: false });

    let canteen = null;
    if (user.role === 'owner') {
      canteen = await Canteen.findOne({ ownerId: user._id }).select('+razorpayMerchantKeySecretEncrypted');
      
      if (canteen) {
        if (req.body.canteenName) canteen.name = req.body.canteenName;
        if (req.body.timings) canteen.timings = req.body.timings;
        if (Object.prototype.hasOwnProperty.call(req.body, 'razorpayMerchantKeyId')) {
          const keyId = (req.body.razorpayMerchantKeyId || '').trim();
          canteen.razorpayMerchantKeyId = keyId || canteen.razorpayMerchantKeyId;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'razorpayMerchantKeySecret')) {
          canteen.setRazorpayMerchantKeySecret(req.body.razorpayMerchantKeySecret);
        }
        await canteen.save();

        const io = req.app.get('io');
        if (io) {
          io.emit('canteen-details-updated', {
            canteenId: canteen._id.toString(),
            name: canteen.name,
            timings: canteen.timings,
            isOpen: canteen.isOpen
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully.',
      data: { user, canteen: serializeOwnerCanteen(canteen) }
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// ==========================================
// PASSWORD MANAGEMENT
// ==========================================

/**
 * @desc    Generate password reset token and send email
 * @route   POST /api/users/forgotPassword
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'There is no user with that email address.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const frontendBaseUrl = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetURL = `${frontendBaseUrl}/reset-password/${resetToken}?role=${user.role}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #f97316;">Password Reset</h2>
        <p>Forgot your password? Click the button below to set a new one:</p>
        <div style="margin: 30px 0;">
          <a href="${resetURL}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 0.9em; color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Credit Snap - Password Reset Token (Valid for 10 min)',
        message: `Click here to reset your password: ${resetURL}`,
        html
      });

      res.status(200).json({ status: 'success', message: 'Token sent to email!' });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("[Auth Controller] Password Reset Email Error:", err);
      return res.status(500).json({ status: 'error', message: 'Error sending password reset email.' });
    }
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Reset user password using token
 * @route   PATCH /api/users/resetPassword/:token
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired.' });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({ status: 'success', token, data: { user } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * @desc    Update password for an authenticated user
 * @route   PATCH /api/users/updateMyPassword
 * @access  Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Your current password is incorrect.' });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({ status: 'success', token, data: { user } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};
