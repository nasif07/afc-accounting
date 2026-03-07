const express = require('express');
const ReportController = require('./report.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/income-statement', ReportController.getIncomeStatement);
router.get('/balance-sheet', ReportController.getBalanceSheet);
router.get('/cash-flow', ReportController.getCashFlowStatement);
router.get('/receipt-payment', ReportController.getReceiptPaymentSummary);
router.get('/headwise-income', ReportController.getHeadwiseIncomeReport);
router.get('/trial-balance', ReportController.getTrialBalance);

module.exports = router;
