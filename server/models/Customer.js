// Customer model - stores customer information
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    match: [/^\S+@\S+\.\S+$|^$/, 'Invalid email address']
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  // Reference to the shopkeeper who added this customer
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Prevent duplicate phone numbers for the same shopkeeper
CustomerSchema.index({ phone: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Customer', CustomerSchema);
