const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Public Routes (No token needed)
router.post('/signup', userController.signup);
router.post('/login', userController.login);

// Protected Routes (Token absolutely required!)
// Notice how it runs through the 'protect' bouncer first
router.get('/my-profile', userController.protect, userController.getMyProfile);

module.exports = router;