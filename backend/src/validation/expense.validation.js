const { z } = require("zod");
const { EXPENSE_CATEGORIES, PAYMENT_MODES, APPROVAL_STATUS } = require("../config/constants");
const { objectId, idParam, paginationQuery } = require("./common");

const createExpenseBody = z.object({
  expenseNumber: z.string().trim().min(1, "Expense number is required"),
  category: z.enum(Object.values(EXPENSE_CATEGORIES)),
  vendor: objectId.optional(),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date().optional(),
  paymentMode: z.enum(Object.values(PAYMENT_MODES)),
  referenceNumber: z.string().trim().optional(),
  chequeNumber: z.string().trim().optional(),
  chequeDate: z.coerce.date().optional(),
  bankName: z.string().trim().optional(),
  invoiceNumber: z.string().trim().optional(),
  invoiceDate: z.coerce.date().optional(),
  billAmount: z.coerce.number().min(0).optional(),
  coaAccount: objectId.optional(),
});

// expense.service.updateExpense already rejects immutable fields
// (expenseNumber/createdBy/createdAt/journalEntryId/accountingStatus) with
// a specific error message — passthrough here so that check still runs
// against the fields as sent, instead of Zod silently stripping them first.
const updateExpenseBody = z
  .object({
    category: z.enum(Object.values(EXPENSE_CATEGORIES)).optional(),
    vendor: objectId.optional(),
    description: z.string().trim().min(1).optional(),
    amount: z.coerce.number().positive("Amount must be greater than 0").optional(),
    date: z.coerce.date().optional(),
    paymentMode: z.enum(Object.values(PAYMENT_MODES)).optional(),
    referenceNumber: z.string().trim().optional(),
    coaAccount: objectId.optional(),
  })
  .passthrough();

const getAllExpensesQuery = paginationQuery.extend({
  category: z.enum(Object.values(EXPENSE_CATEGORIES)).optional(),
  vendor: objectId.optional(),
  approvalStatus: z.enum(Object.values(APPROVAL_STATUS)).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

module.exports = {
  createExpenseBody,
  updateExpenseBody,
  getAllExpensesQuery,
  idParam,
};
