const express = require('express');
const ordersController = require('../controllers/ordersController');
const userController = require('../controllers/userController');

const router = express.Router();

// Protect all routes
router.use(userController.protect);

// Student Routes
router.post('/place', ordersController.createOrder);
router.get('/my-active-orders', ordersController.getStudentOrders);

// Owner Routes
router.get('/my-orders', ordersController.getOwnerOrders);
router.patch('/update-status', ordersController.updateOrderStatus);

module.exports = router;