const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Public Routes (No token needed)
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/verifyEmail/:token', userController.verifyEmail);
router.post('/forgotPassword', userController.forgotPassword);
router.patch('/resetPassword/:token', userController.resetPassword);

// Protect all routes after this middleware
// Meaning you HAVE to be logged in to use getting profile, updating password, etc.
router.get('/my-profile', userController.protect, userController.getMyProfile);
router.patch('/update-my-profile', userController.protect, userController.updateMyProfile);
router.patch('/updatePassword', userController.protect, userController.updatePassword);

module.exports = router;