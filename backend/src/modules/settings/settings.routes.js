const express = require('express');
const SettingsController = require('./settings.controller');
const auth = require('../../middleware/auth');
const { directorOnly } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.get('/', SettingsController.getSettings);
router.put('/', directorOnly, SettingsController.updateSettings);

module.exports = router;
