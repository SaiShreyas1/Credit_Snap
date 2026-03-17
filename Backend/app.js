const express = require('express');
const cors = require('cors');

const app = express();

// 1. Middlewares
app.use(cors()); // Allows your React frontend to talk to this backend
app.use(express.json()); // Allows your server to understand JSON data

// 2. A simple test route!
app.get('/', (req, res) => {
  res.send('Hello from the CreditSnap Backend Engine!');
});

// We will add more routes here later!

module.exports = app;