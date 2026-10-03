const mongoose = require('mongoose');
const { PAYMENT_MODES } = require('../../config/constants');
const generateVoucherNumber = require('../../utils/generateVoucherNumber');

const pettyCashSchema = new mongoose.Schema(
  {
    pettyCashNumber: {
      type: String,
      required: [true, 'Petty cash number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    paidTo: {
      type: String,
      // required: [true, 'Paid to is required'],
      trim: true,
    },

    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      required: [true, 'Expense account is required'],
      validate: {
        async: true,
        validator: async function (value) {
          const ChartOfAccounts = mongoose.model('ChartOfAccounts');

          const account = await ChartOfAccounts.findOne({
            _id: value,
            deletedAt: null,
            status: 'active',
          });

          return !!account;
        },
        message: 'Expense account must be active and not deleted',
      },
    },

    referenceNumber: {
      type: String,
      trim: true,
    },

    attachments: {
      type: [String],
      default: [],
    },

    // Accounting integration
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
      required: [true, 'Created by is required'],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Indexes
pettyCashSchema.index({ pettyCashNumber: 1, deletedAt: 1 });
pettyCashSchema.index({ date: -1, deletedAt: 1 });
pettyCashSchema.index({ createdBy: 1, date: -1 });
pettyCashSchema.index({ expenseAccount: 1, deletedAt: 1 });
pettyCashSchema.index({ accountingStatus: 1, deletedAt: 1 });

// Query helper to exclude deleted records
pettyCashSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

// Auto-generate petty cash number if missing
pettyCashSchema.pre('validate', async function (next) {
  try {
    if (!this.pettyCashNumber) {
      this.pettyCashNumber = await generateVoucherNumber('PC');
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('PettyCash', pettyCashSchema);
