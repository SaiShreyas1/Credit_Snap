/**
 * @file server.js
 * @desc Main entry point for the backend server. Bootstraps the Express application, 
 * configures Socket.IO for real-time bidirectional communication, and connects to the MongoDB database.
 */

const path = require('path');

// Load environment variables from the .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = 5005; // Force 5005 aggressively to bypass the university server block
const DB_URL = process.env.MONGO_URI;

// ==========================================
// SERVER & SOCKET.IO INITIALIZATION
// ==========================================

// Create an HTTP server instance using the Express app
const httpServer = createServer(app);

// Initialize Socket.IO with Cross-Origin Resource Sharing (CORS) rules
const io = new Server(httpServer, {
  cors: {
    // Dynamically allow whatever port Vite assigns (5176, etc.) on the shared server
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
  // 🛡️ Network timeout fixes for WebSockets (Keeps connection alive when PC is closed)
  pingTimeout: 60000,  
  pingInterval: 25000  
});

// Attach the Socket.IO instance to the Express app object
app.set('io', io);

// ==========================================
// REAL-TIME EVENT LISTENERS (WebSockets)
// ==========================================

io.on('connection', (socket) => {
  console.log('🔗 [SOCKET.IO] New connection:', socket.id);

  /**
   * Canteen Rooms: Subscribes a canteen owner's client to real-time order updates.
   */
  socket.on('join-canteen', (canteenId) => {
    socket.join(`canteen:${canteenId}`);
    console.log(`📡 [SOCKET.IO] Socket ${socket.id} joined room -> canteen:${canteenId}`);
  });

  socket.on('leave-canteen', (canteenId) => {
    socket.leave(`canteen:${canteenId}`);
    console.log(`🚪 [SOCKET.IO] Socket ${socket.id} left room -> canteen:${canteenId}`);
  });

  /**
   * Student Rooms: Subscribes a student's client to real-time order status and notifications.
   */
  socket.on('join-student', (studentId) => {
    socket.join(`student:${studentId}`);
    console.log(`📡 [SOCKET.IO] Socket ${socket.id} joined room -> student:${studentId}`);
  });

  socket.on('leave-student', (studentId) => {
    socket.leave(`student:${studentId}`);
    console.log(`🚪 [SOCKET.IO] Socket ${socket.id} left room -> student:${studentId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ [SOCKET.IO] Disconnected:', socket.id);
  });
});

// ==========================================
// DATABASE CONNECTION & SERVER BOOTSTRAP
// ==========================================

// 1. Set up connection event listeners to monitor the wire
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB] Connection lost. Driver is attempting to auto-reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 [MongoDB] Successfully reconnected to the database!');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ [MongoDB] Runtime connection error:', err);
});

// 2. Establish the resilient connection
const startServer = async () => {
  try {
    await mongoose.connect(DB_URL, {
      
      // Basic Connection timeouts
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,

      // 🛡️ THE MODERN FIREWALL BYPASS FIXES (MongoDB Atlas vs IITK Network) 🛡️
      heartbeatFrequencyMS: 10000, // Sends a ping every 10 seconds to keep the network path wide open
      maxIdleTimeMS: 60000         // Destroys and recreates idle connections before the firewall can trap them
    });

    console.log('✅ Successfully connected to MongoDB Database!');

    // 3. Only start listening for requests AFTER the database connection is secure
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB on startup:', error);
    process.exit(1); // Force the container to crash so the host restarts it cleanly via PM2
  }
};

startServer();