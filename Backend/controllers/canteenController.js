const Canteen = require('../models/canteenModel');
const MenuItem = require('../models/menuItemModel');
const User = require('../models/userModel');
const Debt = require('../models/debtModel'); // Moved to top for optimal performance

// ==========================================
// CANTEEN DASHBOARD SETTINGS
// ==========================================

/**
 * Creates a new canteen profile.
 * @route POST /api/canteens
 */
exports.createCanteen = async (req, res) => {
  try {
    const newCanteen = await Canteen.create(req.body);
    res.status(201).json({ status: 'success', data: { canteen: newCanteen } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * Toggles the canteen's open/closed status and broadcasts to connected clients.
 * @route PATCH /api/canteens/:canteenId/status
 */
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
      return res.status(404).json({ status: 'fail', message: 'Canteen not found' });
    }

    // Broadcast status change to update frontend dashboards in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('canteen-status-updated', {
        canteenId: updatedCanteen._id.toString(),
        isOpen: updatedCanteen.isOpen,
      });
    }

    res.status(200).json({ status: 'success', data: { canteen: updatedCanteen } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * Retrieves the canteen details for the currently authenticated owner.
 * @route GET /api/canteens/my-canteen
 */
exports.getMyCanteen = async (req, res) => {
  try {
    const canteen = await Canteen.findOne({ ownerId: req.user._id });
    if (!canteen) {
      return res.status(404).json({ status: 'fail', message: 'No canteen found for this owner' });
    }
    res.status(200).json({ status: 'success', data: { canteen } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * Retrieves a list of all available canteens for the student directory.
 * @route GET /api/canteens
 */
exports.getAllCanteens = async (req, res) => {
  try {
    const canteens = await Canteen.find().populate('ownerId', 'name');
    
    // Format response to match frontend UI requirements
    const formattedCanteens = canteens.map(c => ({
      _id: c._id, 
      name: c.name || (c.ownerId && c.ownerId.name) || "Unnamed Canteen",
      status: c.isOpen ? "Open" : "Closed",
      timings: "4:00 PM - 4:00 AM" // Static fallback; consider moving to schema
    }));

    res.status(200).json({ status: 'success', data: { canteens: formattedCanteens } });
  } catch (err) {
    res.status(404).json({ status: 'fail', message: err.message });
  }
};

// ==========================================
// MENU MANAGEMENT
// ==========================================

/**
 * Retrieves the full menu for a specific canteen.
 * @route GET /api/canteens/:canteenId/menu
 */
exports.getMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find({ canteenId: req.params.canteenId });
    res.status(200).json({ status: 'success', results: menu.length, data: { menu } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * Adds a new menu item, preventing duplicate entries by name.
 * @route POST /api/canteens/:canteenId/menu
 */
exports.addMenuItem = async (req, res) => {
  try {
    const { canteenId } = req.params;
    
    // Sanitize input: Remove leading/trailing spaces and collapse multiple spaces
    const trimmedName = req.body.name.trim().replace(/\s+/g, ' ');

    // Prevent duplicate item names (case-insensitive)
    const existingItem = await MenuItem.findOne({
      canteenId: canteenId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
    });

    if (existingItem) {
      return res.status(400).json({
        status: 'fail',
        message: `An item named "${trimmedName}" already exists in your menu.`
      });
    }

    const newItem = await MenuItem.create({ 
      ...req.body, 
      name: trimmedName, 
      canteenId: canteenId 
    });

    // Notify connected clients that the menu has changed
    const io = req.app.get('io');
    if (io) {
      io.to(`canteen:${newItem.canteenId}`).emit('menu-updated', {
        canteenId: newItem.canteenId.toString(),
      });
    }

    res.status(201).json({ status: 'success', data: { menuItem: newItem } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * Edits an existing menu item or toggles its availability.
 * @route PATCH /api/canteens/menu/:itemId
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.itemId,
      req.body,
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`canteen:${updatedItem.canteenId}`).emit('menu-updated', {
        canteenId: updatedItem.canteenId.toString(),
      });
    }

    res.status(200).json({ status: 'success', data: { menuItem: updatedItem } });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

/**
 * Deletes a menu item from the database.
 * @route DELETE /api/canteens/menu/:itemId
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const itemToDelete = await MenuItem.findById(req.params.itemId);

    if (!itemToDelete) {
      return res.status(404).json({ status: 'fail', message: 'Menu item not found' });
    }

    await MenuItem.findByIdAndDelete(req.params.itemId);

    const io = req.app.get('io');
    if (io) {
      io.to(`canteen:${itemToDelete.canteenId}`).emit('menu-updated', {
        canteenId: itemToDelete.canteenId.toString(),
      });
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// ==========================================
// KHATA LIMIT MANAGEMENT
// ==========================================

/**
 * Updates the default credit limit for a canteen and enforces it against existing debts.
 * @route PATCH /api/canteens/limit
 */
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

    // Validation: Prevent lowering the limit below a student's current outstanding balance
    const maxDebtDoc = await Debt.findOne({ canteen: canteen._id }).sort('-amountOwed');
    
    if (maxDebtDoc && maxDebtDoc.amountOwed > numLimit) {
      return res.status(400).json({ 
        status: 'fail', 
        message: `Cannot set limit to ₹${numLimit}. A student currently owes ₹${maxDebtDoc.amountOwed}.` 
      });
    }

    canteen.defaultLimit = numLimit;
    await canteen.save();

    // Mass-update the limit for all existing active debt records tied to this canteen
    await Debt.updateMany({ canteen: canteen._id }, { limit: numLimit });

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