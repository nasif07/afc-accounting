const mongoose = require("mongoose");

// Matches coa.model.js's MONEY_SETTER/MONEY_GETTER exactly — every money
// field in this schema is stored in minor units (paisa) and only ever
// converted to major units (Taka) at the getter boundary. A reconciliation
// report is a "trust the numbers" screen; a mismatched rounding convention
// here would be exactly the kind of bug that undermines that trust.
const MONEY_SETTER = (v) => Math.round(Number(v || 0) * 100);
const MONEY_GETTER = (v) => Number(v || 0) / 100;

const moneyField = (extra = {}) => ({
  type: Number,
  default: 0,
  get: MONEY_GETTER,
  set: MONEY_SETTER,
  ...extra,
});

// Shared shape for the six itemized adjustment categories. journalEntryId is
// null until the line is posted to the ledger: a bank-side item (e.g. a fee
// the bank charged) starts out with no journal entry behind it, which is
// precisely what puts it on this statement. Only the two POSTABLE_TYPES
// categories can ever be posted — the other four are timing differences that
// are already in the books and must never generate a second entry.
const adjustmentLineSchema = new mongoose.Schema(
  {
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },
    // The other side of the auto-posted entry — the expense account for a
    // bank charge, the income account for a bank credit. Optional at entry
    // time; posting falls back to the Settings default and then to the
    // seeded account code (see resolveContraAccount).
    contraAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      default: null,
    },
    postedAt: {
      type: Date,
      default: null,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    description: {
      type: String,
      trim: true,
      required: [true, "Description is required"],
    },
    amount: moneyField({
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    }),
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
  },
  { timestamps: true },
);

const bankReconciliationSchema = new mongoose.Schema(
  {
    // References the same ChartOfAccounts leaf account bankBook.service.js's
    // getStatement/getBookBalance already use as "bankHeadId" — deliberately
    // NOT a ref to the Bank model (bank.model.js), which identifies bank
    // accounts differently (by its own _id, resolving internally to
    // coaAccount). This feature reuses bankBook's balance/statement logic
    // directly, so it follows bankBook's own account-identity convention
    // instead of introducing a second one.
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      required: [true, "Bank account is required"],
      index: true,
    },

    periodStart: {
      type: Date,
      required: [true, "Period start date is required"],
    },
    periodEnd: {
      type: Date,
      required: [true, "Period end date is required"],
    },

    // Manually entered from the physical/PDF bank statement — never derived
    // from the ledger. This is the one figure in the whole app that
    // represents "what the bank says", as opposed to "what our books say",
    // and it is the figure the statement's computed total must land on.
    statementClosingBalance: moneyField(),

    // The six itemized categories below are the six line groups printed on
    // AFC's paper Bank Reconciliation Statement, in the order and with the
    // Add/Deduct placement that statement uses. The statement walks from the
    // book balance to the bank balance, so the sign of each category is fixed
    // by which half of the form it sits in — see
    // bankReconciliation.service.js's computeClosingBalance.

    // --- Add ---
    // "Transactions Credited to Bank Statement but Not Debited to AFC A/C
    // Statement" — the bank has credited money the books have not recorded.
    // Postable: Dr bank / Cr the line's contra (income) account.
    bankCreditsNotInBooks: {
      type: [adjustmentLineSchema],
      default: [],
    },
    // "Outstanding Cheques (Cheques Issued but not Presented to Bank)" —
    // books already deducted them, the bank has not yet.
    outstandingCheques: {
      type: [adjustmentLineSchema],
      default: [],
    },
    // "Previous Month's Deposit in Transit" — reverses the prior period's
    // deposit-in-transit deduction now that the deposit has landed.
    previousDepositsInTransit: {
      type: [adjustmentLineSchema],
      default: [],
    },

    // --- Deduct ---
    // "Previous Month's Outstanding Cheques (Transactions Debited to Bank
    // Statement)" — reverses the prior period's outstanding-cheque addition
    // now that the bank has debited them.
    previousOutstandingCheques: {
      type: [adjustmentLineSchema],
      default: [],
    },
    // "Deposit in Transit" — books recorded it, the bank has not yet.
    depositsInTransit: {
      type: [adjustmentLineSchema],
      default: [],
    },
    // "Bank Charges & Other Fees" — the bank deducted them, the books have
    // not recorded them yet.
    // Postable: Dr the line's contra (expense) account / Cr bank.
    bankCharges: {
      type: [adjustmentLineSchema],
      default: [],
    },

    previousPeriodReconciliation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankReconciliation",
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "draft",
    },

    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Prepared by is required"],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  },
);

// One statement period per bank account — prevents accidentally creating
// two overlapping "for the month ended" records for the same account.
bankReconciliationSchema.index(
  { bankAccount: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);
bankReconciliationSchema.index({ bankAccount: 1, periodEnd: -1 });

function excludeDeleted(next) {
  const query = this.getQuery();

  if (query.includeDeleted) {
    const newQuery = { ...query };
    delete newQuery.includeDeleted;
    this.setQuery(newQuery);
  } else {
    this.where({ deletedAt: null });
  }

  next();
}

bankReconciliationSchema.pre("find", excludeDeleted);
bankReconciliationSchema.pre("findOne", excludeDeleted);
bankReconciliationSchema.pre("countDocuments", excludeDeleted);

// Prevent editing a finalized (locked) reconciliation via direct
// findOneAndUpdate/findByIdAndUpdate calls — mirrors JournalEntry's
// preventEditingFinalized guard for posted entries. Service-level methods
// that mutate a fetched document via .save() still need their own
// status === "finalized" checks; this only guards the query-based paths.
async function preventEditingFinalized(next) {
  const doc = await this.model.findOne(this.getFilter());

  if (doc && doc.status === "finalized") {
    return next(new Error("Cannot edit a finalized bank reconciliation"));
  }

  next();
}

bankReconciliationSchema.pre("findOneAndUpdate", preventEditingFinalized);
bankReconciliationSchema.pre("findByIdAndUpdate", preventEditingFinalized);

module.exports = mongoose.model("BankReconciliation", bankReconciliationSchema);
