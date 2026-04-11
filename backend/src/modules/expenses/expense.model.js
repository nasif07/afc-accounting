const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES, PAYMENT_MODES, APPROVAL_STATUS } = require('../../config/constants');

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: [true, 'Expense number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORIES),
      required: [true, 'Please provide an expense category'],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0, 'Amount cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: Object.values(PAYMENT_MODES),
      required: [true, 'Please specify payment mode'],
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    chequeNumber: {
      type: String,
      trim: true,
    },
    chequeDate: Date,
    bankName: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    invoiceDate: Date,
    billAmount: {
      type: Number,
      min: 0,
    },
    attachments: [String],
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    rejectionReason: {
      type: String,
      trim: true,
    },
    // Accounting integration fields
    coaAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      validate: {
        async: true,
        validator: async function (value) {
          if (!value) return true; // Optional for now
          const ChartOfAccounts = require('../chartOfAccounts/coa.model');
          const account = await ChartOfAccounts.findOne({
            _id: value,
            deletedAt: null,
            status: 'active',
          });
          return !!account;
        },
        message: 'COA account must be active and not deleted',
      },
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    accountingStatus: {
      type: String,
      enum: ['pending', 'posted', 'reversed'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Index for soft delete queries
expenseSchema.index({ deletedAt: 1 });
expenseSchema.index({ expenseNumber: 1, deletedAt: 1 });
expenseSchema.index({ approvalStatus: 1, deletedAt: 1 });
expenseSchema.index({ date: -1, deletedAt: 1 });

// Query helper to exclude deleted expenses
expenseSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Expense', expenseSchema);
