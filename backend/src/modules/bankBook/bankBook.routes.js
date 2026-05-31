const express = require("express");
const BankBookController = require("./bankBook.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

router.use(auth);
router.use(accountantOrDirector);

router.get("/", BankBookController.getTransactions);
router.post("/", BankBookController.createTransaction);
router.get("/statement", BankBookController.getStatement);
router.get("/export/csv", BankBookController.exportCsv);
router.get("/export/excel", BankBookController.exportExcel);
router.get("/export/pdf", BankBookController.exportPdf);
router.get("/:id", BankBookController.getTransaction);
router.put("/:id", BankBookController.updateTransaction);
router.patch("/:id/cancel", BankBookController.cancelTransaction);

module.exports = router;
