const { z } = require("zod");
const { objectId, idParam, paginationQuery } = require("./common");

const ACCOUNT_TYPES = ["savings", "current", "checking", "money-market"];

const createBankAccountBody = z.object({
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  accountHolderName: z.string().trim().min(1, "Account holder name is required"),
  branchName: z.string().trim().optional(),
  accountType: z.enum(ACCOUNT_TYPES),
  coaAccount: objectId,
});

// bank.controller.updateBankAccount already rejects immutable fields
// (accountNumber/coaAccount/createdBy/createdAt) with a specific error
// message — passthrough here so that check still runs. openingBalance is
// deliberately NOT among them: it isn't a Bank field at all (it lives on the
// linked COA account), so the controller quietly strips it instead of
// erroring, which keeps older cached clients that still submit it working.
// Passthrough is what lets it reach that strip. The create schema above has
// no such escape hatch by design — zod strips the unknown key outright.
const updateBankAccountBody = z
  .object({
    bankName: z.string().trim().min(1).optional(),
    accountHolderName: z.string().trim().min(1).optional(),
    branchName: z.string().trim().optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
  })
  .passthrough();

// The Bank & Cash screen sends its full on-screen card order. The service
// tolerates a stale list (see reorderBankAccounts), so the only constraints
// worth enforcing here are shape and a sane upper bound.
const reorderBankAccountsBody = z.object({
  order: z.array(objectId).min(1, "At least one account id is required").max(500),
});

const getAllBankAccountsQuery = paginationQuery.extend({
  bankName: z.string().trim().optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
});

const getBankTransactionsQuery = paginationQuery.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.string().optional(),
  search: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
});

const getBankReportQuery = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

module.exports = {
  createBankAccountBody,
  updateBankAccountBody,
  reorderBankAccountsBody,
  getAllBankAccountsQuery,
  getBankTransactionsQuery,
  getBankReportQuery,
  idParam,
};
