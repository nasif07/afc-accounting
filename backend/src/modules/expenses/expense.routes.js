const express = require('express');
const ExpenseController = require('./expense.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');
const fileUploader = require('../../utils/fileUploader');

const router = express.Router();

router.use(auth);

// Static routes
router.get('/report/total-expenses', ExpenseController.getTotalExpenses);
router.get('/report/pending-approvals', ExpenseController.getPendingApprovals);
router.get('/report/total-pending', ExpenseController.getTotalPendingAmount);

// CRUD
router.post('/', accountantOrDirector, fileUploader, ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/:id', ExpenseController.getExpenseById);
router.put('/:id', accountantOrDirector, fileUploader, ExpenseController.updateExpense);

// Status / archive
router.delete('/:id', directorOnly, ExpenseController.deleteExpense);
router.post('/:id/restore', directorOnly, ExpenseController.restoreExpense);

// Approval
router.patch('/:id/approve', directorOnly, ExpenseController.approveExpense);
router.patch('/:id/reject', directorOnly, ExpenseController.rejectExpense);

module.exports = router;