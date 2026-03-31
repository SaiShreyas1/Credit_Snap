const express = require('express');
const canteenController = require('../controllers/canteenController');
const userController = require('../controllers/userController');

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

/**
 * @route   GET /api/canteens
 * @desc    Fetch a list of all registered canteens on the platform.
 * @access  Public
 */
router.get('/', canteenController.getAllCanteens);

/**
 * @route   GET /api/canteens/:canteenId/menu
 * @desc    Fetch all available menu items for a specific canteen.
 * @access  Public
 */
router.get('/:canteenId/menu', canteenController.getMenu);

// ==========================================
// ROUTER MIDDLEWARE (Authentication Required)
// ==========================================

// Protect all routes below this point. 
// Requires a valid JWT in the Authorization header.
router.use(userController.protect);

// ==========================================
// PROTECTED ROUTES (Canteen Management)
// ==========================================

/**
 * @route   GET /api/canteens/my
 * @desc    Fetch the canteen profile belonging to the logged-in owner.
 * @access  Private (Owner)
 */
router.get('/my', canteenController.getMyCanteen);

/**
 * @route   POST /api/canteens
 * @desc    Manually create a new canteen profile.
 * @access  Private (Owner)
 */
router.post('/', canteenController.createCanteen);

/**
 * @route   PATCH /api/canteens/my/default-limit
 * @desc    Update the default global Khata credit limit for the owner's canteen.
 * @access  Private (Owner)
 */
router.patch('/my/default-limit', canteenController.updateDefaultLimit);

/**
 * @route   PUT /api/canteens/:canteenId/status
 * @desc    Toggle the open/closed operational status of the canteen.
 * @access  Private (Owner)
 */
router.put('/:canteenId/status', canteenController.updateCanteenStatus);

// ==========================================
// PROTECTED ROUTES (Menu Management)
// ==========================================

/**
 * @route   POST /api/canteens/:canteenId/menu
 * @desc    Add a new food/beverage item to the canteen's menu.
 * @access  Private (Owner)
 */
router.post('/:canteenId/menu', canteenController.addMenuItem);

/**
 * @route   PUT /api/canteens/menu/:itemId
 * @desc    Update the details (price, availability, name) of a specific menu item.
 * @access  Private (Owner)
 */
router.put('/menu/:itemId', canteenController.updateMenuItem);

/**
 * @route   DELETE /api/canteens/menu/:itemId
 * @desc    Permanently remove a menu item from the canteen.
 * @access  Private (Owner)
 */
router.delete('/menu/:itemId', canteenController.deleteMenuItem);

module.exports = router;