const mongoose = require('mongoose');
const { TRANSACTION_TYPES, APPROVAL_STATUS } = require('../../config/constants');

const bookEntrySchema = new mongoose.Schema({
  // ✅ FIX #5: Support both 'account' and 'accountId' for compatibility
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

// ✅ FIX #9: Add validation for debit/credit exclusivity
bookEntrySchema.pre('validate', function(next) {
  if (this.debit > 0 && this.credit > 0) {
    throw new Error("Cannot have both debit and credit in same line item");
  }
  if (this.debit === 0 && this.credit === 0) {
    throw new Error("Amount cannot be zero - each line must have either a debit or credit");
  }
  next();
});

const journalEntrySchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: [true, "Voucher number is required"],
      unique: true,
      trim: true,
    },
    voucherDate: {
      type: Date,
      required: [true, "Voucher date is required"],
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, "Transaction type is required"],
    },
    bookEntries: {
      type: [bookEntrySchema],
      required: [true, "Book entries are required"],
      validate: {
        validator: function(entries) {
          return entries && entries.length >= 2;
        },
        message: "Journal entry must have at least 2 line items",
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
    },
    // ✅ FIX #14: Add soft-delete fields
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attachments: [String],
  },
  { timestamps: true }
);

// ✅ FIX #3: Validate balance before saving
journalEntrySchema.pre('save', function(next) {
  if (this.bookEntries && this.bookEntries.length > 0) {
    if (this.bookEntries.length < 2) {
      return next(new Error("Journal entry must have at least 2 line items"));
    }

    const totalD = this.bookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalC = this.bookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

    this.totalDebit = totalD;
    this.totalCredit = totalC;
    // ✅ FIX #12: Use 1 cent tolerance when working with cents
    this.isBalanced = Math.abs(totalD - totalC) < 1;

    if (!this.isBalanced) {
      return next(
        new Error(
          `Journal entry is not balanced. Debits: ${totalD / 100}, Credits: ${totalC / 100}`
        )
      );
    }
  }
  next();
});

// ✅ FIX #3: Prevent editing if locked
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

// Add indexes (removed inline index: true to prevent duplicates)
journalEntrySchema.index({ voucherNumber: 1 });
journalEntrySchema.index({ voucherDate: -1 });
journalEntrySchema.index({ createdBy: 1, voucherDate: -1 });
journalEntrySchema.index({ approvalStatus: 1, status: 1 });
journalEntrySchema.index({ 'bookEntries.account': 1 });
journalEntrySchema.index({ status: 1 }); // ✅ FIX #14: Index for soft-delete queries

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
