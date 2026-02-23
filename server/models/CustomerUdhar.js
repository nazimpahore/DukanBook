// CustomerUdhar model - stores credit given to customers
const mongoose = require('mongoose');

// Sub-schema for individual items in the udhar record
const ItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerItem: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number
  }
}, { _id: false });

// Sub-schema for each partial payment made
const PaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const CustomerUdharSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer reference is required']
  },
  items: {
    type: [ItemSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: 'At least one item is required'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Sum of all partial payments received so far
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Remaining balance = totalAmount - paidAmount (stored for quick queries)
  remainingAmount: {
    type: Number,
    default: 0
  },
  // History of each individual payment
  payments: {
    type: [PaymentSchema],
    default: []
  },
  dueDate: {
    type: Date,
    required: [true, 'Return due date is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'PartialPaid'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  paidAt: {
    type: Date
  },
  // If this record was created as a carry-forward from another record
  carriedForwardFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerUdhar',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Auto-calculate subtotals and remainingAmount before save
CustomerUdharSchema.pre('save', function(next) {
  this.items = this.items.map(item => ({
    ...item.toObject ? item.toObject() : item,
    subtotal: item.quantity * item.pricePerItem
  }));
  this.remainingAmount = Math.max(0, this.totalAmount - (this.paidAmount || 0));
  next();
});

module.exports = mongoose.model('CustomerUdhar', CustomerUdharSchema);
