const mongoose = require("mongoose");

const vendorInvoiceSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
    },
    relatedJournalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    attachments: [String],
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

vendorInvoiceSchema.index({ vendor: 1, status: 1 });
vendorInvoiceSchema.index({ invoiceNumber: 1 });
vendorInvoiceSchema.index({ dueDate: 1 });
vendorInvoiceSchema.index({ createdBy: 1 });
vendorInvoiceSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("VendorInvoice", vendorInvoiceSchema);
