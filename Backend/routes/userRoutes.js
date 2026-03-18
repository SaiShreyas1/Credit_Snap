const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Define the routes and link them to the controller functions
router.post('/signup', userController.signup);
router.post('/login', userController.login);

module.exports = router;