const mongoose = require("mongoose");
const mongooseLeanGetters = require("mongoose-lean-getters");
const {
  TRANSACTION_TYPES,
  APPROVAL_STATUS,
} = require("../../config/constants");
const generateVoucherNumber = require("../../utils/generateVoucherNumber");

const toMinorUnit = (v) => Math.round(Number(v || 0) * 100);
const fromMinorUnit = (v) => Number(v || 0) / 100;

const bookEntrySchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      required: [true, "Account is required"],
      index: true,
    },

    debit: {
      type: Number,
      default: 0,
      min: [0, "Debit cannot be negative"],
      get: fromMinorUnit,
      set: toMinorUnit,
    },

    credit: {
      type: Number,
      default: 0,
      min: [0, "Credit cannot be negative"],
      get: fromMinorUnit,
      set: toMinorUnit,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    wasLeafAtCreation: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);


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
      index: -1,
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
        validator: function (entries) {
          return Array.isArray(entries) && entries.length >= 2;
        },
        message: "Journal entry must have at least 2 line items",
      },
    },

    totalDebit: {
      type: Number,
      default: 0,
      get: fromMinorUnit,
      set: toMinorUnit,
    },

    totalCredit: {
      type: Number,
      default: 0,
      get: fromMinorUnit,
      set: toMinorUnit,
    },

    isBalanced: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    referenceType: {
      type: String,
      trim: true,
      default: "",
    },

    referenceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      default: null,
    },

    sourceModule: {
      type: String,
      enum: [
        "manual",
        "bank_book",
        "student_collection",
        "petty_cash",
        "payroll",
        "receipt",
        "expense",
        "OPENING_BALANCE",
      ],
      default: "manual",
    },

    requiresApproval: {
      type: Boolean,
      default: true,
    },

    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },

    status: {
      type: String,
      enum: ["draft", "posted", "reversed", "deleted"],
      default: "draft",
    },

    isLocked: {
      type: Boolean,
      default: false,
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvalDate: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionDate: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
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

    attachments: {
      type: [String],
      default: [],
    },

    bankBook: {
      paymentPurpose: {
        type: String,
        trim: true,
        default: "",
      },
      amount: {
        type: Number,
        default: 0,
        get: fromMinorUnit,
        set: toMinorUnit,
      },
      paymentMethod: {
        type: String,
        enum: [
          "cheque",
          "bank_transfer",
          "bank_deposit",
          "card_pos",
        ],
      },
      chequeNumber: {
        type: String,
        trim: true,
        default: "",
      },
      chequeDate: {
        type: Date,
        default: null,
      },
    },

    bankReconciliations: {
      type: [
        {
          account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChartOfAccounts",
            required: true,
          },
          status: {
            type: String,
            enum: ["unreconciled", "reconciled"],
            default: "unreconciled",
          },
          isReconciled: {
            type: Boolean,
            default: false,
          },
          reconciledAt: {
            type: Date,
            default: null,
          },
          reconciledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          reconciliationId: {
            type: String,
            trim: true,
            default: "",
          },
          statementRef: {
            type: String,
            trim: true,
            default: "",
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

// Auto-generate voucher number if missing
journalEntrySchema.pre("validate", async function (next) {
  try {
    if (!this.voucherNumber) {
      this.voucherNumber = await generateVoucherNumber("JV");
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Validate totals and final journal state before save
journalEntrySchema.pre("save", async function (next) {
  try {
    if (!this.bookEntries || this.bookEntries.length < 2) {
      return next(new Error("Journal entry must have at least 2 line items"));
    }

    // Validate each line's debit/credit values inline (no DB needed)
    for (const entry of this.bookEntries) {
      if (!entry.account) return next(new Error("Account is required for each line item"));
      const debit = Number(entry.get("debit", null, { getters: false }) || 0);
      const credit = Number(entry.get("credit", null, { getters: false }) || 0);
      if (debit > 0 && credit > 0)
        return next(new Error("Cannot have both debit and credit in the same line item"));
      if (debit === 0 && credit === 0)
        return next(new Error("Amount cannot be zero - each line must have either a debit or credit"));
    }

    // Batch-fetch all accounts in one query instead of N individual queries
    const ChartOfAccounts = mongoose.model("ChartOfAccounts");
    const accountIds = this.bookEntries.map((e) => e.account);
    const accounts = await ChartOfAccounts.find({
      _id: { $in: accountIds },
    }, '_id status deletedAt').lean();

    const accountMap = new Map(accounts.map((a) => [String(a._id), a]));

    for (const entry of this.bookEntries) {
      const account = accountMap.get(String(entry.account));
      if (!account) return next(new Error("Invalid account selected"));
      if (account.deletedAt) return next(new Error("Deleted account cannot be used in transactions"));
      if (account.status !== "active") return next(new Error("Inactive account cannot be used in transactions"));
    }

    // Single batch query to find which accounts have children
    const parentIds = accountIds.map(String);
    const childAccounts = await ChartOfAccounts.find({
      parentAccount: { $in: accountIds },
      deletedAt: null,
      status: { $ne: "archived" },
    }, 'parentAccount').lean();

    const parentSet = new Set(childAccounts.map((c) => String(c.parentAccount)));
    for (const entry of this.bookEntries) {
      const isParent = parentSet.has(String(entry.account));
      if (isParent) return next(new Error("Parent account cannot be used in journal transactions"));
      entry.wasLeafAtCreation = !isParent;
    }

    const totalDebitMinor = this.bookEntries.reduce(
      (sum, entry) =>
        sum + Number(entry.get("debit", null, { getters: false }) || 0),
      0,
    );

    const totalCreditMinor = this.bookEntries.reduce(
      (sum, entry) =>
        sum + Number(entry.get("credit", null, { getters: false }) || 0),
      0,
    );

    this.totalDebit = totalDebitMinor / 100;
    this.totalCredit = totalCreditMinor / 100;
    this.isBalanced = totalDebitMinor === totalCreditMinor;

    if (!this.isBalanced) {
      return next(
        new Error(
          `Journal entry is not balanced. Debits: ${totalDebitMinor / 100}, Credits: ${totalCreditMinor / 100}`,
        ),
      );
    }

    if (
      this.status === "posted" &&
      this.approvalStatus !== APPROVAL_STATUS.APPROVED
    ) {
      return next(new Error("Cannot post a journal entry without approval"));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Prevent editing finalized entries
async function preventEditingFinalized(next) {
  try {
    const doc = await this.model.findOne(this.getFilter());

    if (
      doc &&
      (doc.isLocked || doc.status === "posted" || doc.status === "deleted")
    ) {
      return next(new Error("Cannot edit finalized journal entry"));
    }

    next();
  } catch (error) {
    next(error);
  }
}

journalEntrySchema.pre("findOneAndUpdate", preventEditingFinalized);
journalEntrySchema.pre("findByIdAndUpdate", preventEditingFinalized);

// Hide soft-deleted entries by default
function excludeDeleted(next) {
  const query = this.getQuery();

  if (query.includeDeleted) {
    const nextQuery = { ...query };
    delete nextQuery.includeDeleted;
    this.setQuery(nextQuery);
  } else {
    this.where({ deletedAt: null });
  }

  next();
}

journalEntrySchema.pre("find", excludeDeleted);
journalEntrySchema.pre("findOne", excludeDeleted);
journalEntrySchema.pre("countDocuments", excludeDeleted);

// Indexes
journalEntrySchema.index({ createdBy: 1, voucherDate: -1 });
journalEntrySchema.index({ approvalStatus: 1, status: 1 });
journalEntrySchema.index({ status: 1, deletedAt: 1 });
journalEntrySchema.index({ referenceType: 1, referenceAccount: 1 });
journalEntrySchema.index({ sourceModule: 1, voucherDate: -1 });
journalEntrySchema.index({
  "bookEntries.account": 1,
  approvalStatus: 1,
  status: 1,
  voucherDate: 1,
  createdAt: 1,
});

// Lets report-generation queries use .lean({ getters: true }) and still get
// the minor-to-major unit conversion (bookEntries.debit/credit, totalDebit,
// totalCredit) that would otherwise only run on hydrated documents.
journalEntrySchema.plugin(mongooseLeanGetters);

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
