const mongoose = require('mongoose');
const { TRANSACTION_TYPES, APPROVAL_STATUS } = require('../../config/constants');

const bookEntrySchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    required: true,
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
    get: (v) => v / 100,
    set: (v) => Math.round(v * 100),
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
    get: (v) => v / 100,
    set: (v) => Math.round(v * 100),
  },
  description: String,
});

// Add custom validation to bookEntrySchema
bookEntrySchema.pre('validate', function(next) {
  if (this.debit > 0 && this.credit > 0) {
    throw new Error("Cannot have both debit and credit in same line");
  }
  if (this.debit === 0 && this.credit === 0) {
    throw new Error("Amount cannot be zero");
  }
  next();
});

const journalEntrySchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    voucherDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true,
    },
    bookEntries: {
      type: [bookEntrySchema],
      required: true,
      validate: {
        validator: function(entries) {
          return entries && entries.length >= 2;
        },
        message: "Must have at least 2 line items",
      },
    },
    totalDebit: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100),
    },
    totalCredit: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100),
    },
    isBalanced: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'posted', 'reversed'],
      default: 'draft',
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    rejectionReason: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attachments: [String],
  },
  { timestamps: true }
);

// Validate balance before saving
journalEntrySchema.pre('save', function(next) {
  if (this.bookEntries && this.bookEntries.length > 0) {
    if (this.bookEntries.length < 2) {
      return next(new Error("Journal entry must have at least 2 line items"));
    }

    const totalD = this.bookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalC = this.bookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

    this.totalDebit = totalD;
    this.totalCredit = totalC;
    this.isBalanced = Math.abs(totalD - totalC) < 0.01;

    if (!this.isBalanced) {
      return next(
        new Error(
          `Journal entry is not balanced. Debits: ${totalD}, Credits: ${totalC}`
        )
      );
    }
  }
  next();
});

// Prevent editing if locked
journalEntrySchema.pre('findByIdAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && Object.keys(update).length > 0) {
    this.model.findById(this.getFilter()._id).then((doc) => {
      if (doc && doc.isLocked) {
        next(new Error("Cannot edit a locked journal entry"));
      } else {
        next();
      }
    }).catch(next);
  } else {
    next();
  }
});

// Add indexes
journalEntrySchema.index({ voucherNumber: 1 });
journalEntrySchema.index({ voucherDate: -1 });
journalEntrySchema.index({ createdBy: 1, voucherDate: -1 });
journalEntrySchema.index({ approvalStatus: 1, status: 1 });
journalEntrySchema.index({ 'bookEntries.account': 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
