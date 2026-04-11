const express = require('express');
const VendorController = require('./vendor.controller');
const { authenticate, directorOnly, accountantOrDirector } = require('../../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Static routes (must come before dynamic :id routes)
router.get('/report/total-payables', VendorController.getTotalPayables);

// Dynamic routes
router.post('/', accountantOrDirector, VendorController.createVendor);
router.get('/', VendorController.getAllVendors);
router.get('/:id', VendorController.getVendorById);
router.put('/:id', accountantOrDirector, VendorController.updateVendor);
router.delete('/:id', directorOnly, VendorController.deleteVendor);
router.post('/:id/restore', directorOnly, VendorController.restoreVendor);
router.get('/:id/payables', VendorController.getVendorPayables);
router.patch('/:id/deactivate', directorOnly, VendorController.deactivateVendor);
router.patch('/:id/activate', directorOnly, VendorController.activateVendor);

module.exports = router;
