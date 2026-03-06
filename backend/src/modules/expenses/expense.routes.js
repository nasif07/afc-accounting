const express = require('express');
const ExpenseController = require('./expense.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');
const fileUploader = require('../../utils/fileUploader');

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD operations
router.post('/', accountantOrDirector, fileUploader, ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/:id', ExpenseController.getExpenseById);
router.put('/:id', accountantOrDirector, fileUploader, ExpenseController.updateExpense);
router.delete('/:id', accountantOrDirector, ExpenseController.deleteExpense);

// Approval operations (Director only)
router.put('/:id/approve', directorOnly, ExpenseController.approveExpense);
router.put('/:id/reject', directorOnly, ExpenseController.rejectExpense);

// Reports
router.get('/report/total-expenses', ExpenseController.getTotalExpenses);

module.exports = router;
