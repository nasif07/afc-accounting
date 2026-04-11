const express = require("express");
const BankController = require("./bank.controller");
const auth = require("../../middleware/auth");
const { directorOnly, accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

/**
 * CRITICAL: Static routes BEFORE dynamic routes
 * Prevents /:id from matching /report/total-balance
 */

// ==================== REPORTS ====================
// Get total balance across all bank accounts
router.get("/report/total-balance", BankController.getTotalBankBalance);

// ==================== CRUD OPERATIONS ====================
// Create new bank account (director only)
router.post("/", directorOnly, BankController.createBankAccount);

// Get all bank accounts (authenticated users)
router.get("/", BankController.getAllBankAccounts);

// ==================== DYNAMIC ROUTES (LAST) ====================
// Get specific bank account by ID
router.get("/:id", BankController.getBankAccountById);

// Update bank account (director only)
router.put("/:id", directorOnly, BankController.updateBankAccount);

// Soft delete bank account (director only)
router.delete("/:id", directorOnly, BankController.deleteBankAccount);

// ==================== RECONCILIATION ====================
// Get reconciliation status for a bank account
router.get("/:id/reconciliation/status", BankController.getReconciliationStatus);

// Reconcile a bank account (director only)
router.put("/:id/reconciliation", directorOnly, BankController.reconcileBankAccount);

// ==================== ARCHIVE/RESTORE ====================
// Archive a bank account (director only)
router.patch("/:id/archive", directorOnly, BankController.archiveBankAccount);

// Restore an archived bank account (director only)
router.patch("/:id/restore", directorOnly, BankController.restoreBankAccount);

// ==================== VALIDATION ====================
// Validate if bank account can be deactivated
router.post("/:id/validate-deactivate", directorOnly, BankController.validateCanDeactivate);

module.exports = router;
