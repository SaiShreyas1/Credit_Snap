const express = require('express');
const canteenController = require('../controllers/canteenController');
const userController = require('../controllers/userController');
const router = express.Router();

// Public/read routes
router.get('/', canteenController.getAllCanteens);
router.get('/:canteenId/menu', canteenController.getMenu);

// Protected routes
router.use(userController.protect);
router.get('/my', canteenController.getMyCanteen);
router.patch('/my/default-limit', canteenController.updateDefaultLimit);
router.post('/', canteenController.createCanteen);
router.put('/:canteenId/status', canteenController.updateCanteenStatus);
router.post('/:canteenId/menu', canteenController.addMenuItem);
router.put('/menu/:itemId', canteenController.updateMenuItem);
router.delete('/menu/:itemId', canteenController.deleteMenuItem);

module.exports = router;
