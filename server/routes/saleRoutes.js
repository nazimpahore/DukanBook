const express = require('express');
const router  = express.Router();
const { getSales, getSale, createSale, updateSale, deleteSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',     getSales);
router.get('/:id',  getSale);
router.post('/',    createSale);
router.put('/:id',  updateSale);
router.delete('/:id', deleteSale);

module.exports = router;
