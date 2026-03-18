const Canteen = require('../models/canteenModel');

// 🚀 ADD A MENU ITEM
exports.addMenuItem = async (req, res) => {
  try {
    // 1. Get the Canteen ID from the URL and the food details from React
    const { canteenId } = req.params;
    const { name, price, isAvailable } = req.body;

    // 2. Find the exact canteen in the database
    const canteen = await Canteen.findById(canteenId);

    if (!canteen) {
      return res.status(404).json({ status: 'fail', message: 'Canteen not found!' });
    }

    // 3. Create the new food item object
    const newItem = {
      name: name,
      price: price,
      isAvailable: isAvailable || true
    };

    // 4. Push the new item into the canteen's menu array
    canteen.menu.push(newItem);

    // 5. Save the updated canteen back to the database
    await canteen.save();

    // 6. Tell React it was successful!
    res.status(200).json({
      status: 'success',
      data: {
        menu: canteen.menu
      }
    });

  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};