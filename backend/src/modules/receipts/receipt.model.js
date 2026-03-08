const mongoose = require("mongoose");
const {
  FEE_TYPES,
  PAYMENT_MODES,
  APPROVAL_STATUS,
} = require("../../config/constants");

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeType: {
      type: String,
      enum: Object.values(FEE_TYPES),
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Please provide an amount"],
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: Object.values(PAYMENT_MODES),
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    cardNumber: String,
    transactionId: String,
    description: String,
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pdfPath: String,
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Receipt", receiptSchema);
