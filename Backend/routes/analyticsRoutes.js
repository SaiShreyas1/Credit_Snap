const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const userController = require('../controllers/userController');

const router = express.Router();

// ==========================================
// ROUTER MIDDLEWARE
// ==========================================

// Protect all analytics routes: User must be authenticated with a valid JWT.
// This securely populates 'req.user' so controllers know exactly who is requesting data.
router.use(userController.protect);

// ==========================================
// ANALYTICS ROUTES
// ==========================================

/**
 * @route   GET /api/analytics/owner
 * @desc    Fetch comprehensive dashboard analytics (sales, pending orders, etc.) for the logged-in canteen owner.
 * @access  Private
 */
router.get('/owner', analyticsController.getOwnerAnalytics);

module.exports = router;