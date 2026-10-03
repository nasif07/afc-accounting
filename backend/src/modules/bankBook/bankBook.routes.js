const express = require("express");
const BankBookController = require("./bankBook.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");

const router = express.Router();

router.use(auth);
router.use(accountantOrDirector);

router.post("/", BankBookController.createTransaction);
router.get("/statement", BankBookController.getStatement);
router.get("/export/excel", BankBookController.exportExcel);
router.get("/export/pdf", BankBookController.exportPdf);
router.patch("/:id/cancel", BankBookController.cancelTransaction);

module.exports = router;
