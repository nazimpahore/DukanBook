// Daily cron job - checks due dates, creates notifications, and sends emails
const cron = require('node-cron');
const CustomerUdhar = require('../models/CustomerUdhar');
const ShopBorrow = require('../models/ShopBorrow');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendDueReminderEmail } = require('../services/emailService');

// Mock WhatsApp/SMS sender (stub for real API integration)
const sendReminder = (type, name, phone, amount, dueDate) => {
  const msg = `[REMINDER] ${type}: ${name} (${phone}) has a payment of Rs.${amount} due on ${new Date(dueDate).toLocaleDateString('en-PK')}`;
  console.log(`📱 SMS/WhatsApp Mock → ${msg}`);
};

// Runs every day at 8:00 AM
const startReminderJob = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily reminder job...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find pending records due today or overdue
      const [customerRecords, shopRecords] = await Promise.all([
        CustomerUdhar.find({
          status: 'Pending',
          dueDate: { $lte: tomorrow }
        }).populate('customer', 'name phone email').populate('createdBy', '_id shopName name'),

        ShopBorrow.find({
          status: 'Pending',
          dueDate: { $lte: tomorrow }
        }).populate('createdBy', '_id shopName name')
      ]);

      // ── Process customer udhar records ─────────────────────
      for (const record of customerRecords) {
        const dueDate = new Date(record.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const isToday   = dueDate.getTime() === today.getTime();
        const isOverdue = dueDate < today;

        const type     = isToday ? 'DueToday' : (isOverdue ? 'Overdue' : 'Reminder');
        const custName = record.customer?.name  || 'Customer';
        const phone    = record.customer?.phone || '';
        const email    = record.customer?.email || '';
        const shopName = record.createdBy?.shopName || record.createdBy?.name || 'Shop';

        const message = isToday
          ? `⚠️ Customer "${custName}" udhar of Rs.${record.totalAmount} is due TODAY!`
          : `🔴 Customer "${custName}" udhar of Rs.${record.totalAmount} is OVERDUE since ${dueDate.toLocaleDateString('en-PK')}!`;

        // Avoid duplicate notifications for same record/day
        const existing = await Notification.findOne({
          recordId: record._id,
          recordType: 'CustomerUdhar',
          createdAt: { $gte: today, $lt: tomorrow }
        });

        if (!existing) {
          await Notification.create({
            userId: record.createdBy,
            type,
            message,
            recordId: record._id,
            recordType: 'CustomerUdhar'
          });

          // Send mock SMS/WhatsApp
          if (phone) sendReminder('Customer Udhar', custName, phone, record.totalAmount, record.dueDate);

          // 📧 Send email to customer if they have an email address
          if (email) {
            await sendDueReminderEmail({
              to: email,
              name: custName,
              amount: record.totalAmount,
              dueDate: record.dueDate,
              shopName,
              type
            });
          }
        }
      }

      // ── Process shop borrow records ────────────────────────
      for (const record of shopRecords) {
        const dueDate = new Date(record.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const isToday   = dueDate.getTime() === today.getTime();
        const isOverdue = dueDate < today;

        const type = isToday ? 'DueToday' : (isOverdue ? 'Overdue' : 'Reminder');
        const message = isToday
          ? `⚠️ Your borrow from "${record.fromName}" of Rs.${record.totalAmount} is due TODAY!`
          : `🔴 Your borrow from "${record.fromName}" of Rs.${record.totalAmount} is OVERDUE since ${dueDate.toLocaleDateString('en-PK')}!`;

        const existing = await Notification.findOne({
          recordId: record._id,
          recordType: 'ShopBorrow',
          createdAt: { $gte: today, $lt: tomorrow }
        });

        if (!existing) {
          await Notification.create({
            userId: record.createdBy,
            type,
            message,
            recordId: record._id,
            recordType: 'ShopBorrow'
          });

          sendReminder('Shop Borrow', record.fromName, record.phone, record.totalAmount, record.dueDate);
        }
      }

      console.log(`✅ Reminder job done. Processed ${customerRecords.length + shopRecords.length} records.`);
    } catch (error) {
      console.error('❌ Reminder job error:', error.message);
    }
  });

  console.log('📅 Daily reminder cron job scheduled (8:00 AM every day)');
};

module.exports = { startReminderJob };
