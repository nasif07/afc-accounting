const { z } = require("zod");
const { objectId, idParam, paginationQuery, requiredDate } = require("./common");

// Must stay in step with ADJUSTMENT_SECTIONS in bankReconciliation.service.js
// — the six line categories printed on the paper statement.
const ADJUSTMENT_TYPES = [
  "bankCreditsNotInBooks",
  "outstandingCheques",
  "previousDepositsInTransit",
  "previousOutstandingCheques",
  "depositsInTransit",
  "bankCharges",
];

const createReconciliationBody = z.object({
  bankAccount: objectId,
  periodStart: requiredDate("Period start date"),
  periodEnd: requiredDate("Period end date"),
  statementClosingBalance: z.coerce.number().optional(),
});

// The two categories that represent money the bank moved but the books never
// recorded — the only ones that can be auto-posted to the ledger. Must stay in
// step with POSTABLE_TYPES in bankReconciliation.service.js.
const POSTABLE_TYPES = ["bankCreditsNotInBooks", "bankCharges"];

const adjustmentLineBody = z.object({
  journalEntryId: objectId.optional(),
  // The other side of the entry if this line is later posted. Optional —
  // posting falls back to the Settings default and then the seeded code.
  contraAccount: objectId.optional(),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: requiredDate("Date"),
});

const postAdjustmentLineParams = z.object({
  id: objectId,
  type: z.enum(POSTABLE_TYPES),
  lineId: objectId,
});

const postAdjustmentLineBody = z.object({
  contraAccount: objectId.optional(),
});

const finalizeBody = z.object({
  force: z.boolean().optional(),
  // Set when the adjustments were already entered by hand through the
  // journal module, so finalizing shouldn't post them a second time.
  skipPosting: z.boolean().optional(),
});

const addAdjustmentLineBody = z.object({
  type: z.enum(ADJUSTMENT_TYPES),
  line: adjustmentLineBody,
});

const removeAdjustmentLineParams = z.object({
  id: objectId,
  type: z.enum(ADJUSTMENT_TYPES),
  lineId: objectId,
});

const updateBalancesBody = z.object({
  statementClosingBalance: z.coerce.number().optional(),
});

const listReconciliationsQuery = paginationQuery.extend({
  bankAccount: objectId.optional(),
  status: z.enum(["draft", "finalized"]).optional(),
});

module.exports = {
  createReconciliationBody,
  addAdjustmentLineBody,
  removeAdjustmentLineParams,
  postAdjustmentLineParams,
  postAdjustmentLineBody,
  finalizeBody,
  updateBalancesBody,
  listReconciliationsQuery,
  idParam,
};
