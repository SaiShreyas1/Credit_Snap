const Canteen = require('../models/canteenModel');
const MenuItem = require('../models/menuItemModel');
const User = require('../models/userModel');

// ==========================================
// CANTEEN SETTINGS (For the Dashboard)
// ==========================================

// Create a Canteen
exports.createCanteen = async (req, res) => {
  try {
    const newCanteen = await Canteen.create(req.body);
    res.status(201).json({ status: 'success', data: { canteen: newCanteen } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// Toggle Canteen Open/Closed (Matches your Dashboard Switch)
exports.updateCanteenStatus = async (req, res) => {
  try {
    const { canteenId } = req.params;
    const { isOpen } = req.body; // Expects true or false from React
    const updatedCanteen = await Canteen.findByIdAndUpdate(canteenId, { isOpen }, { new: true });
    res.status(200).json({ status: 'success', data: { canteen: updatedCanteen } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// ==========================================
// MENU MANAGEMENT (For the OwnerEditMenu page)
// ==========================================

// Get the full menu for a specific canteen
exports.getMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find({ canteenId: req.params.canteenId });
    res.status(200).json({ status: 'success', results: menu.length, data: { menu } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// Add a new item (Matches your Add Modal)
exports.addMenuItem = async (req, res) => {
  try {
    const newItem = await MenuItem.create({ ...req.body, canteenId: req.params.canteenId });
    res.status(201).json({ status: 'success', data: { menuItem: newItem } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// Edit an item OR toggle availability (Matches Edit Modal & Switch)
exports.updateMenuItem = async (req, res) => {
  try {
    const updatedItem = await MenuItem.findByIdAndUpdate(req.params.itemId, req.body, { new: true });
    res.status(200).json({ status: 'success', data: { menuItem: updatedItem } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// Delete an item (Matches your Trash2 Icon)
exports.deleteMenuItem = async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.itemId);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};
// controllers/canteenController.js

// Get my canteen (For the Owner Dashboard)
exports.getMyCanteen = async (req, res) => {
  try {
    // Assuming `req.user` is populated by `protect` middleware
    const canteen = await Canteen.findOne({ ownerId: req.user._id });
    if (!canteen) {
      return res.status(404).json({ status: 'fail', message: 'No canteen found for this owner' });
    }
    res.status(200).json({ status: 'success', data: { canteen } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// Get all canteens
exports.getAllCanteens = async (req, res) => {
  try {
    // 🏆 FIXED: Fetch actual Canteens from db, and populate owner's name
    const canteens = await Canteen.find().populate('ownerId', 'name');
    
    // Map data to the clean format the frontend expects
    const formattedCanteens = canteens.map(c => ({
      _id: c._id, 
      name: c.name || (c.ownerId && c.ownerId.name) || "Unnamed Canteen",
      status: c.isOpen ? "Open" : "Closed",
      timings: "4:00 PM - 4:00 AM" // You can add this to the model later!
    }));

    res.status(200).json({
      status: 'success',
      data: formattedCanteens
    });
  } catch (err) {
    res.status(404).json({ status: 'fail', message: err.message });
  }
};
