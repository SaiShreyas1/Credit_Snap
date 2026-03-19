const express = require('express');
const cors = require('cors');

// Import both sets of routes safely!
const canteenRoutes = require('./routes/canteenRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const ordersRouter = require('./routes/ordersRoute');
const debtRoutes = require('./routes/debtRoutes'); // ⭐ NEW: Import your Debt Routes

const app = express();

// 1. Middlewares
app.use(cors()); // Allows your React frontend to talk to this backend
app.use(express.json()); // Allows your server to understand JSON data

// 2. Hook up the routes!
app.use('/api/canteens', canteenRoutes); // Your work
app.use('/api/users', userRoutes);       // Your friend's work
app.use('/api/orders', ordersRouter);
app.use('/api/debts', debtRoutes);       // ⭐ NEW: Hook up the Debt API!

// 3. A simple test route!
app.get('/', (req, res) => {
  res.send('Hello from the CreditSnap Backend Engine!');
});

module.exports = app;