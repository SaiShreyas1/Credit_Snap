const express = require('express');
const debtController = require('../controllers/debtController');
const userController = require('../controllers/userController');

const router = express.Router();

// ==========================================
// ROUTER MIDDLEWARE
// ==========================================

// Protect all debt routes: User must be authenticated with a valid JWT.
router.use(userController.protect);

// ==========================================
// STUDENT ROUTES
// ==========================================

/**
 * @route   GET /api/debts/my-debts
 * @desc    Fetch all active Khata debts across various canteens for the logged-in student.
 * @access  Private (Student)
 */
router.get('/my-debts', debtController.getMyDebts);

// ==========================================
// CANTEEN OWNER ROUTES
// ==========================================

/**
 * @route   GET /api/debts/active
 * @desc    Fetch all active student debts associated with the logged-in owner's canteen.
 * @access  Private (Owner)
 */
router.get('/active', debtController.getActiveDebts);

/**
 * @route   POST /api/debts/:id/pay
 * @desc    Process a manual/offline cash payment to reduce or clear a student's debt.
 * @access  Private (Owner)
 */
router.post('/:id/pay', debtController.payOffline);

/**
 * @route   POST /api/debts/:id/notify
 * @desc    Send a payment reminder notification to a student with an outstanding balance.
 * @access  Private (Owner)
 */
router.post('/:id/notify', debtController.notifyStudent);

/**
 * @route   PATCH /api/debts/:id/limit
 * @desc    Override the default credit limit for a specific student at the owner's canteen.
 * @access  Private (Owner)
 */
router.patch('/:id/limit', debtController.updateDebtLimit);

module.exports = router;