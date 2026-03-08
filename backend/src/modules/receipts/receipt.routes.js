const express = require("express");
const ReceiptController = require("./receipt.controller");
const auth = require("../../middleware/auth");
const {
  directorOnly,
  accountantOrDirector,
} = require("../../middleware/roleCheck");

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD operations
router.post("/", accountantOrDirector, ReceiptController.createReceipt);
router.get("/", ReceiptController.getAllReceipts);
router.get("/:id", ReceiptController.getReceiptById);
router.put("/:id", accountantOrDirector, ReceiptController.updateReceipt);
router.delete("/:id", accountantOrDirector, ReceiptController.deleteReceipt);

// Approval operations (Director only)
router.put("/:id/approve", directorOnly, ReceiptController.approveReceipt);
router.put("/:id/reject", directorOnly, ReceiptController.rejectReceipt);

// Reports
router.get("/report/total-collected", ReceiptController.getTotalFeeCollected);

module.exports = router;
