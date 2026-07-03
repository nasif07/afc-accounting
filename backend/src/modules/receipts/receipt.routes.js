const express = require("express");
const ReceiptController = require("./receipt.controller");
const auth = require("../../middleware/auth");
const {
  directorOnly,
  accountantOrDirector,
} = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
  createReceiptBody,
  updateReceiptBody,
  rejectReceiptBody,
  getAllReceiptsQuery,
  idParam,
} = require("../../validation/receipt.validation");

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD operations
router.post(
  "/",
  accountantOrDirector,
  validate({ body: createReceiptBody }),
  ReceiptController.createReceipt,
);
router.get(
  "/",
  validate({ query: getAllReceiptsQuery }),
  ReceiptController.getAllReceipts,
);
router.get(
  "/:id",
  validate({ params: idParam }),
  ReceiptController.getReceiptById,
);
router.put(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam, body: updateReceiptBody }),
  ReceiptController.updateReceipt,
);
router.delete(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam }),
  ReceiptController.deleteReceipt,
);

// Approval operations (Director only)
router.put(
  "/:id/approve",
  directorOnly,
  validate({ params: idParam }),
  ReceiptController.approveReceipt,
);
router.put(
  "/:id/reject",
  directorOnly,
  validate({ params: idParam, body: rejectReceiptBody }),
  ReceiptController.rejectReceipt,
);

module.exports = router;
