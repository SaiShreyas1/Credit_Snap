const express = require('express');
const cors = require('cors');
// Import your user routes (make sure the path matches your folder structure)
const userRoutes = require('./routes/userRoutes'); 

const app = express();

// 1. Middlewares
app.use(cors()); 
app.use(express.json()); 

// 2. Test route
app.get('/', (req, res) => {
  res.send('Hello from the CreditSnap Backend Engine!');
});

// 3. Hook up your User Routes!
// This means every route in userRoutes.js will now start with /api/users
app.use('/api/users', userRoutes);

module.exports = app;