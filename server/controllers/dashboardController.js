// Dashboard controller - aggregated statistics for the shopkeeper
const CustomerUdhar = require('../models/CustomerUdhar');
const ShopBorrow = require('../models/ShopBorrow');
const Customer = require('../models/Customer');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run aggregations in parallel for efficiency
    const [
      totalCustomers,
      customerUdharStats,
      shopBorrowStats,
      recentCustomerUdhar,
      recentShopBorrow,
      dueTodayCustomer,
      dueTodayShop
    ] = await Promise.all([
      Customer.countDocuments({ createdBy: userId }),

      CustomerUdhar.aggregate([
        { $match: { createdBy: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' }
          }
        }
      ]),

      ShopBorrow.aggregate([
        { $match: { createdBy: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' }
          }
        }
      ]),

      CustomerUdhar.find({ createdBy: userId })
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5),

      ShopBorrow.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .limit(5),

      // Due today (customer)
      CustomerUdhar.countDocuments({
        createdBy: userId,
        status: 'Pending',
        dueDate: { $gte: today, $lt: tomorrow }
      }),

      // Due today (shop)
      ShopBorrow.countDocuments({
        createdBy: userId,
        status: 'Pending',
        dueDate: { $gte: today, $lt: tomorrow }
      })
    ]);

    // Process customer udhar stats
    const cuStats = { Pending: { count: 0, total: 0 }, Paid: { count: 0, total: 0 }, Overdue: { count: 0, total: 0 } };
    customerUdharStats.forEach(s => {
      if (cuStats[s._id]) cuStats[s._id] = { count: s.count, total: s.total };
    });

    // Process shop borrow stats
    const sbStats = { Pending: { count: 0, total: 0 }, Paid: { count: 0, total: 0 }, Overdue: { count: 0, total: 0 } };
    shopBorrowStats.forEach(s => {
      if (sbStats[s._id]) sbStats[s._id] = { count: s.count, total: s.total };
    });

    // Combine recent transactions
    const recentTransactions = [
      ...recentCustomerUdhar.map(r => ({
        id: r._id,
        type: 'Customer Udhar',
        name: r.customer ? r.customer.name : 'Unknown',
        phone: r.customer ? r.customer.phone : '',
        amount: r.totalAmount,
        status: r.status,
        dueDate: r.dueDate,
        createdAt: r.createdAt
      })),
      ...recentShopBorrow.map(r => ({
        id: r._id,
        type: 'Shop Borrow',
        name: r.fromName,
        phone: r.phone,
        amount: r.totalAmount,
        status: r.status,
        dueDate: r.dueDate,
        createdAt: r.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    res.json({
      success: true,
      data: {
        totalCustomers,
        customerUdhar: cuStats,
        shopBorrow: sbStats,
        dueToday: dueTodayCustomer + dueTodayShop,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
