const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  name: {
    type: String,
    default: 'Unknown Student'
  },
  rollNo: {
    type: String,
    default: 'N/A'
  },
  phoneNo: {
    type: String,
    default: '+91 XXXXXXXXXX'
  },
  hallNo: {
    type: String,
    default: 'N/A'
  },
  roomNo: {
    type: String,
    default: 'N/A'
  },
  email: {
    type: String,
    default: 'N/A'
  }
}, { _id: false });
