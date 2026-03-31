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

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.MONGO_URI;

// ==========================================
// SERVER & SOCKET.IO INITIALIZATION
// ==========================================

// Create an HTTP server instance using the Express app
const httpServer = createServer(app);

// Initialize Socket.IO with Cross-Origin Resource Sharing (CORS) rules
// specifically allowing connections from the local React development environments
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Attach the Socket.IO instance to the Express app object
// This allows route controllers to emit real-time events (e.g., req.app.get('io').emit(...))
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
    console.log(`Current rooms for ${socket.id}:`, Array.from(socket.rooms));
  });

  socket.on('leave-canteen', (canteenId) => {
    socket.leave(`canteen:${canteenId}`);
    console.log(`🚪 [SOCKET.IO] Socket ${socket.id} left room -> canteen:${canteenId}`);
  });

  /**
   * Student Rooms: Subscribes a student's client to real-time order status and debt notifications.
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

mongoose.connect(DB_URL)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Database!');

    // Only start listening for requests AFTER the database connection is secure
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log('❌ Error connecting to MongoDB:');
    console.error(error);
  });
