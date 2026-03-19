const express = require('express');
const debtController = require('../controllers/debtController');

const router = express.Router();

// When React sends a POST request to /api/debts/:id/pay, trigger payOffline
router.post('/:id/pay', debtController.payOffline);

// When React sends a POST request to /api/debts/:id/notify, trigger notifyStudent
router.post('/:id/notify', debtController.notifyStudent);

module.exports = router;