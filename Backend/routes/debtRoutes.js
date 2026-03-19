const express = require('express');
const debtController = require('../controllers/debtController');
const userController = require('../controllers/userController'); // <-- Added for security

const router = express.Router();

// 🛡️ SECURITY: Require a valid login token for ALL debt routes
router.use(userController.protect);

// 📡 THE INTEGRATION ROUTE: React calls this to get the cards
router.get('/active', debtController.getActiveDebts);

// When React sends a POST request to /api/debts/:id/pay, trigger payOffline
router.post('/:id/pay', debtController.payOffline);

// When React sends a POST request to /api/debts/:id/notify, trigger notifyStudent
router.post('/:id/notify', debtController.notifyStudent);

module.exports = router;