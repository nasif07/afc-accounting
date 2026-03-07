const express = require('express');
const BankController = require('./bank.controller');
const auth = require('../../middleware/auth');
const { directorOnly } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.post('/', directorOnly, BankController.createBankAccount);
router.get('/', BankController.getAllBankAccounts);
router.get('/:id', BankController.getBankAccountById);
router.put('/:id', directorOnly, BankController.updateBankAccount);
router.delete('/:id', directorOnly, BankController.deleteBankAccount);
router.put('/:id/reconcile', directorOnly, BankController.reconcileBankAccount);
router.get('/report/total-balance', BankController.getTotalBankBalance);

module.exports = router;
