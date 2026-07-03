const { z } = require("zod");
const { ACCOUNT_TYPES } = require("../config/constants");
const { objectId, idParam } = require("./common");

const accountTypeValues = Object.values(ACCOUNT_TYPES).map((t) => String(t).toLowerCase());

const createAccountBody = z.object({
  accountCode: z.string().trim().regex(/^\d+$/, "Account code must be numeric"),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountType: z.string().trim().toLowerCase().pipe(z.enum(accountTypeValues)),
  description: z.string().trim().optional(),
  openingBalance: z.coerce.number().min(0, "Opening balance must be a valid non-negative number").optional(),
  openingBalanceType: z.enum(["debit", "credit"]).optional(),
  openingDate: z.coerce.date().optional(),
  parentAccount: objectId.optional(),
});

// coa.controller.updateAccount already whitelists exactly these fields
// via its own allowedFields loop (anything else is silently ignored),
// so validating this same set doesn't change what's accepted.
const updateAccountBody = z.object({
  accountCode: z.string().trim().regex(/^\d+$/, "Account code must be numeric").optional(),
  accountName: z.string().trim().min(1).optional(),
  accountType: z.string().trim().toLowerCase().pipe(z.enum(accountTypeValues)).optional(),
  description: z.string().trim().optional(),
  openingBalance: z.coerce.number().min(0, "Opening balance must be a valid non-negative number").optional(),
  openingBalanceType: z.enum(["debit", "credit"]).optional(),
  openingDate: z.coerce.date().optional(),
  parentAccount: objectId.nullable().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

const getAllAccountsQuery = z.object({
  accountType: z.string().optional(),
  status: z.string().optional(),
  leafNodesOnly: z.string().optional(),
  includeDeleted: z.string().optional(),
});

const getLeafNodesQuery = z.object({
  accountType: z.string().optional(),
});

const getAccountTreeQuery = z.object({
  includeDeleted: z.string().optional(),
  status: z.string().optional(),
});

const updateAccountStatusBody = z.object({
  status: z.enum(["active", "inactive", "archived"]),
});

module.exports = {
  createAccountBody,
  updateAccountBody,
  getAllAccountsQuery,
  getLeafNodesQuery,
  getAccountTreeQuery,
  updateAccountStatusBody,
  idParam,
};
