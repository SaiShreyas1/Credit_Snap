require('dotenv').config(); 
const mongoose = require('mongoose'); // Bring in Mongoose
const app = require('./app');

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.MONGO_URI; // Grab the secret URL

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

// Configure Socket.io Events
io.on('connection', (socket) => {
  console.log('⚡ A user connected to Socket.io:', socket.id);
  
  // Listen for canteen owners opening their dashboard
  socket.on('joinRoom', (canteenId) => {
    socket.join(canteenId);
    console.log(`🔌 Dashboard socket joined Canteen Room: ${canteenId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected from Socket.io:', socket.id);
  });
});

// Make `io` accessible in controllers (exports.createOrder)
app.set('io', io);

// Connect to MongoDB
mongoose.connect(DB_URL)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Database!');
    
    // Only turn on the server IF the database connects successfully
    server.listen(PORT, () => {
      console.log(`🚀 Backend Engine is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log('❌ Error connecting to MongoDB:');
    console.error(error);
  });