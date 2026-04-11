const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema(
  {
    // Bank identification
    bankName: {
      type: String,
      required: [true, "Please provide a bank name"],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, "Please provide an account number"],
      unique: true,
      trim: true,
    },

    // COA Mapping - CRITICAL for accounting integrity
    coaAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      required: [true, "Please link a chart of account"],
      validate: {
        async: true,
        validator: async function (value) {
          if (!value) return false;
          
          // Check if COA account exists and is valid
          const ChartOfAccounts = require("../chartOfAccounts/coa.model");
          const coaAccount = await ChartOfAccounts.findById(value);
          
          if (!coaAccount) return false;
          if (coaAccount.deletedAt) return false;
          if (coaAccount.status !== "active") return false;
          if (coaAccount.accountType !== "asset") return false;
          
          // Validate it's a leaf account (no children)
          const hasChildren = await ChartOfAccounts.countDocuments({
            parentAccount: value,
            deletedAt: null,
          });
          
          return hasChildren === 0; // Must be a leaf account
        },
        message: "COA account must be an active, leaf asset account",
      },
    },

    // Account holder information
    accountHolderName: {
      type: String,
      required: [true, "Please provide account holder name"],
      trim: true,
    },
    branchName: {
      type: String,
      trim: true,
      default: null,
    },

    // Account type
    accountType: {
      type: String,
      enum: {
        values: ["savings", "current", "checking", "money-market"],
        message: "Account type must be one of: savings, current, checking, money-market",
      },
      required: [true, "Please specify account type"],
    },

    // Balance tracking
    openingBalance: {
      type: Number,
      default: 0,
      // Allow negative opening balance (account might have had prior transactions)
      validate: {
        validator: function (value) {
          return typeof value === "number" && !isNaN(value);
        },
        message: "Opening balance must be a valid number",
      },
    },

    // Status management
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Reconciliation tracking
    lastReconciledDate: {
      type: Date,
      default: null,
    },
    lastReconciledBalance: {
      type: Number,
      default: 0,
    },
    // FIXED: Store signed difference (positive = over, negative = under)
    reconciliationDifference: {
      type: Number,
      default: 0,
    },

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Soft delete
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
    // Ensure createdAt and updatedAt are tracked
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for current balance (calculated on read)
bankSchema.virtual("currentBalance").get(function () {
  // This will be populated by service
  return this._currentBalance || 0;
});

// Hide soft-deleted records by default
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

bankSchema.pre("find", excludeDeleted);
bankSchema.pre("findOne", excludeDeleted);
bankSchema.pre("findOneAndUpdate", excludeDeleted);
bankSchema.pre("countDocuments", excludeDeleted);

// Prevent duplicate COA linkage
bankSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("coaAccount")) {
    const Bank = this.constructor;
    const existingBank = await Bank.findOne({
      coaAccount: this.coaAccount,
      _id: { $ne: this._id },
      deletedAt: null,
    });

    if (existingBank) {
      return next(
        new Error(
          "This COA account is already linked to another bank account. Each COA account can only be linked to one bank account."
        )
      );
    }
  }
  next();
});

// Indexes for performance
bankSchema.index({ accountNumber: 1 }, { unique: true });
bankSchema.index({ coaAccount: 1 }, { unique: true, sparse: true });
bankSchema.index({ bankName: 1, isActive: 1 });
bankSchema.index({ createdBy: 1 });
bankSchema.index({ deletedAt: 1 });
bankSchema.index({ isActive: 1, deletedAt: 1 });

module.exports = mongoose.model("Bank", bankSchema);
