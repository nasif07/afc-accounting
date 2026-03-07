const express = require('express');
const SettingsController = require('./settings.controller');
const auth = require('../../middleware/auth');
const { directorOnly } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.get('/', SettingsController.getSettings);
router.put('/', directorOnly, SettingsController.updateSettings);
router.get('/financial-year', SettingsController.getFinancialYearSettings);
router.get('/approval-limits', SettingsController.getApprovalLimits);
router.put('/approval-limits', directorOnly, SettingsController.updateApprovalLimits);
router.get('/voucher-format', SettingsController.getVoucherNumberingFormat);
router.put('/voucher-format', directorOnly, SettingsController.updateVoucherPrefixes);

module.exports = router;
