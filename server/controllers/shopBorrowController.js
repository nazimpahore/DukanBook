// Shop Borrow controller - CRUD for credit taken by shopkeeper
const ShopBorrow = require('../models/ShopBorrow');

// @desc    Get all shop borrow records (with filter, search, pagination)
// @route   GET /api/shop-borrow
// @access  Private
const getBorrowRecords = async (req, res, next) => {
  try {
    const { status, search, startDate, endDate, page = 1, limit = 10 } = req.query;
    let query = { createdBy: req.user._id };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fromName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ShopBorrow.countDocuments(query);

    const records = await ShopBorrow.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Dynamically tag overdue
    const today = new Date(); today.setHours(0,0,0,0);
    const enriched = records.map(r => {
      const rec = r.toObject();
      if (rec.status === 'Pending' && new Date(rec.dueDate) < today) rec.status = 'Overdue';
      return rec;
    });

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: enriched
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new borrow record
// @route   POST /api/shop-borrow
// @access  Private
const addBorrowRecord = async (req, res, next) => {
  try {
    const { fromName, phone, items, totalAmount, dueDate, notes } = req.body;

    const record = await ShopBorrow.create({
      fromName,
      phone,
      items,
      totalAmount,
      dueDate,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Borrow record added', data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update borrow record
// @route   PUT /api/shop-borrow/:id
// @access  Private
const updateBorrowRecord = async (req, res, next) => {
  try {
    const record = await ShopBorrow.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Record updated', data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete borrow record
// @route   DELETE /api/shop-borrow/:id
// @access  Private
const deleteBorrowRecord = async (req, res, next) => {
  try {
    const record = await ShopBorrow.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark borrow record as paid
// @route   PATCH /api/shop-borrow/:id/paid
// @access  Private
const markAsPaid = async (req, res, next) => {
  try {
    const record = await ShopBorrow.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status: 'Paid', paidAt: new Date() },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Marked as paid', data: record });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBorrowRecords, addBorrowRecord, updateBorrowRecord, deleteBorrowRecord, markAsPaid };
