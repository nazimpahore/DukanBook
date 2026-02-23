// Notification model - stores due date alerts and reminders
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['DueToday', 'Overdue', 'Reminder'],
    default: 'Reminder'
  },
  message: {
    type: String,
    required: true
  },
  // Reference to the associated record (CustomerUdhar or ShopBorrow)
  recordId: {
    type: mongoose.Schema.Types.ObjectId
  },
  recordType: {
    type: String,
    enum: ['CustomerUdhar', 'ShopBorrow']
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
