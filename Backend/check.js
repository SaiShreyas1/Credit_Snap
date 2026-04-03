require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/ordersModel');
const Canteen = require('./models/canteenModel');
const User = require('./models/userModel');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Clean all existing fake orders (from Jan-April) or specifically massive ones
  // We want to delete ALL orders and just make a perfectly balanced batch.
  await Order.deleteMany({});
  
  console.log("All orders wiped safely.");
  
  // Re-seed beautifully balanced orders
  const canteen = await Canteen.findOne();
  const student = await mongoose.model('User').findOne({ role: 'student' });
  
  if (!canteen || !student) return process.exit();
  
  const fakeOrders = [];
  const items = [
    { name: "Veg biryani", price: 150, color: "#A78BFA" },
    { name: "bhelpuri", price: 40, color: "#FF8A8A" },
    { name: "dosa", price: 60, color: "#38BDF8" },
    { name: "masala dosa", price: 80, color: "#FB923C" },
    { name: "vadapav", price: 20, color: "#60A5FA" },
    { name: "Thumbs Up", price: 40, color: "#10b981" },
    { name: "Maggi", price: 35, color: "#f43f5e" }
  ];
  
  // Jan: Low, Feb: Med, Mar: Low, Apr: High (Ups and Downs)
  const pattern = [
    { month: 0, count: 12 },   // Jan
    { month: 1, count: 28 },   // Feb
    { month: 2, count: 5 },    // Mar (Dip)
    { month: 3, count: 45 }    // Apr (Spike)
  ];
  
  for (const p of pattern) {
    for (let i = 0; i < p.count; i++) {
        // Vary the day randomly
        const d = new Date(2026, p.month, Math.floor(Math.random() * 25) + 1, 14, 30);
        
        let totalAmount = 0;
        let orderItems = [];
        
        // Pick 1-2 random items per order
        const numItems = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numItems; j++) {
            const item = items[Math.floor(Math.random() * items.length)];
            const qty = Math.floor(Math.random() * 2) + 1; // 1-2 
            orderItems.push({ name: item.name, quantity: qty, price: item.price });
            totalAmount += (item.price * qty);
        }
        
        fakeOrders.push({
            student: student._id,
            canteen: canteen._id,
            items: orderItems,
            totalAmount: totalAmount,
            paymentMode: 'online',
            status: 'accepted',
            createdAt: d,
            updatedAt: d
        });
    }
  }
  
  await Order.insertMany(fakeOrders);
  console.log('Seeded perfectly optimized graph data!');
  
  process.exit();
}
check();
