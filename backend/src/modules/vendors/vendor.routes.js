const express = require('express');
const VendorController = require('./vendor.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

// CRUD
router.post('/', accountantOrDirector, VendorController.createVendor);
router.get('/', VendorController.getAllVendors);
router.get('/:id', VendorController.getVendorById);
router.put('/:id', accountantOrDirector, VendorController.updateVendor);
router.delete('/:id', directorOnly, VendorController.deleteVendor);

module.exports = router;
