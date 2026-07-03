const express = require("express");
const BankController = require("./bank.controller");
const auth = require("../../middleware/auth");
const { directorOnly } = require("../../middleware/roleCheck");

const router = express.Router();

router.use(auth);

// Static routes BEFORE dynamic /:id
router.get("/report/total-balance", BankController.getTotalBankBalance);
router.post("/", directorOnly, BankController.createBankAccount);
router.get("/", BankController.getAllBankAccounts);

// Dynamic routes
router.get("/:id/transactions", BankController.getBankTransactions);
router.get("/:id", BankController.getBankAccountById);
router.put("/:id", directorOnly, BankController.updateBankAccount);
router.delete("/:id", directorOnly, BankController.deleteBankAccount);
router.put("/:id/reconciliation", directorOnly, BankController.reconcileBankAccount);

module.exports = router;
