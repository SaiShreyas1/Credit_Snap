require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/ordersModel');
const Canteen = require('./models/canteenModel');
const User = require('./models/userModel');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const canteen = await Canteen.findOne();
  const student = await User.findOne({ role: 'student' });
  if (!canteen || !student) process.exit();
  
  const d = new Date();
  
  // High quantities to ensure these new items beat the old tiny items, guaranteeing 'Others' logic is triggered
  const items = [
    { name: "French Fries", price: 60, qty: 150 }, // Dominant item
    { name: "Samosa", price: 15, qty: 100 },
    { name: "Cold Coffee", price: 40, qty: 80 },
    { name: "Chicken Puff", price: 35, qty: 70 },
    { name: "Idli", price: 30, qty: 5 }, // Tiny item -> Will safely fall into 'Others'
    { name: "Pasta", price: 80, qty: 5 }, // Tiny item -> Will safely fall into 'Others'
    { name: "Tea", price: 10, qty: 2 }    // Tiny item -> Will safely fall into 'Others'
  ];
  
  const fakeOrders = [];
  
  for (const it of items) {
    fakeOrders.push({
      student: student._id,
      canteen: canteen._id,
      items: [{ name: it.name, quantity: it.qty, price: it.price }],
      totalAmount: it.price * it.qty,
      paymentMode: 'online',
      status: 'accepted',
      createdAt: d,
      updatedAt: d
    });
  }
  
  await Order.insertMany(fakeOrders);
  console.log("Seeded French Fries and miscellaneous tiny items into Others slice!");
  process.exit();
}
seed();
