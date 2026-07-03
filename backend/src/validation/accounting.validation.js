const { z } = require("zod");
const { TRANSACTION_TYPES } = require("../config/constants");
const { objectId, idParam, paginationQuery, requiredDate } = require("./common");

const bookEntrySchema = z
  .object({
    account: objectId,
    debit: z.coerce.number().min(0, "Debit cannot be negative").optional(),
    credit: z.coerce.number().min(0, "Credit cannot be negative").optional(),
    description: z.string().trim().optional(),
  })
  .refine(
    (entry) => !((entry.debit || 0) > 0 && (entry.credit || 0) > 0),
    { message: "A line cannot contain both debit and credit" },
  )
  .refine(
    (entry) => (entry.debit || 0) > 0 || (entry.credit || 0) > 0,
    { message: "Each line must have either a debit or credit amount" },
  );

const createJournalEntryBody = z.object({
  voucherNumber: z.string().trim().optional(),
  voucherDate: requiredDate("Voucher date"),
  transactionType: z.enum(Object.values(TRANSACTION_TYPES)),
  description: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
  bookEntries: z.array(bookEntrySchema).min(2, "Journal entry must have at least 2 line items"),
  // The controller normalizes these rather than rejecting on bad shape
  // (non-array attachments -> [], anything !== false -> requiresApproval
  // true), so they're intentionally left unconstrained here to match.
  attachments: z.any().optional(),
  requiresApproval: z.any().optional(),
});

// accounting.controller.updateEntry already rejects a fixed list of
// forbidden fields (approvalStatus, status, totalDebit, etc.) with a
// specific per-field error message — passthrough here so that check
// still runs against the fields exactly as sent.
const updateEntryBody = z
  .object({
    voucherNumber: z.string().trim().optional(),
    voucherDate: z.coerce.date().optional(),
    transactionType: z.enum(Object.values(TRANSACTION_TYPES)).optional(),
    description: z.string().trim().optional(),
    referenceNumber: z.string().trim().optional(),
    bookEntries: z
      .array(bookEntrySchema)
      .min(2, "Journal entry must have at least 2 line items")
      .optional(),
    attachments: z.array(z.string()).optional(),
  })
  .passthrough();

const rejectEntryBody = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
});

const getAllEntriesQuery = paginationQuery.extend({
  transactionType: z.enum(Object.values(TRANSACTION_TYPES)).optional(),
  approvalStatus: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const trialBalanceQuery = z.object({
  asOfDate: z.coerce.date().optional(),
});

const balanceSheetQuery = z.object({
  asOfDate: z.coerce.date().optional(),
});

const dateRangeQuery = z.object({
  startDate: requiredDate("Start date"),
  endDate: requiredDate("End date"),
});

const ledgerParams = z.object({
  accountId: objectId,
});

const ledgerQuery = paginationQuery.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

module.exports = {
  createJournalEntryBody,
  updateEntryBody,
  rejectEntryBody,
  getAllEntriesQuery,
  trialBalanceQuery,
  balanceSheetQuery,
  dateRangeQuery,
  ledgerParams,
  ledgerQuery,
  idParam,
};
