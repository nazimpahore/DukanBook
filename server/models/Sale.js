// Sale model - records immediate cash / hand-payment purchases
const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  itemName:     { type: String, required: true, trim: true },
  quantity:     { type: Number, required: true, min: 1 },
  pricePerItem: { type: Number, required: true, min: 0 },
  subtotal:     { type: Number }
}, { _id: false });

const SaleSchema = new mongoose.Schema({
  // Optional – sale can be for a walk-in customer (no record) or a known customer
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  // Walk-in name when no customer record exists
  walkInName: { type: String, trim: true, default: '' },

  items: {
    type: [SaleItemSchema],
    required: true,
    validate: { validator: v => v.length > 0, message: 'At least one item is required' }
  },

  totalAmount:    { type: Number, required: true, min: 0 },
  amountReceived: { type: Number, required: true, min: 0 },
  changeReturned: { type: Number, default: 0 },

  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },

  discount: { type: Number, default: 0, min: 0 },   // absolute amount
  notes:    { type: String, trim: true, default: '' },

  // Sequential receipt number per shop
  receiptNumber: { type: String },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Auto-calculate item subtotals, change returned, discounted total
SaleSchema.pre('save', function (next) {
  this.items = this.items.map(item => ({
    ...item.toObject ? item.toObject() : item,
    subtotal: item.quantity * item.pricePerItem
  }));
  const gross = this.items.reduce((s, i) => s + i.subtotal, 0);
  this.totalAmount = Math.max(0, gross - (this.discount || 0));
  this.changeReturned = Math.max(0, (this.amountReceived || 0) - this.totalAmount);
  next();
});

module.exports = mongoose.model('Sale', SaleSchema);
