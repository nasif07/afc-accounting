const express = require('express');
const ExpenseController = require('./expense.controller');
const { authenticate, directorOnly, accountantOrDirector } = require('../../middleware/auth');
const fileUploader = require('../../utils/fileUploader');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Static routes (must come before dynamic :id routes)
router.get('/report/total-expenses', ExpenseController.getTotalExpenses);
router.get('/report/pending-approvals', ExpenseController.getPendingApprovals);
router.get('/report/total-pending', ExpenseController.getTotalPendingAmount);

// CRUD operations
router.post('/', accountantOrDirector, fileUploader, ExpenseController.createExpense);
router.get('/', ExpenseController.getAllExpenses);
router.get('/:id', ExpenseController.getExpenseById);
router.put('/:id', accountantOrDirector, fileUploader, ExpenseController.updateExpense);
router.delete('/:id', directorOnly, ExpenseController.deleteExpense);
router.post('/:id/restore', directorOnly, ExpenseController.restoreExpense);

// Approval operations (Director only)
router.patch('/:id/approve', directorOnly, ExpenseController.approveExpense);
router.patch('/:id/reject', directorOnly, ExpenseController.rejectExpense);

module.exports = router;
