const express = require('express');
const ordersController = require('../controllers/ordersController');
const userController = require('../controllers/userController');

const router = express.Router();

// All routes require a login token
router.use(userController.protect);

// ------------------------------------
// Student Endpoints
// ------------------------------------
router.post('/place', ordersController.createOrder);
router.get('/my-active-orders', ordersController.getStudentOrders);
router.get('/my-history', ordersController.getStudentHistory); 
router.patch('/:id/cancel', ordersController.cancelOrder); // 👈 ADD THIS LINE

// ------------------------------------
// Owner Endpoints
// ------------------------------------
router.get('/my-orders', ordersController.getOwnerOrders);
router.patch('/update-status', ordersController.updateOrderStatus);

module.exports = router;