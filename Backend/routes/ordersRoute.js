const express = require('express');
const ordersController = require('../controllers/ordersController');
const userController = require('../controllers/userController');

const router = express.Router();

// ==========================================
// ROUTER MIDDLEWARE
// ==========================================

// Protect all order routes: User must be authenticated with a valid JWT.
router.use(userController.protect);

// ==========================================
// STUDENT ROUTES
// ==========================================

/**
 * @route   POST /api/orders/place
 * @desc    Create a new food order at a specific canteen.
 * @access  Private (Student)
 */
router.post('/place', ordersController.createOrder);

/**
 * @route   GET /api/orders/my-active-orders
 * @desc    Fetch all currently active (pending/accepted) orders for the logged-in student.
 * @access  Private (Student)
 */
router.get('/my-active-orders', ordersController.getStudentOrders);

/**
 * @route   GET /api/orders/my-history
 * @desc    Fetch the complete chronological order history for the logged-in student.
 * @access  Private (Student)
 */
router.get('/my-history', ordersController.getStudentHistory);

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancel an existing pending order before it is accepted by the canteen owner.
 * @access  Private (Student)
 */
router.patch('/:id/cancel', ordersController.cancelOrder);

// ==========================================
// CANTEEN OWNER ROUTES
// ==========================================

/**
 * @route   GET /api/orders/my-orders
 * @desc    Fetch all active orders placed at the logged-in owner's canteen.
 * @access  Private (Owner)
 */
router.get('/my-orders', ordersController.getOwnerOrders);

/**
 * @route   PATCH /api/orders/update-status
 * @desc    Update the progression status (e.g., pending -> accepted -> rejected) of an order.
 * @access  Private (Owner)
 */
router.patch('/update-status', ordersController.updateOrderStatus);

/**
 * @route   PATCH /api/orders/clear
 * @desc    Clear/archive completed or cancelled orders from the active dashboard view.
 * @access  Private (Owner)
 */
router.patch('/clear', ordersController.clearOrders);

module.exports = router;