const express = require('express');
const AccountingController = require('./accounting.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.post('/journal-entries', accountantOrDirector, AccountingController.createJournalEntry);
router.get('/journal-entries', AccountingController.getAllEntries);
router.get('/journal-entries/:id', AccountingController.getEntryById);
router.put('/journal-entries/:id', accountantOrDirector, AccountingController.updateEntry);
router.delete('/journal-entries/:id', accountantOrDirector, AccountingController.deleteEntry);

// Approval operations
router.put('/journal-entries/:id/approve', directorOnly, AccountingController.approveEntry);
router.put('/journal-entries/:id/reject', directorOnly, AccountingController.rejectEntry);

module.exports = router;
