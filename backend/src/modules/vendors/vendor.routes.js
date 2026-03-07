const express = require('express');
const VendorController = require('./vendor.controller');
const auth = require('../../middleware/auth');
const { accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.post('/', accountantOrDirector, VendorController.createVendor);
router.get('/', VendorController.getAllVendors);
router.get('/:id', VendorController.getVendorById);
router.put('/:id', accountantOrDirector, VendorController.updateVendor);
router.delete('/:id', accountantOrDirector, VendorController.deleteVendor);
router.get('/:id/payables', VendorController.getVendorPayables);
router.get('/report/total-payables', VendorController.getTotalPayables);

module.exports = router;
