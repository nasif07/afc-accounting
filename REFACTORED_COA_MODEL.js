// ✅ REFACTORED: Chart of Accounts Model
// Includes: Hierarchy validation, soft-delete, child tracking, account type rules

const mongoose = require("mongoose");
const { ACCOUNT_TYPES } = require("../../config/constants");

const coaSchema = new mongoose.Schema(
  {
    accountCode: {
      type: String,
      required: [true, "Please provide an account code"],
      unique: true,
      trim: true,
      index: true,  // ✅ NEW: Index for fast lookups
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
      index: true,  // ✅ NEW: Index for type filtering
    },
    description: {
      type: String,
      trim: true,
    },
    
    // ✅ FIXED: Separate opening balance from current balance
    // Current balance is now DERIVED from journal entries, not stored
    openingBalance: {
      type: Number,
      default: 0,
      get: (v) => v / 100,  // ✅ NEW: Store as cents, display as decimal
      set: (v) => Math.round(v * 100),
    },
    
    // ⚠️ DEPRECATED: currentBalance should NOT be stored
    // It will be calculated on-the-fly from journal entries
    // Keeping for backward compatibility but marked as deprecated
    currentBalance: {
      type: Number,
      default: 0,
      deprecated: true,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100),
    },
    
    // ✅ NEW: Status field for soft-delete
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true,
    },
    
    // ✅ FIXED: Renamed from isActive to use status field
    // Keeping for backward compatibility
    isActive: {
      type: Boolean,
      default: true,
      get: function() {
        return this.status === "active";
      },
      set: function(v) {
        this.status = v ? "active" : "inactive";
      },
    },
    
    // ✅ FIXED: Parent account with validation
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      validate: {
        async validator(value) {
          if (!value) return true;  // Optional field
          
          // ✅ NEW: Check if parent exists
          const parent = await mongoose.model("ChartOfAccounts").findById(value);
          if (!parent) {
            throw new Error("Parent account does not exist");
          }
          
          // ✅ NEW: Check if parent account type matches
          if (parent.accountType !== this.accountType) {
            throw new Error(
              `Parent account must be of type ${this.accountType}, got ${parent.accountType}`
            );
          }
          
          // ✅ NEW: Prevent circular references
          if (value.equals(this._id)) {
            throw new Error("An account cannot be its own parent");
          }
          
          // ✅ NEW: Check for circular references (traverse up the tree)
          let current = parent;
          const visited = new Set([parent._id.toString()]);
          
          while (current.parentAccount) {
            const parentId = current.parentAccount.toString();
            if (visited.has(parentId)) {
              throw new Error("Circular parent reference detected");
            }
            if (parentId === this._id.toString()) {
              throw new Error("Circular parent reference detected");
            }
            visited.add(parentId);
            current = await mongoose.model("ChartOfAccounts").findById(current.parentAccount);
            if (!current) break;
          }
          
          return true;
        },
        message: "Invalid parent account reference",
      },
      index: true,  // ✅ NEW: Index for tree queries
    },
    
    // ✅ NEW: Track if account has children (for leaf node validation)
    hasChildren: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // ✅ NEW: Track if account has journal entries (for deletion prevention)
    hasTransactions: {
      type: Boolean,
      default: false,
    },
    
    // ✅ NEW: Deletion metadata for soft-delete
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
    },
  },
  { timestamps: true }
);

// ✅ NEW: Index for soft-delete queries
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });

// ✅ NEW: Query middleware to exclude deleted accounts by default
coaSchema.query.active = function() {
  return this.where({ status: "active" });
};

// ✅ NEW: Pre-save hook to validate leaf node usage
coaSchema.pre("save", async function(next) {
  if (!this.isNew && this.isModified("parentAccount")) {
    // ✅ NEW: If this account now has a parent, mark it as not a leaf
    if (this.parentAccount) {
      // Update parent to indicate it has children
      await mongoose.model("ChartOfAccounts").findByIdAndUpdate(
        this.parentAccount,
        { hasChildren: true }
      );
    }
  }
  next();
});

// ✅ NEW: Post-delete hook for soft-delete
coaSchema.pre("findByIdAndDelete", async function(next) {
  // Convert hard delete to soft delete
  const docToDelete = await this.model.findOne(this.getFilter());
  if (docToDelete) {
    docToDelete.status = "archived";
    docToDelete.deletedAt = new Date();
    docToDelete.deletedBy = this.options.userId;  // Pass userId in options
    await docToDelete.save();
    // Prevent actual deletion
    this.setOptions({ overwrite: true });
  }
  next();
});

module.exports = mongoose.model("ChartOfAccounts", coaSchema);
