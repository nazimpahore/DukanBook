// Customer Udhar controller - CRUD for credit given to customers
const CustomerUdhar = require('../models/CustomerUdhar');

// Helper: dynamically compute runtime status for a plain object
const runtimeStatus = (rec) => {
  if (rec.status === 'Paid') return 'Paid';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(rec.dueDate) < today) {
    return rec.paidAmount > 0 ? 'PartialPaid' : 'Overdue';
  }
  return rec.paidAmount > 0 ? 'PartialPaid' : 'Pending';
};

// @desc    Get all customer udhar records (with filter, search, pagination)
// @route   GET /api/customer-udhar
// @access  Private
const getUdharRecords = async (req, res, next) => {
  try {
    const { status, customerId, search, startDate, endDate, page = 1, limit = 10 } = req.query;
    let query = { createdBy: req.user._id };

    if (status) query.status = status;
    if (customerId) query.customer = customerId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CustomerUdhar.countDocuments(query);

    const records = await CustomerUdhar.find(query)
      .populate('customer', 'name phone address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Dynamically tag overdue / partial
    const enriched = records.map(r => {
      const rec = r.toObject();
      rec.status = runtimeStatus(rec);
      rec.remainingAmount = Math.max(0, rec.totalAmount - (rec.paidAmount || 0));
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

// @desc    Add new udhar record
// @route   POST /api/customer-udhar
// @access  Private
const addUdharRecord = async (req, res, next) => {
  try {
    const { customer, items, totalAmount, dueDate, notes, carriedForwardFrom } = req.body;

    const record = await CustomerUdhar.create({
      customer,
      items,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      dueDate,
      notes,
      carriedForwardFrom: carriedForwardFrom || null,
      createdBy: req.user._id
    });

    await record.populate('customer', 'name phone address');
    res.status(201).json({ success: true, message: 'Udhar record added', data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Update udhar record
// @route   PUT /api/customer-udhar/:id
// @access  Private
const updateUdharRecord = async (req, res, next) => {
  try {
    const record = await CustomerUdhar.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('customer', 'name phone address');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Record updated', data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete udhar record
// @route   DELETE /api/customer-udhar/:id
// @access  Private
const deleteUdharRecord = async (req, res, next) => {
  try {
    const record = await CustomerUdhar.findOneAndDelete({
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

// @desc    Mark udhar record as fully paid
// @route   PATCH /api/customer-udhar/:id/paid
// @access  Private
const markAsPaid = async (req, res, next) => {
  try {
    const existing = await CustomerUdhar.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });

    const remaining = Math.max(0, existing.totalAmount - (existing.paidAmount || 0));

    // Add a final payment entry for the remaining balance
    if (remaining > 0) {
      existing.payments.push({ amount: remaining, date: new Date(), note: 'Marked as fully paid' });
    }
    existing.paidAmount = existing.totalAmount;
    existing.remainingAmount = 0;
    existing.status = 'Paid';
    existing.paidAt = new Date();

    await existing.save();
    await existing.populate('customer', 'name phone');

    res.json({ success: true, message: 'Marked as paid', data: existing });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a partial payment against an udhar record
// @route   PATCH /api/customer-udhar/:id/partial-payment
// @access  Private
const recordPartialPayment = async (req, res, next) => {
  try {
    const { amount, note } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid payment amount is required' });
    }

    const record = await CustomerUdhar.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    if (record.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'This record is already fully paid' });
    }

    const payAmt = Math.min(Number(amount), record.totalAmount - (record.paidAmount || 0));
    record.paidAmount = (record.paidAmount || 0) + payAmt;
    record.remainingAmount = Math.max(0, record.totalAmount - record.paidAmount);
    record.payments.push({ amount: payAmt, date: new Date(), note: note || '' });

    if (record.remainingAmount === 0) {
      record.status = 'Paid';
      record.paidAt = new Date();
    } else {
      record.status = 'PartialPaid';
    }

    await record.save();
    await record.populate('customer', 'name phone');

    res.json({
      success: true,
      message: `Payment of Rs.${payAmt} recorded. Remaining: Rs.${record.remainingAmount}`,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Carry forward remaining balance as a new udhar record for next month
// @route   POST /api/customer-udhar/:id/carry-forward
// @access  Private
const carryForwardBalance = async (req, res, next) => {
  try {
    const { newDueDate, note } = req.body;

    const record = await CustomerUdhar.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('customer', 'name phone');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    if (record.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'Record is already fully paid — nothing to carry forward' });
    }

    const remaining = Math.max(0, record.totalAmount - (record.paidAmount || 0));
    if (remaining === 0) {
      return res.status(400).json({ success: false, message: 'No remaining balance to carry forward' });
    }

    // Mark old record as Paid (carried forward) and log a note
    record.payments.push({ amount: 0, date: new Date(), note: `Balance of Rs.${remaining} carried forward to next month` });
    record.status = 'Paid';
    record.paidAt = new Date();
    record.notes = (record.notes ? record.notes + ' | ' : '') + `Remaining Rs.${remaining} carried forward`;
    await record.save();

    // Compute next-month due date if not supplied
    let dueDate = newDueDate;
    if (!dueDate) {
      const d = new Date(record.dueDate);
      d.setMonth(d.getMonth() + 1);
      dueDate = d.toISOString().split('T')[0];
    }

    // Create a new udhar record for the remaining balance
    const newRecord = await CustomerUdhar.create({
      customer: record.customer._id,
      items: [{ itemName: 'Carried forward balance', quantity: 1, pricePerItem: remaining, subtotal: remaining }],
      totalAmount: remaining,
      paidAmount: 0,
      remainingAmount: remaining,
      dueDate,
      notes: note || `Carried forward from record dated ${record.createdAt.toLocaleDateString()}`,
      carriedForwardFrom: record._id,
      createdBy: req.user._id
    });

    await newRecord.populate('customer', 'name phone');

    res.status(201).json({
      success: true,
      message: `Rs.${remaining} carried forward. New record created with due date ${dueDate}.`,
      originalRecord: record,
      newRecord
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUdharRecords,
  addUdharRecord,
  updateUdharRecord,
  deleteUdharRecord,
  markAsPaid,
  recordPartialPayment,
  carryForwardBalance
};

