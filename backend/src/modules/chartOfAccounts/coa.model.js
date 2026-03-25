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
      validate: {
        async validator(value) {
          if (!value) return true;
          const parent = await mongoose.model("ChartOfAccounts").findById(value);
          if (!parent) throw new Error("Parent account does not exist");
          if (parent.accountType !== this.accountType) {
            throw new Error("Parent account type must match");
          }
          let current = parent;
          const visited = new Set([parent._id.toString()]);
          while (current.parentAccount) {
            const parentId = current.parentAccount.toString();
            if (visited.has(parentId) || parentId === this._id.toString()) {
              throw new Error("Circular parent reference detected");
            }
            visited.add(parentId);
            current = await mongoose.model("ChartOfAccounts").findById(current.parentAccount);
            if (!current) break;
          }
          return true;
        },
        message: "Invalid parent account",
      },
    },
    hasChildren: {
      type: Boolean,
      default: false,
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
      index: true,
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

coaSchema.index({ accountCode: 1 });
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });
coaSchema.index({ hasChildren: 1 });

module.exports = mongoose.model("ChartOfAccounts", coaSchema);
