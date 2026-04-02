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
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    ifscCode: {
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

    isActive: {
      type: Boolean,
      default: true,
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
bankSchema.pre("countDocuments", excludeDeleted);te,
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

bankSchema.index({ accountNumber: 1 }, { unique: true });
bankSchema.index({ bankName: 1, isActive: 1 });
bankSchema.index({ createdBy: 1 });
bankSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("Bank", bankSchema);
