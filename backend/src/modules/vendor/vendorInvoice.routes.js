const express = require("express");
const VendorInvoice = require("./vendorInvoice.model");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");
const ApiResponse = require("../../utils/apiResponse");

const router = express.Router();

router.use(auth);

router.post("/", accountantOrDirector, async (req, res, next) => {
  try {
    const invoiceData = { ...req.body, createdBy: req.user.userId };
    const invoice = await VendorInvoice.create(invoiceData);
    return ApiResponse.created(res, invoice, "Vendor invoice created successfully");
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const invoices = await VendorInvoice.find({ deletedAt: null })
      .populate("vendor", "vendorName vendorCode")
      .sort({ createdAt: -1 });
    return ApiResponse.success(res, invoices, "Vendor invoices retrieved successfully");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
