/**
 * @file app.js
 * @desc Main Express application configuration file. Initializes middleware and mounts all API route handlers.
 */

const express = require('express');
const cors = require('cors');

// ==========================================
// ROUTE IMPORTS
// ==========================================
const canteenRoutes = require('./routes/canteenRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const ordersRouter = require('./routes/ordersRoute');
const debtRoutes = require('./routes/debtRoutes'); 
const analyticsRoutes = require('./routes/analyticsRoutes'); 
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ==========================================
// GLOBAL MIDDLEWARES
// ==========================================

// Enable Cross-Origin Resource Sharing to allow the React frontend to communicate with this API
app.use(cors()); 

// Parse incoming JSON payloads (increased limit to handle base64 image payloads if necessary)
app.use(express.json({ limit: '10mb' })); 

// Parse incoming URL-encoded payloads from forms
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==========================================
// API ROUTE MOUNTING
// ==========================================

// Mount canteen-specific endpoints (menu, status, creation)
app.use('/api/canteens', canteenRoutes); 

// Mount user authentication and profile management endpoints
app.use('/api/users', userRoutes);       

// Mount order processing and history endpoints
app.use('/api/orders', ordersRouter);

// Mount Khata/debt tracking and management endpoints
app.use('/api/debts', debtRoutes);       

// Mount dashboard analytics endpoints for canteen owners
app.use('/api/analytics', analyticsRoutes); 

// Mount Razorpay integration and payment verification endpoints
app.use('/api/payments', paymentRoutes);

// ==========================================
// HEALTH CHECK ROUTE
// ==========================================

/**
 * @route   GET /
 * @desc    Basic health check endpoint to verify the server is running.
 * @access  Public
 */
app.get('/', (req, res) => {
  res.send('Hello from the CreditSnap Backend Engine!');
});

module.exports = app;