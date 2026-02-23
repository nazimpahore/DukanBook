// Sale controller – CRUD for immediate cash-payment sales
const Sale = require('../models/Sale');

// ─── Helpers ───────────────────────────────────────────────
const pad = (n, len = 5) => String(n).padStart(len, '0');

// Build a human-readable receipt number: SHOP-YYYYMMDD-NNNNN
async function generateReceiptNumber(userId) {
  const today = new Date();
  const prefix = `REC-${today.getFullYear()}${pad(today.getMonth() + 1, 2)}${pad(today.getDate(), 2)}`;
  const count = await Sale.countDocuments({ createdBy: userId }) + 1;
  return `${prefix}-${pad(count)}`;
}

// @desc  Get all sales (paginated, filterable)
// @route GET /api/sales
const getSales = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate, page = 1, limit = 15 } = req.query;
    const query = { createdBy: req.user._id };

    if (customerId) query.customer = customerId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Sale.countDocuments(query);

    const sales = await Sale.find(query)
      .populate('customer', 'name phone address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data:  sales
    });
  } catch (err) { next(err); }
};

// @desc  Get single sale
// @route GET /api/sales/:id
const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('customer', 'name phone address');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (err) { next(err); }
};

// @desc  Create a new sale
// @route POST /api/sales
const createSale = async (req, res, next) => {
  try {
    const { customer, walkInName, items, amountReceived, paymentMethod, discount, notes } = req.body;

    const receiptNumber = await generateReceiptNumber(req.user._id);

    // totalAmount and changeReturned are computed by the pre-save hook
    const sale = await Sale.create({
      customer:      customer || null,
      walkInName:    walkInName || '',
      items,
      totalAmount:   0,   // will be set by hook
      amountReceived: Number(amountReceived),
      discount:      Number(discount) || 0,
      paymentMethod: paymentMethod || 'Cash',
      notes:         notes || '',
      receiptNumber,
      createdBy: req.user._id
    });

    await sale.populate('customer', 'name phone address');
    res.status(201).json({ success: true, message: 'Sale recorded', data: sale });
  } catch (err) { next(err); }
};

// @desc  Update a sale
// @route PUT /api/sales/:id
const updateSale = async (req, res, next) => {
  try {
    // Re-fetch, apply changes, then save so hooks run
    const sale = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

    const allowed = ['customer', 'walkInName', 'items', 'amountReceived', 'paymentMethod', 'discount', 'notes'];
    allowed.forEach(k => { if (req.body[k] !== undefined) sale[k] = req.body[k]; });
    await sale.save();

    await sale.populate('customer', 'name phone address');
    res.json({ success: true, message: 'Sale updated', data: sale });
  } catch (err) { next(err); }
};

// @desc  Delete a sale
// @route DELETE /api/sales/:id
const deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, message: 'Sale deleted' });
  } catch (err) { next(err); }
};

module.exports = { getSales, getSale, createSale, updateSale, deleteSale };
