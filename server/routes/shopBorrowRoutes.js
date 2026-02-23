const express = require('express');
const router = express.Router();
const {
  getBorrowRecords,
  addBorrowRecord,
  updateBorrowRecord,
  deleteBorrowRecord,
  markAsPaid
} = require('../controllers/shopBorrowController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getBorrowRecords);
router.post('/', addBorrowRecord);
router.put('/:id', updateBorrowRecord);
router.delete('/:id', deleteBorrowRecord);
router.patch('/:id/paid', markAsPaid);

module.exports = router;
