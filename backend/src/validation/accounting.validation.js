const { z } = require("zod");
const { TRANSACTION_TYPES, SOURCE_MODULES } = require("../config/constants");
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

// Edits are narrative-only: a journal entry's amounts, accounts, voucher
// number, transaction type and approval state are permanently immutable
// (corrections go through a reversing entry instead). The only line-level
// field that can change is `description`, so this deliberately does NOT
// reuse `bookEntrySchema` above — that one requires `account` and would
// reject a description-only line payload outright.
//
// Both levels are `.passthrough()` on purpose: accounting.controller
// .updateEntry rejects any non-editable field it finds with a specific,
// actionable message ("... post a reversing entry instead"), which is much
// more useful than a generic Zod "unrecognized key". Stripping the keys here
// would hide them from that check and silently drop them — exactly the
// failure mode this feature is meant to eliminate.
const updateBookEntrySchema = z
  .object({
    description: z.string().trim().optional(),
  })
  .passthrough();

const updateEntryBody = z
  .object({
    voucherDate: z.coerce.date().optional(),
    description: z.string().trim().optional(),
    referenceNumber: z.string().trim().optional(),
    bookEntries: z.array(updateBookEntrySchema).optional(),
    attachments: z.array(z.string()).optional(),
  })
  .passthrough();

const rejectEntryBody = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
});

// sortBy is interpolated straight into a Mongo sort key by getAllEntries, so
// it is constrained to fields that are actually sortable rather than left as
// a free string. Nothing shipped passes a value outside this list.
const SORTABLE_FIELDS = [
  "voucherDate",
  "voucherNumber",
  "totalDebit",
  "totalCredit",
  "createdAt",
];

const getAllEntriesQuery = paginationQuery.extend({
  transactionType: z.enum(Object.values(TRANSACTION_TYPES)).optional(),
  approvalStatus: z.string().optional(),
  status: z.string().optional(),
  sourceModule: z.enum(Object.values(SOURCE_MODULES)).optional(),
  // Matches entries having a book-entry line against this account.
  account: objectId.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
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
