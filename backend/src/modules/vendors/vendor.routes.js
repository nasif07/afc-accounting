const express = require('express');
const VendorController = require('./vendor.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// Static routes
router.get('/report/total-payables', VendorController.getTotalPayables);

// CRUD
router.post('/', accountantOrDirector, VendorController.createVendor);
router.get('/', VendorController.getAllVendors);
router.get('/:id', VendorController.getVendorById);
router.put('/:id', accountantOrDirector, VendorController.updateVendor);

// Status / archive
router.delete('/:id', directorOnly, VendorController.deleteVendor);
router.post('/:id/restore', directorOnly, VendorController.restoreVendor);
router.patch('/:id/deactivate', directorOnly, VendorController.deactivateVendor);
router.patch('/:id/activate', directorOnly, VendorController.activateVendor);

// Vendor-related reports/data
router.get('/:id/payables', VendorController.getVendorPayables);

module.exports = router;