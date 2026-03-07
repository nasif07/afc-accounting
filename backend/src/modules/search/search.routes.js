const express = require('express');
const SearchController = require('./search.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', SearchController.globalSearch);
router.get('/receipts', SearchController.searchReceipts);
router.get('/expenses', SearchController.searchExpenses);
router.get('/journal-entries', SearchController.searchJournalEntries);
router.get('/students', SearchController.searchStudents);
router.get('/amount-range', SearchController.searchByAmountRange);

module.exports = router;
