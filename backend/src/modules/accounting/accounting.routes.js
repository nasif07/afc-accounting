const express = require("express");
const AccountingController = require("./accounting.controller");
const auth = require("../../middleware/auth");
const {
  directorOnly,
  accountantOrDirector,
} = require("../../middleware/roleCheck");

const router = express.Router();

router.use(auth);

// Journal entry list + create
router.post(
  "/journal-entries",
  accountantOrDirector,
  AccountingController.createJournalEntry,
);
router.get("/journal-entries", AccountingController.getAllEntries);

// Static/special routes before :id
router.get(
  "/journal-entries/pending-approvals",
  directorOnly,
  AccountingController.getPendingApprovals,
);
router.get(
  "/journal-entries/trial-balance",
  accountantOrDirector,
  AccountingController.getTrialBalanceReport,
);
router.get(
  "/journal-entries/income-statement",
  accountantOrDirector,
  AccountingController.getIncomeStatementReport,
);
router.get(
  "/journal-entries/balance-sheet",
  accountantOrDirector,
  AccountingController.getBalanceSheetReport,
);
router.get(
  "/journal-entries/cash-flow",
  accountantOrDirector,
  AccountingController.getCashFlowReport,
);
router.get(
  "/journal-entries/ledger/:accountId",
  accountantOrDirector,
  AccountingController.getGeneralLedger,
);
router.get(
  "/journal-entries/balance/:accountId",
  accountantOrDirector,
  AccountingController.getAccountBalance,
);
router.get(
  "/journal-entries/account/:accountId",
  accountantOrDirector,
  AccountingController.getEntriesByAccount,
);

// Single entry routes
router.get("/journal-entries/:id", AccountingController.getEntryById);
router.put(
  "/journal-entries/:id",
  accountantOrDirector,
  AccountingController.updateEntry,
);
router.delete(
  "/journal-entries/:id",
  accountantOrDirector,
  AccountingController.deleteEntry,
);

// Approval operations
router.patch(
  "/journal-entries/:id/approve",
  directorOnly,
  AccountingController.approveEntry,
);
router.patch(
  "/journal-entries/:id/reject",
  directorOnly,
  AccountingController.rejectEntry,
);

module.exports = router;
