const mongoose = require("mongoose");
const { ACCOUNT_TYPES } = require("../../config/constants");

const coaSchema = new mongoose.Schema(
  {
    accountCode: {
      type: String,
      required: [true, "Please provide an account code"],
      unique: true,
      trim: true,
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
    },
    openingBalance: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100),
    },
    currentBalance: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
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
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Validate parent account on save
coaSchema.pre('save', async function(next) {
  if (this.parentAccount) {
    const parent = await mongoose.model("ChartOfAccounts").findById(this.parentAccount);
    if (!parent) {
      return next(new Error("Parent account does not exist"));
    }
    if (parent.accountType !== this.accountType) {
      return next(new Error("Parent account type must match"));
    }

    // Check for circular references
    let current = parent;
    const visited = new Set([parent._id.toString()]);
    while (current.parentAccount) {
      const parentId = current.parentAccount.toString();
      if (visited.has(parentId) || parentId === this._id.toString()) {
        return next(new Error("Circular parent reference detected"));
      }
      visited.add(parentId);
      current = await mongoose.model("ChartOfAccounts").findById(current.parentAccount);
      if (!current) break;
    }
  }
  next();
});

// Add indexes
coaSchema.index({ accountCode: 1 });
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });
coaSchema.index({ hasChildren: 1 });

module.exports = mongoose.model("ChartOfAccounts", coaSchema);
