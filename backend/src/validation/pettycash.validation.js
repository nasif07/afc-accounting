const { z } = require("zod");
const { objectId, idParam, paginationQuery } = require("./common");

const createPettyCashBody = z.object({
  expenseAccount: objectId,
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date().optional(),
  paymentMode: z.string().trim().optional(),
  paidTo: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

// updatePettyCash's service layer already blocks immutable fields
// (pettyCashNumber, createdBy, journalEntryId, accountingStatus); this
// only type/shape-checks the editable fields when present.
const updatePettyCashBody = z
  .object({
    expenseAccount: objectId.optional(),
    description: z.string().trim().min(1).optional(),
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .optional(),
    date: z.coerce.date().optional(),
    paymentMode: z.string().trim().optional(),
    paidTo: z.string().trim().optional(),
    referenceNumber: z.string().trim().optional(),
    note: z.string().trim().optional(),
  })
  .passthrough();

const rejectPettyCashBody = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
});

const getAllPettyCashQuery = paginationQuery.extend({
  expenseAccount: objectId.optional(),
  paymentMode: z.string().optional(),
  approvalStatus: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const getPettyCashTransactionsQuery = paginationQuery.extend({
  search: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const getPettyCashReportQuery = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

module.exports = {
  createPettyCashBody,
  updatePettyCashBody,
  rejectPettyCashBody,
  getAllPettyCashQuery,
  getPettyCashTransactionsQuery,
  getPettyCashReportQuery,
  idParam,
};
