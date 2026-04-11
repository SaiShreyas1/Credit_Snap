const express = require('express');
const userController = require('../controllers/userController');
const { authLimiter } = require('../middleware/rateLimiter');


const router = express.Router();

// ==========================================
// PUBLIC ROUTES (Authentication & Recovery)
// ==========================================

/**
 * @route   POST /api/users/signup
 * @desc    Register a new student.
 * @access  Public
 */
router.post('/signup', authLimiter, userController.signup);

/**
 * @route   POST /api/users/login
 * @desc    Authenticate a user and return a JWT.
 * @access  Public
 */
router.post('/login', authLimiter, userController.login);

/**
 * @route   GET /api/users/verifyEmail/:token
 * @desc    Verify a new user's email address using the token sent to their inbox.
 * @access  Public
 */
router.get('/verifyEmail/:token', userController.verifyEmail);

/**
 * @route   POST /api/users/forgotPassword
 * @desc    Generate a password reset token and send it via email.
 * @access  Public
 */
router.post('/forgotPassword', authLimiter, userController.forgotPassword);

/**
 * @route   PATCH /api/users/resetPassword/:token
 * @desc    Reset a user's password using a valid reset token.
 * @access  Public
 */
router.patch('/resetPassword/:token', authLimiter, userController.resetPassword);

// ==========================================
// ROUTER MIDDLEWARE (Authentication Required)
// ==========================================

// Protect all routes below this point. 
// Requires a valid JWT in the Authorization header.
router.use(userController.protect);

// ==========================================
// PROTECTED ROUTES (Profile & Security)
// ==========================================

/**
 * @route   GET /api/users/my-profile
 * @desc    Fetch the logged-in user's profile data (and canteen data if owner).
 * @access  Private
 */
router.get('/my-profile', userController.getMyProfile);

/**
 * @route   PATCH /api/users/update-my-profile
 * @desc    Update the logged-in user's profile information.
 * @access  Private
 */
router.patch('/update-my-profile', userController.updateMyProfile);

/**
 * @route   PATCH /api/users/updatePassword
 * @desc    Update the password for an already authenticated user.
 * @access  Private
 */
router.patch('/updatePassword', userController.updatePassword);

module.exports = router;
