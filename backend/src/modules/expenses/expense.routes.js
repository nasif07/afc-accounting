const express = require('express');
const ExpenseController = require('./expense.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');
const fileUploader = require('../../utils/fileUploader');

const router = express.Router();

router.use(auth);

// CRUD
router.post('/', accountantOrDirector, fileUploader, ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/:id', ExpenseController.getExpenseById);
router.put('/:id', accountantOrDirector, fileUploader, ExpenseController.updateExpense);
router.delete('/:id', directorOnly, ExpenseController.deleteExpense);

// Approval
router.patch('/:id/approve', directorOnly, ExpenseController.approveExpense);

module.exports = router;
