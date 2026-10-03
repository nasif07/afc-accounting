const express = require("express");
const BankController = require("./bank.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
  createBankAccountBody,
  updateBankAccountBody,
  reorderBankAccountsBody,
  getAllBankAccountsQuery,
  getBankTransactionsQuery,
  getBankReportQuery,
  idParam,
} = require("../../validation/bank.validation");

const router = express.Router();

router.use(auth);

// Static routes BEFORE dynamic /:id
router.get("/report/total-balance", BankController.getTotalBankBalance);
router.get("/report/fdr-summary", BankController.getFdrSummary);
router.post(
  "/",
  accountantOrDirector,
  validate({ body: createBankAccountBody }),
  BankController.createBankAccount,
);
router.get(
  "/",
  validate({ query: getAllBankAccountsQuery }),
  BankController.getAllBankAccounts,
);
router.patch(
  "/reorder",
  accountantOrDirector,
  validate({ body: reorderBankAccountsBody }),
  BankController.reorderBankAccounts,
);

// Dynamic routes
router.get(
  "/:id/transactions",
  validate({ params: idParam, query: getBankTransactionsQuery }),
  BankController.getBankTransactions,
);
router.get(
  "/:id/report",
  validate({ params: idParam, query: getBankReportQuery }),
  BankController.getBankReport,
);
router.get(
  "/:id",
  validate({ params: idParam }),
  BankController.getBankAccountById,
);
router.put(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam, body: updateBankAccountBody }),
  BankController.updateBankAccount,
);
router.delete(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam }),
  BankController.deleteBankAccount,
);

module.exports = router;
