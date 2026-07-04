const express = require('express');
const SearchController = require('./search.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/journal-entries', SearchController.searchJournalEntries);

module.exports = router;
