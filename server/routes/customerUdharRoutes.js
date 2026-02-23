const express = require('express');
const router = express.Router();
const {
  getUdharRecords,
  addUdharRecord,
  updateUdharRecord,
  deleteUdharRecord,
  markAsPaid,
  recordPartialPayment,
  carryForwardBalance
} = require('../controllers/customerUdharController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getUdharRecords);
router.post('/', addUdharRecord);
router.put('/:id', updateUdharRecord);
router.delete('/:id', deleteUdharRecord);
router.patch('/:id/paid', markAsPaid);
router.patch('/:id/partial-payment', recordPartialPayment);
router.post('/:id/carry-forward', carryForwardBalance);

module.exports = router;
