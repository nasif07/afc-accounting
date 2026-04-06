const mongoose = require('mongoose');
const { TRANSACTION_TYPES, APPROVAL_STATUS } = require('../../config/constants');
const generateVoucherNumber = require('../../utils/generateVoucherNumber');

const bookEntrySchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      required: [true, 'Account is required'],
    },
    debit: {
      type: Number,
      default: 0,
      min: [0, 'Debit cannot be negative'],
      get: (v) => v / 100,
      set: (v) => Math.round((v || 0) * 100),
    },
    credit: {
      type: Number,
      default: 0,
      min: [0, 'Credit cannot be negative'],
      get: (v) => v / 100,
      set: (v) => Math.round((v || 0) * 100),
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Validate each journal line
bookEntrySchema.pre('validate', async function (next) {
  try {
    if (!this.account) {
      return next(new Error('Account is required for each line item'));
    }

    if (this.debit > 0 && this.credit > 0) {
      return next(
        new Error('Cannot have both debit and credit in the same line item')
      );
    }

    if (this.debit === 0 && this.credit === 0) {
      return next(
        new Error(
          'Amount cannot be zero - each line must have either a debit or credit'
        )
      );
    }

    const ChartOfAccounts = mongoose.model('ChartOfAccounts');
    const account = await ChartOfAccounts.findById(this.account);

    if (!account) {
      return next(new Error('Invalid account selected'));
    }

    if (account.deletedAt) {
      return next(new Error('Deleted account cannot be used in transactions'));
    }

    if (!account.isActive || account.status !== 'active') {
      return next(new Error('Inactive account cannot be used in transactions'));
    }

    const hasChildren = await ChartOfAccounts.exists({
      parentAccount: account._id,
      deletedAt: null,
      status: { $ne: 'archived' },
    });

    if (hasChildren) {
      return next(
        new Error('Parent account cannot be used in journal transactions')
      );
    }

    next();
  } catch (error) {
    next(error);
  }
});

const journalEntrySchema = new mongoose.Schema(
  {
    voucherNumber: {
      required: [true, 'Voucher number is required'],
      type: String,
      unique: true,
      trim: true,
    },
    voucherDate: {
      type: Date,
      required: [true, 'Voucher date is required'],
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, 'Transaction type is required'],
    },
    bookEntries: {
      type: [bookEntrySchema],
      required: [true, 'Book entries are required'],
      validate: {
        validator: function (entries) {
          return Array.isArray(entries) && entries.length >= 2;
        },
        message: 'Journal entry must have at least 2 line items',
      },
    },
    totalDebit: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round((v || 0) * 100),
    },
    totalCredit: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round((v || 0) * 100),
    },
    isBalanced: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    status: {
      type: String,
      enum: ['draft', 'posted', 'reversed', 'deleted'],
      default: 'draft',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Auto-generate voucher number if missing
journalEntrySchema.pre('validate', async function (next) {
  try {
    if (!this.voucherNumber) {
      this.voucherNumber = await generateVoucherNumber('JV');
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Validate totals and final journal state before save
journalEntrySchema.pre('save', function (next) {
  try {
    if (!this.bookEntries || this.bookEntries.length < 2) {
      return next(new Error('Journal entry must have at least 2 line items'));
    }

    const totalD = this.bookEntries.reduce(
      (sum, entry) => sum + (entry.debit || 0),
      0
    );
    const totalC = this.bookEntries.reduce(
      (sum, entry) => sum + (entry.credit || 0),
      0
    );

    this.totalDebit = totalD;
    this.totalCredit = totalC;
    this.isBalanced = Math.abs(totalD - totalC) <= 1;

    if (!this.isBalanced) {
      return next(
        new Error(
          `Journal entry is not balanced. Debits: ${totalD / 100}, Credits: ${totalC / 100}`
        )
      );
    }

    if (this.status === 'posted' && this.approvalStatus !== 'approved') {
      return next(new Error('Cannot post a journal entry without approval'));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Prevent editing finalized entries
journalEntrySchema.pre('findOneAndUpdate', async function (next) {
  try {
    const doc = await this.model.findOne(this.getFilter());

    if (
      doc &&
      (doc.isLocked || doc.status === 'posted' || doc.status === 'deleted')
    ) {
      return next(new Error('Cannot edit finalized journal entry'));
    }

    next();
  } catch (error) {
    next(error);
  }
});

journalEntrySchema.pre('findByIdAndUpdate', async function (next) {
  try {
    const doc = await this.model.findById(this.getFilter()._id);

    if (
      doc &&
      (doc.isLocked || doc.status === 'posted' || doc.status === 'deleted')
    ) {
      return next(new Error('Cannot edit finalized journal entry'));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Hide soft-deleted entries by default
function excludeDeleted(next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ deletedAt: null });
  } else {
    const query = this.getQuery();
    delete query.includeDeleted;
    this.setQuery(query);
  }
  next();
}

journalEntrySchema.pre('find', excludeDeleted);
journalEntrySchema.pre('findOne', excludeDeleted);
journalEntrySchema.pre('countDocuments', excludeDeleted);

// Indexes
journalEntrySchema.index({ voucherNumber: 1 }, { unique: true });
journalEntrySchema.index({ voucherDate: -1 });
journalEntrySchema.index({ createdBy: 1, voucherDate: -1 });
journalEntrySchema.index({ approvalStatus: 1, status: 1 });
journalEntrySchema.index({ status: 1, deletedAt: 1 });
journalEntrySchema.index({ 'bookEntries.account': 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);