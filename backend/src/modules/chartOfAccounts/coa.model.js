const mongoose = require("mongoose");
const { ACCOUNT_TYPES } = require("../../config/constants");

const MONEY_SETTER = (v) => Math.round(Number(v || 0) * 100);
const MONEY_GETTER = (v) => Number(v || 0) / 100;

const coaSchema = new mongoose.Schema(
  {
    accountCode: {
      type: String,
      required: [true, "Please provide an account code"],
      unique: true,
      trim: true,
      match: [/^\d+$/, "Account code must be numeric"],
    },

    accountName: {
      type: String,
      required: [true, "Please provide an account name"],
      trim: true,
    },

    accountType: {
      type: String,
      enum: Object.values(ACCOUNT_TYPES).map((type) =>
        String(type).toLowerCase(),
      ),
      required: [true, "Please provide an account type"],
      lowercase: true,
      trim: true,
    },

    openingDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: [0, "Opening balance cannot be negative"],
      get: MONEY_GETTER,
      set: MONEY_SETTER,
    },

    openingBalanceType: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit",
      required: true,
    },

    // Live balance for fast reads
    currentBalance: {
      type: Number,
      default: 0,
      get: MONEY_GETTER,
      set: MONEY_SETTER,
    },

    currentBalanceType: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit",
      required: true,
    },

    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      default: null,
      index: true,
    },

    hasTransactions: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
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

    createdBy: {
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

// Normalize text fields
coaSchema.pre("validate", function (next) {
  if (this.accountCode) this.accountCode = this.accountCode.trim();
  if (this.accountName) this.accountName = this.accountName.trim();
  if (this.description) this.description = this.description.trim();
  if (this.accountType)
    this.accountType = this.accountType.trim().toLowerCase();
  next();
});

// Initialize current balance from opening balance on first create
coaSchema.pre("save", function (next) {
  if (this.isNew) {
    this.currentBalance = this.openingBalance;
    this.currentBalanceType = this.openingBalanceType;
  }
  next();
});

// Validate parent account rules
coaSchema.pre("save", async function (next) {
  try {
    if (!this.parentAccount) return next();

    if (this._id && this.parentAccount.toString() === this._id.toString()) {
      return next(new Error("Account cannot be its own parent"));
    }

    const AccountModel = mongoose.model("ChartOfAccounts");

    const parent = await AccountModel.findById(this.parentAccount);
    if (!parent) {
      return next(new Error("Parent account does not exist"));
    }

    if (parent.deletedAt) {
      return next(new Error("Deleted account cannot be used as parent"));
    }

    if (parent.status === "archived") {
      return next(new Error("Archived account cannot be used as parent"));
    }

    if (parent.status === "inactive") {
      return next(new Error("Inactive account cannot be used as parent"));
    }

    if (parent.accountType !== this.accountType) {
      return next(new Error("Parent account type must match"));
    }

    // Important accounting rule:
    // an account that already has transactions should not become a parent
    if (parent.hasTransactions) {
      return next(
        new Error(
          "An account with transactions cannot be used as a parent account",
        ),
      );
    }

    // Circular reference check
    let current = parent;
    const visited = new Set();

    while (current) {
      const currentId = current._id.toString();

      if (visited.has(currentId)) {
        return next(new Error("Circular parent reference detected"));
      }

      if (this._id && currentId === this._id.toString()) {
        return next(new Error("Circular parent reference detected"));
      }

      visited.add(currentId);

      if (!current.parentAccount) break;
      current = await AccountModel.findById(current.parentAccount);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Hide soft-deleted docs by default
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

coaSchema.pre("find", excludeDeleted);
coaSchema.pre("findOne", excludeDeleted);
coaSchema.pre("findOneAndUpdate", excludeDeleted);
coaSchema.pre("countDocuments", excludeDeleted);

// Virtuals
coaSchema.virtual("hasChildren", {
  ref: "ChartOfAccounts",
  localField: "_id",
  foreignField: "parentAccount",
  count: true,
});

coaSchema.virtual("isLeaf").get(function () {
  // Real value should be determined in controller/service after checking children count
  // This virtual is only a lightweight hint
  return !this.parentAccount ? false : !this.hasChildren;
});

// Helpful method for journal posting checks
coaSchema.methods.canPostTransactions = async function () {
  const AccountModel = mongoose.model("ChartOfAccounts");
  const childCount = await AccountModel.countDocuments({
    parentAccount: this._id,
  });

  return this.status === "active" && !this.deletedAt && childCount === 0;
};

// Indexes
coaSchema.index({ accountCode: 1 }, { unique: true });
coaSchema.index({ accountName: 1, accountType: 1 });
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });
coaSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("ChartOfAccounts", coaSchema);
