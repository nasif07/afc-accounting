const express = require('express');
const BankController = require('./bank.controller');
const auth = require('../../middleware/auth');
const { directorOnly } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

// FIXED: Static routes BEFORE dynamic routes to prevent /:id from matching /report/total-balance
router.get('/report/total-balance', BankController.getTotalBankBalance);

// CRUD operations
router.post('/', directorOnly, BankController.createBankAccount);
router.get('/', BankController.getAllBankAccounts);

// Dynamic routes LAST
router.get('/:id', BankController.getBankAccountById);
router.put('/:id', directorOnly, BankController.updateBankAccount);
router.delete('/:id', directorOnly, BankController.deleteBankAccount);
router.put('/:id/reconcile', directorOnly, BankController.reconcileBankAccount);

module.exports = router;
