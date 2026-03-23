require('dotenv').config();
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.MONGO_URI;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔗 [SOCKET.IO] New connection:', socket.id);

  socket.on('join-canteen', (canteenId) => {
    socket.join(`canteen:${canteenId}`);
    console.log(`📡 [SOCKET.IO] Socket ${socket.id} joined room -> canteen:${canteenId}`);
    console.log(`Current rooms for ${socket.id}:`, Array.from(socket.rooms));
  });

  socket.on('leave-canteen', (canteenId) => {
    socket.leave(`canteen:${canteenId}`);
    console.log(`🚪 [SOCKET.IO] Socket ${socket.id} left room -> canteen:${canteenId}`);
  });

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

mongoose.connect(DB_URL)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Database!');

    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log('❌ Error connecting to MongoDB:');
    console.error(error);
  });
