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
    const { isOpen } = req.body;

    const updatedCanteen = await Canteen.findByIdAndUpdate(
      canteenId,
      { isOpen },
      { new: true }
    );

    if (!updatedCanteen) {
      return res.status(404).json({
        status: 'fail',
        message: 'Canteen not found'
      });
    }

    const io = req.app.get('io');
    io.emit('canteen-status-updated', {
      canteenId: updatedCanteen._id.toString(),
      isOpen: updatedCanteen.isOpen,
    });

    res.status(200).json({
      status: 'success',
      data: { canteen: updatedCanteen }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
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
// Add a new item (Matches your Add Modal)
exports.addMenuItem = async (req, res) => {
  try {
    const { canteenId } = req.params;
    
    
    // 🔪 TRICK 1: Kill outside spaces AND squash multiple inside spaces down to one
const trimmedName = req.body.name.trim().replace(/\s+/g, ' ');

    // 🪤 TRAP 1: Let's see exactly what the server is searching for
    console.log(`\n--- 🛑 DUPLICATE CHECK TRIGGERED ---`);
    console.log(`Checking for name: "${trimmedName}"`);
    console.log(`Inside Canteen ID: ${canteenId}`);

    // The Search Query
    const existingItem = await MenuItem.findOne({
      canteenId: canteenId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
    });

    // 🪤 TRAP 2: What did the database find?
    console.log(`Database found:`, existingItem);

    // The Bouncer
    if (existingItem) {
      console.log(`🚫 BLOCKED: Duplicate found!`);
      return res.status(400).json({
        status: 'fail',
        message: `An item named "${trimmedName}" already exists in your menu!`
      });
    }

    console.log(`✅ PASSED: Creating new item...`);

    // ✅ Create the item using the safely trimmed name
    const newItem = await MenuItem.create({ 
      ...req.body, 
      name: trimmedName, // Force the clean name into the database
      canteenId: canteenId 
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`canteen:${newItem.canteenId}`).emit('menu-updated', {
        canteenId: newItem.canteenId.toString(),
      });
    }

    res.status(201).json({
      status: 'success',
      data: { menuItem: newItem }
    });
  } catch (error) {
    console.log(`❌ ERROR:`, error.message);
    res.status(400).json({ status: 'fail', message: error.message });
  }
};


// Edit an item OR toggle availability (Matches Edit Modal & Switch)
exports.updateMenuItem = async (req, res) => {
  try {
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.itemId,
      req.body,
      { new: true }
    );

    const io = req.app.get('io');
    io.to(`canteen:${updatedItem.canteenId}`).emit('menu-updated', {
      canteenId: updatedItem.canteenId.toString(),
    });

    res.status(200).json({
      status: 'success',
      data: { menuItem: updatedItem }
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};


// Delete an item (Matches your Trash2 Icon)
exports.deleteMenuItem = async (req, res) => {
  try {
    const itemToDelete = await MenuItem.findById(req.params.itemId);

    if (!itemToDelete) {
      return res.status(404).json({
        status: 'fail',
        message: 'Menu item not found'
      });
    }

    await MenuItem.findByIdAndDelete(req.params.itemId);

    const io = req.app.get('io');
    io.to(`canteen:${itemToDelete.canteenId}`).emit('menu-updated', {
      canteenId: itemToDelete.canteenId.toString(),
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
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

// Update default limit for the owner's canteen and apply to all students
exports.updateDefaultLimit = async (req, res) => {
  try {
    const { defaultLimit } = req.body;
    const numLimit = Number(defaultLimit);

    if (isNaN(numLimit) || numLimit < 0) {
      return res.status(400).json({ status: 'fail', message: 'Please provide a valid numeric limit.' });
    }

    const canteen = await Canteen.findOne({ ownerId: req.user._id });
    if (!canteen) {
      return res.status(404).json({ status: 'fail', message: 'No canteen found for this owner' });
    }

    // NEW VALIDATION: Check if any student currently owes more than the new limit
    const Debt = require('../models/debtModel');
    const maxDebtDoc = await Debt.findOne({ canteen: canteen._id }).sort('-amountOwed');
    
    if (maxDebtDoc && maxDebtDoc.amountOwed > numLimit) {
      return res.status(400).json({ 
        status: 'fail', 
        message: `Cannot set default limit to ₹${numLimit}. At least one student currently owes ₹${maxDebtDoc.amountOwed}.` 
      });
    }

    // Update canteen's setting
    canteen.defaultLimit = numLimit;
    await canteen.save();

    // Mass-update all existing debts for this canteen
    await Debt.updateMany({ canteen: canteen._id }, { limit: numLimit });

    // Tell UI to refresh
    const io = req.app.get('io');
    if (io) {
      io.to(`canteen:${canteen._id}`).emit('debt-updated');
    }

    res.status(200).json({
      status: 'success',
      message: `Default limit updated to ₹${numLimit} for all students.`,
      data: { canteen }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
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
  data: { canteens: formattedCanteens }
  });

  } catch (err) {
    res.status(404).json({ status: 'fail', message: err.message });
  }
};
