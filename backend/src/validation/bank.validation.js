const { z } = require("zod");
const { objectId, idParam, paginationQuery, requiredDate } = require("./common");

const ACCOUNT_TYPES = ["savings", "current", "checking", "money-market"];

const createBankAccountBody = z.object({
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  accountHolderName: z.string().trim().min(1, "Account holder name is required"),
  branchName: z.string().trim().optional(),
  accountType: z.enum(ACCOUNT_TYPES),
  openingBalance: z.coerce.number().optional(),
  coaAccount: objectId,
});

// bank.controller.updateBankAccount already rejects immutable fields
// (accountNumber/coaAccount/openingBalance/createdBy/createdAt) with a
// specific error message — passthrough here so that check still runs.
const updateBankAccountBody = z
  .object({
    bankName: z.string().trim().min(1).optional(),
    accountHolderName: z.string().trim().min(1).optional(),
    branchName: z.string().trim().optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
  })
  .passthrough();

const reconcileBankAccountBody = z.object({
  reconciledBalance: z.coerce.number(),
  reconciledDate: requiredDate("Reconciliation date"),
  reconciliationId: z.string().trim().optional(),
  statementReference: z.string().trim().optional(),
  transactionIds: z.array(objectId).optional(),
});

const getAllBankAccountsQuery = paginationQuery.extend({
  bankName: z.string().trim().optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
});

const getBankTransactionsQuery = paginationQuery.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.string().optional(),
  reconciliationStatus: z.string().optional(),
  search: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
});

module.exports = {
  createBankAccountBody,
  updateBankAccountBody,
  reconcileBankAccountBody,
  getAllBankAccountsQuery,
  getBankTransactionsQuery,
  idParam,
};
