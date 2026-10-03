const express = require('express');
const SearchController = require('./search.controller');
const auth = require('../../middleware/auth');
const validate = require('../../validation/validate');
const { globalSearchQuery } = require('../../validation/search.validation');

const router = express.Router();

router.use(auth);

// Global (cross-module) search behind the header search drawer. No roleCheck
// middleware: every authenticated role may search, but SearchService.globalSearch
// decides which collections that role's results can come from, so the guard is
// per-result-type rather than per-route.
router.get(
  '/',
  validate({ query: globalSearchQuery }),
  SearchController.globalSearch,
);

router.get('/journal-entries', SearchController.searchJournalEntries);

module.exports = router;
