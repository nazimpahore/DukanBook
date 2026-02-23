const express = require('express');
const router = express.Router();
const { getCustomers, addCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.use(protect); // All customer routes require authentication

router.get('/', getCustomers);
router.post('/', addCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
