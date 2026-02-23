// Main server entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startReminderJob } = require('./jobs/reminderJob');

// Route imports
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerUdharRoutes = require('./routes/customerUdharRoutes');
const shopBorrowRoutes = require('./routes/shopBorrowRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const saleRoutes = require('./routes/saleRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/customer-udhar', customerUdharRoutes);
app.use('/api/shop-borrow', shopBorrowRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sales', saleRoutes);

// ─── Serve Uploads (profile pictures) ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Serve Frontend Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// Any other route returns the frontend (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ─── Error Handling Middleware (must be last) ─────────────────────────────────
app.use(errorHandler);

// ─── Start Server (only in non-serverless environments) ───────────────────────
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start daily cron job for payment reminders (not supported on Vercel)
    startReminderJob();
  });
}

// ─── Export for Vercel Serverless ─────────────────────────────────────────────
module.exports = app;
