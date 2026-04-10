const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: [true, "Please provide a bank name"],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    coaAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      required: [true, "Please link a chart of account"],
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    branchName: String,
    accountType: {
      type: String,
      enum: ["savings", "current", "checking", "money-market"],
      required: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastReconciledDate: {
      type: Date,
      default: null,
    },
    lastReconciledBalance: {
      type: Number,
      default: 0,
    },
    reconciliationDifference: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
  { timestamps: true },
);

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

bankSchema.index({ accountNumber: 1 }, { unique: true });
bankSchema.index({ bankName: 1, isActive: 1 });
bankSchema.index({ createdBy: 1 });
bankSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("Bank", bankSchema);