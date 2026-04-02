const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    invoices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorInvoice",
    }],
    paymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bank-transfer", "cheque", "cash", "credit-card"],
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    relatedJournalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    relatedBankTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankTransaction",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

vendorPaymentSchema.index({ vendor: 1, paymentDate: 1 });
vendorPaymentSchema.index({ paymentDate: 1 });
vendorPaymentSchema.index({ createdBy: 1 });
vendorPaymentSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);
