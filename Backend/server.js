require('dotenv').config(); 
const mongoose = require('mongoose'); // Bring in Mongoose
const app = require('./app');

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.MONGO_URI; // Grab the secret URL

// Connect to MongoDB
mongoose.connect(DB_URL)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Database!');
    
    // Only turn on the server IF the database connects successfully
    app.listen(PORT, () => {
      console.log(`🚀 Backend Engine is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log('❌ Error connecting to MongoDB:');
    console.error(error);
  });