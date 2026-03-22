const User = require('../models/userModel');
const Canteen = require('../models/canteenModel');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/email');

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

    const { name, email, password, role, rollNo, phoneNo, hallNo, roomNo, canteenName, timings } = req.body;

    // --- Check for existing users to return friendly error messages ---
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      if (!existingEmail.isVerified) {
        await User.findByIdAndDelete(existingEmail._id);
        if (existingEmail.role === 'owner') await Canteen.findOneAndDelete({ ownerId: existingEmail._id });
      } else {
        return res.status(400).json({ status: 'fail', message: 'An account with this email already exists!' });
      }
    }

    const existingPhone = await User.findOne({ phoneNo });
    if (existingPhone) {
      if (!existingPhone.isVerified) {
        await User.findByIdAndDelete(existingPhone._id);
        if (existingPhone.role === 'owner') await Canteen.findOneAndDelete({ ownerId: existingPhone._id });
      } else {
        return res.status(400).json({ status: 'fail', message: 'An account with this phone number already exists!' });
      }
    }

    if (role === 'student' && rollNo) {
      const existingRollNo = await User.findOne({ rollNo });
      if (existingRollNo) {
        if (!existingRollNo.isVerified) {
          await User.findByIdAndDelete(existingRollNo._id);
        } else {
          return res.status(400).json({ status: 'fail', message: 'An account with this roll number already exists!' });
        }
      }
    }

    // ------------------------------------------------------------------

    console.log("Checkpoint 2: Attempting to save user to MongoDB...");
    // Generate a random token for email verification
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = await User.create({
      name: name,
      email: email,
      phoneNo: phoneNo,
      password: password,
      role: role,
      rollNo: rollNo,
      hallNo: hallNo,
      roomNo: roomNo,
      emailVerificationToken: role === 'owner' ? undefined : verificationToken,
      isVerified: role === 'owner' ? true : false
    });
    console.log("Checkpoint 3: User successfully saved to Database!");

    // 🏆 Auto-create a Canteen if the user is an owner!
    if (newUser.role === 'owner') {
      const finalCanteenName = canteenName || `${newUser.name}'s Canteen`;
      await Canteen.create({
        name: finalCanteenName,
        ownerId: newUser._id,
        timings: timings || '4:00 PM - 4:00 AM',
        isOpen: false
      });
      console.log("Checkpoint 3.5: Canteen auto-created for new owner!");

      // 📧 Send Welcome Email for Owners
      const loginURL = `http://localhost:5173/`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #eab308;">Welcome to CreditSnap! 🏪</h2>
          <p>Hello <strong>${newUser.name}</strong>,</p>
          <p>Your Canteen Owner account for <strong>${finalCanteenName}</strong> has been successfully created!</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
            <p style="margin: 0 0 5px 0;">Email: <strong>${newUser.email}</strong></p>
            <p style="margin: 0;">Password: <strong>${password}</strong></p>
          </div>

          <p style="color: #ef4444; font-weight: bold;">⚠️ IMPORTANT: Please log in and change your password immediately for security purposes.</p>
          
          <div style="margin: 30px 0;">
            <a href="${loginURL}" style="background-color: #eab308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log In Here</a>
          </div>
          <p style="font-size: 0.9em; color: #666;">Once logged in, click your profile icon in the top right, select "Canteen Settings", and click the "Change Password" button on the card.</p>
        </div>
      `;

      const message = `Welcome to CreditSnap!\nYour Canteen Owner account has been created.\nEmail: ${newUser.email}\nPassword: ${password}\n\nIMPORTANT: Please log in at ${loginURL} and change your password immediately.`;

      try {
        await sendEmail({
          email: newUser.email,
          subject: 'CreditSnap - Your Owner Account is Ready!',
          message: message,
          html: html
        });
        
        return res.status(201).json({
          status: 'success',
          message: 'Signup successful! Welcome email sent to the owner with their credentials.'
        });
      } catch (err) {
        console.log("Owner Welcome Email Error:", err);
        return res.status(201).json({
          status: 'success',
          message: 'Signup successful, but there was an error sending the welcome email to the owner.'
        });
      }
    }

    // Instead of logging in instantly, we send them an email!
    const verifyURL = `http://localhost:5173/verify-email/${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #f97316;">Welcome to CreditSnap! 🎓</h2>
        <p>We are excited to have you on board. Please verify your email address to complete your registration by clicking the button below:</p>
        <div style="margin: 30px 0;">
          <a href="${verifyURL}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 0.9em; color: #666;">If the button doesn't work, you can copy and paste this link tightly into your browser (make sure there are no spaces!):</p>
        <p style="word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace;">${verifyURL}</p>
        <p style="font-size: 0.8em; color: #999;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    const message = `Welcome to CreditSnap! Please verify your email address to complete your registration by clicking here: ${verifyURL}\nIf you didn't request this, please ignore this email.`;

    try {
      await sendEmail({
        email: newUser.email,
        subject: 'CreditSnap - Verify Your Email Address',
        message: message,
        html: html
      });

      res.status(201).json({
        status: 'success',
        message: 'Signup successful! Please check your email to verify your account.'
      });
    } catch (err) {
      console.log("Email error:", err);
      // Delete user if email fails to send, so they can try again
      await User.findByIdAndDelete(newUser._id);
      if (newUser.role === 'owner') {
        await Canteen.findOneAndDelete({ ownerId: newUser._id });
      }
      return res.status(500).json({ status: 'error', message: 'There was an error sending the email. Try again later!' });
    }
  } catch (error) {
    console.log("❌ ERROR CAUGHT:", error);
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 💌 1.5 VERIFY EMAIL LOGIC
exports.verifyEmail = async (req, res) => {
  try {
    // 1. Get user based on token
    const token = req.params.token;
    const user = await User.findOne({ emailVerificationToken: token });

    // 2. If token is invalid
    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired' });
    }

    // 3. Mark user as verified
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // 4. Log the user in, send JWT
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

    // 3. Check if the user's email is verified!
    if (!user.isVerified) {
      return res.status(401).json({ status: 'fail', message: 'Please verify your email address to log in!' });
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
exports.getMyProfile = async (req, res) => {
  try {
    const user = req.user;
    let canteen = null;

    if (user.role === 'owner') {
      canteen = await Canteen.findOne({ ownerId: user._id });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        canteen
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// 👤 4.5 UPDATE MY PROFILE LOGIC
exports.updateMyProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // Update User record fields matching the Edit Profile form
    if (req.body.adminName) user.name = req.body.adminName;
    if (req.body.name) user.name = req.body.name; // Student profile uses 'name'
    if (req.body.phone) user.phoneNo = req.body.phone;
    if (req.body.hallNo) user.hallNo = req.body.hallNo;
    if (req.body.roomNo) user.roomNo = req.body.roomNo;
    
    // Save to trigger validation checks
    await user.save({ validateBeforeSave: false });

    // Update Canteen record for Owners
    let canteen = null;
    if (user.role === 'owner') {
      canteen = await Canteen.findOne({ ownerId: user._id });
      if (canteen) {
        if (req.body.canteenName) canteen.name = req.body.canteenName;
        if (req.body.timings) canteen.timings = req.body.timings;
        await canteen.save();
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully!',
      data: { user, canteen }
    });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 🔑 5. FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    // 1. Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'There is no user with that email address.' });
    }

    // 2. Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3. Send it to user's email
    const resetURL = `http://localhost:5173/reset-password/${resetToken}?role=${user.role}`;

    const message = `Forgot your password? Click here to set a new one: ${resetURL}\nIf you didn't forget your password, please ignore this email!`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #f97316;">Password Reset 🔑</h2>
        <p>Forgot your password? Click the button below to set a new one:</p>
        <div style="margin: 30px 0;">
          <a href="${resetURL}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 0.9em; color: #666;">If the button doesn't work, you can copy and paste this link tightly into your browser (make sure there are no spaces!):</p>
        <p style="word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace;">${resetURL}</p>
        <p style="font-size: 0.8em; color: #999;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'CreditSnap - Your password reset token (valid for 10 min)',
        message: message,
        html: html
      });

      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ status: 'error', message: 'There was an error sending the email. Try again later!' });
    }
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// 🔄 6. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    // 1. Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() } // Token must not be expired!
    });

    // 2. If token hasn't expired, and there is a user, set the new password
    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired' });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Save the user (this will run the 'pre save' hook to encrypt the new password!)
    await user.save();

    // 3. Log the user in, send JWT
    const token = signToken(user._id);
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

// 🛡️ 7. UPDATE PASSWORD (AUTHENTICATED)
exports.updatePassword = async (req, res) => {
  try {
    // 1. Get user from collection based on req.user
    const user = await User.findById(req.user._id).select('+password');

    // 2. Check if the POSTed current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Your current password is wrong!' });
    }

    // 3. If correct, update password to the new password
    user.password = req.body.newPassword;

    // Save the user (this will run the 'pre save' hook to encrypt the new password cleanly!)
    await user.save();

    // 4. Log the user in with the fresh password, send JWT
    const token = signToken(user._id);
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