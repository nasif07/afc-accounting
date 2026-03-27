const mongoose = require("mongoose");
const { ACCOUNT_TYPES } = require("../../config/constants");

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
      enum: Object.values(ACCOUNT_TYPES),
      required: [true, "Please provide an account type"],
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
      get: (v) => v / 100,
      set: (v) => Math.round((v || 0) * 100),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      default: null,
    },
    hasChildren: {
      type: Boolean,
      default: false,
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
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Normalize text fields
coaSchema.pre("validate", function (next) {
  if (this.accountCode) {
    this.accountCode = this.accountCode.trim();
  }

  if (this.accountName) {
    this.accountName = this.accountName.trim();
  }

  if (this.description) {
    this.description = this.description.trim();
  }

  next();
});

// Validate parent account on save
coaSchema.pre("save", async function (next) {
  try {
    if (!this.parentAccount) {
      return next();
    }

    // Prevent self-parenting
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

    if (!parent.isActive || parent.status === "inactive") {
      return next(new Error("Inactive account cannot be used as parent"));
    }

    if (parent.accountType !== this.accountType) {
      return next(new Error("Parent account type must match"));
    }

    // Check circular references
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

      if (!current.parentAccount) {
        break;
      }

      current = await AccountModel.findById(current.parentAccount);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Helpful query middleware to hide soft-deleted records by default
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

coaSchema.pre("find", excludeDeleted);
coaSchema.pre("findOne", excludeDeleted);
coaSchema.pre("findOneAndUpdate", excludeDeleted);
coaSchema.pre("countDocuments", excludeDeleted);

// Add indexes
coaSchema.index({ accountCode: 1 }, { unique: true });
coaSchema.index({ accountName: 1, accountType: 1 });
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });
coaSchema.index({ hasChildren: 1 });
coaSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("ChartOfAccounts", coaSchema);