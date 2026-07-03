const express = require('express');
const ExpenseController = require('./expense.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');
const fileUploader = require('../../utils/fileUploader');
const validate = require('../../validation/validate');
const {
  createExpenseBody,
  updateExpenseBody,
  getAllExpensesQuery,
  idParam,
} = require('../../validation/expense.validation');

const router = express.Router();

router.use(auth);

// CRUD
router.post(
  '/',
  accountantOrDirector,
  validate({ body: createExpenseBody }),
  fileUploader,
  ExpenseController.createExpense,
);
router.get(
  '/',
  validate({ query: getAllExpensesQuery }),
  ExpenseController.getAllExpenses,
);
router.get(
  '/:id',
  validate({ params: idParam }),
  ExpenseController.getExpenseById,
);
router.put(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam, body: updateExpenseBody }),
  fileUploader,
  ExpenseController.updateExpense,
);
router.delete(
  '/:id',
  directorOnly,
  validate({ params: idParam }),
  ExpenseController.deleteExpense,
);

// Approval
router.patch(
  '/:id/approve',
  directorOnly,
  validate({ params: idParam }),
  ExpenseController.approveExpense,
);

module.exports = router;
