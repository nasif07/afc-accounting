const express = require('express');
const VendorController = require('./vendor.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');
const validate = require('../../validation/validate');
const {
  createVendorBody,
  updateVendorBody,
  getAllVendorsQuery,
  idParam,
} = require('../../validation/vendor.validation');

const router = express.Router();

router.use(auth);

// CRUD
router.post(
  '/',
  accountantOrDirector,
  validate({ body: createVendorBody }),
  VendorController.createVendor,
);
router.get(
  '/',
  validate({ query: getAllVendorsQuery }),
  VendorController.getAllVendors,
);
router.get(
  '/:id',
  validate({ params: idParam }),
  VendorController.getVendorById,
);
router.put(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam, body: updateVendorBody }),
  VendorController.updateVendor,
);
router.delete(
  '/:id',
  directorOnly,
  validate({ params: idParam }),
  VendorController.deleteVendor,
);

module.exports = router;
