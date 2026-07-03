const express = require("express");
const BankController = require("./bank.controller");
const auth = require("../../middleware/auth");
const { directorOnly } = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
  createBankAccountBody,
  updateBankAccountBody,
  reconcileBankAccountBody,
  getAllBankAccountsQuery,
  getBankTransactionsQuery,
  idParam,
} = require("../../validation/bank.validation");

const router = express.Router();

router.use(auth);

// Static routes BEFORE dynamic /:id
router.get("/report/total-balance", BankController.getTotalBankBalance);
router.post(
  "/",
  directorOnly,
  validate({ body: createBankAccountBody }),
  BankController.createBankAccount,
);
router.get(
  "/",
  validate({ query: getAllBankAccountsQuery }),
  BankController.getAllBankAccounts,
);

// Dynamic routes
router.get(
  "/:id/transactions",
  validate({ params: idParam, query: getBankTransactionsQuery }),
  BankController.getBankTransactions,
);
router.get(
  "/:id",
  validate({ params: idParam }),
  BankController.getBankAccountById,
);
router.put(
  "/:id",
  directorOnly,
  validate({ params: idParam, body: updateBankAccountBody }),
  BankController.updateBankAccount,
);
router.delete(
  "/:id",
  directorOnly,
  validate({ params: idParam }),
  BankController.deleteBankAccount,
);
router.put(
  "/:id/reconciliation",
  directorOnly,
  validate({ params: idParam, body: reconcileBankAccountBody }),
  BankController.reconcileBankAccount,
);

module.exports = router;
