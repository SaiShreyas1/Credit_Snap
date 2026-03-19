// scratch.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Canteen = require('./models/canteenModel');

const fixDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const owners = await User.find({ role: 'owner' });
    console.log(`Found ${owners.length} owners.`);

    for (const owner of owners) {
      const existingCanteen = await Canteen.findOne({ ownerId: owner._id });
      if (!existingCanteen) {
        console.log(`Owner ${owner.email} has no canteen! Creating one...`);
        await Canteen.create({
          name: `${owner.name}'s Canteen`,
          ownerId: owner._id,
          isOpen: false
        });
        console.log(`Created canteen for ${owner.email}`);
      } else {
        console.log(`Owner ${owner.email} already has a canteen.`);
      }
    }

    console.log("Database fix complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixDatabase();
