const express = require('express');
const canteenController = require('../controllers/canteenController');
const userController = require('../controllers/userController');
const router = express.Router();
router.use(userController.protect);
// 🏪 Canteen Operations
router.get('/', canteenController.getAllCanteens); // Get all canteens for Students
router.get('/my', canteenController.getMyCanteen);
router.post('/', canteenController.createCanteen);  
router.put('/:canteenId/status', canteenController.updateCanteenStatus); // For the Open/Close switch

// 🍔 Menu Operations
router.get('/:canteenId/menu', canteenController.getMenu);       // Load the menu
router.post('/:canteenId/menu', canteenController.addMenuItem);  // Add new food

// Notice these use /menu/:itemId because we are targeting a specific Samosa or Dosa!
router.put('/menu/:itemId', canteenController.updateMenuItem);   // Edit price/name/availability
router.delete('/menu/:itemId', canteenController.deleteMenuItem);// Delete food

module.exports = router;