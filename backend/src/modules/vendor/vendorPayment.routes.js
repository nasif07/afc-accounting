const express = require("express");
const VendorPayment = require("./vendorPayment.model");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");
const ApiResponse = require("../../utils/apiResponse");

const router = express.Router();

router.use(auth);

router.post("/", accountantOrDirector, async (req, res, next) => {
  try {
    const paymentData = { ...req.body, createdBy: req.user.userId };
    const payment = await VendorPayment.create(paymentData);
    return ApiResponse.created(res, payment, "Vendor payment recorded successfully");
  } catch (error) { 
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const payments = await VendorPayment.find({ deletedAt: null })
      .populate("vendor", "vendorName vendorCode")
      .sort({ createdAt: -1 });
    return ApiResponse.success(res, payments, "Vendor payments retrieved successfully");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
