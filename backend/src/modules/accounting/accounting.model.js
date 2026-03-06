const mongoose = require('mongoose');
const { TRANSACTION_TYPES, APPROVAL_STATUS } = require('../../config/constants');

const bookEntrySchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    required: true
  },
  debit: {
    type: Number,
    default: 0
  },
  credit: {
    type: Number,
    default: 0
  },
  description: String
});

const journalEntrySchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    voucherDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    transactionType: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true
    },
    bookEntries: [bookEntrySchema],
    totalDebit: {
      type: Number,
      default: 0
    },
    totalCredit: {
      type: Number,
      default: 0
    },
    isBalanced: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true
    },
    referenceNumber: {
      type: String,
      trim: true
    },
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
    },
    attachments: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
