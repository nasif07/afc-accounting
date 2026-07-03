const express = require("express");
const AccountingController = require("./accounting.controller");
const auth = require("../../middleware/auth");
const {
  directorOnly,
  accountantOrDirector,
} = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
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
} = require("../../validation/accounting.validation");

const router = express.Router();

router.use(auth);

// Journal entry list + create
router.post(
  "/journal-entries",
  accountantOrDirector,
  validate({ body: createJournalEntryBody }),
  AccountingController.createJournalEntry,
);
router.get(
  "/journal-entries",
  accountantOrDirector,
  validate({ query: getAllEntriesQuery }),
  AccountingController.getAllEntries,
);

// Static / special routes
router.get(
  "/journal-entries/pending-approvals",
  directorOnly,
  AccountingController.getPendingApprovals,
);
router.get(
  "/journal-entries/trial-balance",
  accountantOrDirector,
  validate({ query: trialBalanceQuery }),
  AccountingController.getTrialBalanceReport,
);
router.get(
  "/journal-entries/income-statement",
  accountantOrDirector,
  validate({ query: dateRangeQuery }),
  AccountingController.getIncomeStatementReport,
);
router.get(
  "/journal-entries/balance-sheet",
  accountantOrDirector,
  validate({ query: balanceSheetQuery }),
  AccountingController.getBalanceSheetReport,
);
router.get(
  "/journal-entries/cash-flow",
  accountantOrDirector,
  validate({ query: dateRangeQuery }),
  AccountingController.getCashFlowReport,
);
router.get(
  "/journal-entries/ledger/:accountId",
  accountantOrDirector,
  validate({ params: ledgerParams, query: ledgerQuery }),
  AccountingController.getGeneralLedger,
);
// Single entry routes
router.get(
  "/journal-entries/:id",
  accountantOrDirector,
  validate({ params: idParam }),
  AccountingController.getEntryById,
);
router.put(
  "/journal-entries/:id",
  accountantOrDirector,
  validate({ params: idParam, body: updateEntryBody }),
  AccountingController.updateEntry,
);
router.delete(
  "/journal-entries/:id",
  accountantOrDirector,
  validate({ params: idParam }),
  AccountingController.deleteEntry,
);

// Approval operations
router.patch(
  "/journal-entries/:id/approve",
  directorOnly,
  validate({ params: idParam }),
  AccountingController.approveEntry,
);
router.patch(
  "/journal-entries/:id/reject",
  directorOnly,
  validate({ params: idParam, body: rejectEntryBody }),
  AccountingController.rejectEntry,
);

module.exports = router;
