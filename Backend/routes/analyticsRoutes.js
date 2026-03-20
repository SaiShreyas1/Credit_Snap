const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const userController = require('../controllers/userController');

const router = express.Router();

// 1. GLOBAL PROTECTION: Ensure only logged-in users can access ANY analytics route
// This populates req.user so the controller knows which owner is asking for data
router.use(userController.protect);

// 2. DEFINED ROUTES
// GET /api/analytics/owner
router.get('/owner', analyticsController.getOwnerAnalytics);

module.exports = router;