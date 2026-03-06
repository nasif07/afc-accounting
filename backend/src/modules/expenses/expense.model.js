const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES, PAYMENT_MODES, APPROVAL_STATUS } = require('../../config/constants');

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORIES),
      required: true
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    paymentMode: {
      type: String,
      enum: Object.values(PAYMENT_MODES),
      required: true
    },
    referenceNumber: String,
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    invoiceNumber: String,
    invoiceDate: Date,
    billAmount: Number,
    attachments: [String],
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: Date,
    rejectionReason: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
