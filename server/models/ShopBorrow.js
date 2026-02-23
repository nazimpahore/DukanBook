// ShopBorrow model - stores credit taken by shopkeeper from suppliers/others
const mongoose = require('mongoose');

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

const ShopBorrowSchema = new mongoose.Schema({
  fromName: {
    type: String,
    required: [true, 'Name of lender is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
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
  dueDate: {
    type: Date,
    required: [true, 'Return due date is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue'],
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Auto-calculate subtotals before save
ShopBorrowSchema.pre('save', function(next) {
  this.items = this.items.map(item => ({
    ...item.toObject ? item.toObject() : item,
    subtotal: item.quantity * item.pricePerItem
  }));
  next();
});

module.exports = mongoose.model('ShopBorrow', ShopBorrowSchema);
