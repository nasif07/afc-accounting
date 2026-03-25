# 📋 ACCOUNTING MODULES - IMPLEMENTATION GUIDE
## Chart of Accounts & Journal Entry Audit Fixes

---

## 🔧 BACKEND IMPLEMENTATION

### Step 1: Update Chart of Accounts Model
**File:** `backend/src/modules/chartOfAccounts/coa.model.js`

**Key Changes:**
```javascript
// Add status field for soft-delete
status: {
  type: String,
  enum: ["active", "inactive", "archived"],
  default: "active",
  index: true,
}

// Track if account has children
hasChildren: { type: Boolean, default: false, index: true }

// Track if account has transactions
hasTransactions: { type: Boolean, default: false }

// Soft-delete fields
deletedAt: { type: Date, default: null }
deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }

// Parent account with circular reference validation
parentAccount: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "ChartOfAccounts",
  validate: {
    async validator(value) {
      if (!value) return true;
      
      // Check parent exists
      const parent = await mongoose.model("ChartOfAccounts").findById(value);
      if (!parent) throw new Error("Parent account does not exist");
      
      // Check account type matches
      if (parent.accountType !== this.accountType) {
        throw new Error("Parent account type must match");
      }
      
      // Check for circular references
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
    }
  }
}

// Store amounts in cents, display as decimal
openingBalance: {
  type: Number,
  get: (v) => v / 100,
  set: (v) => Math.round(v * 100),
}
```

---

### Step 2: Update Journal Entry Model
**File:** `backend/src/modules/accounting/accounting.model.js`

**Key Changes:**
```javascript
// Separate book entry schema with validation
const bookEntrySchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    required: true,
    validate: {
      async validator(value) {
        const account = await mongoose.model('ChartOfAccounts').findById(value);
        if (!account) throw new Error("Account does not exist");
        if (account.hasChildren) throw new Error("Cannot use parent account");
        if (account.status !== 'active') throw new Error("Account not active");
        return true;
      }
    }
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
    get: (v) => v / 100,
    set: (v) => Math.round(v * 100),
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
    get: (v) => v / 100,
    set: (v) => Math.round(v * 100),
  },
  validate: {
    validator: function() {
      if (this.debit > 0 && this.credit > 0) {
        throw new Error("Cannot have both debit and credit");
      }
      if (this.debit === 0 && this.credit === 0) {
        throw new Error("Amount cannot be zero");
      }
      return true;
    }
  }
});

// Journal entry schema
const journalEntrySchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true, unique: true, index: true },
  voucherDate: { type: Date, required: true, default: Date.now, index: true },
  bookEntries: {
    type: [bookEntrySchema],
    required: true,
    validate: {
      validator: function(entries) {
        return entries && entries.length >= 2;
      },
      message: "Must have at least 2 line items"
    }
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed'],
    default: 'draft',
    index: true,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  isLocked: { type: Boolean, default: false },
  reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  rejectionReason: String,
});

// Pre-save hook to validate balance
journalEntrySchema.pre('save', function(next) {
  if (this.bookEntries && this.bookEntries.length > 0) {
    const totalD = this.bookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalC = this.bookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    if (totalD !== totalC) {
      throw new Error("Journal entry is not balanced");
    }
  }
  next();
});
```

---

### Step 3: Replace Chart of Accounts Service
**File:** `backend/src/modules/chartOfAccounts/coa.service.js`

**Use:** `REFACTORED_COA_SERVICE.js` content

**Key Methods:**
- `isLeafNode(accountId)` - Check if account is leaf node
- `detectCircularReference(accountId, parentId)` - Detect circular refs
- `getChildren(accountId)` - Get all children recursively
- `buildAccountTree()` - Build hierarchy tree
- `getLeafNodes()` - Get only leaf nodes (for transactions)
- `deleteAccount()` - Soft delete with validation
- `archiveAccount()` - Archive account
- `getTrialBalance()` - Calculate trial balance

---

### Step 4: Replace Accounting Service
**File:** `backend/src/modules/accounting/accounting.service.js`

**Use:** `REFACTORED_ACCOUNTING_SERVICE.js` content

**Key Methods:**
- `validateJournalEntry(entryData)` - Validate structure and balance
- `validateAccounts(bookEntries)` - Validate accounts are leaf nodes
- `createJournalEntry()` - Create with atomic transaction
- `updateEntry()` - Update with immutability check
- `deleteEntry()` - Delete with immutability check
- `approveEntry()` - Approve and lock
- `calculateAccountBalance()` - Calculate from journal (not stored)

---

### Step 5: Create Validation Service
**File:** `backend/src/services/validationService.js`

**Create new file with:** `validationService.js` content

**Provides reusable validation for:**
- Journal entries
- Accounts
- Amounts
- Dates
- Required fields

---

### Step 6: Update Controllers
**File:** `backend/src/modules/chartOfAccounts/coa.controller.js`
**File:** `backend/src/modules/accounting/accounting.controller.js`

**Changes:**
- Add error handling for validation errors
- Return specific error messages
- Pass userId to deleteAccount
- Add new endpoints for approval workflow

**New Endpoints:**
```
GET    /api/coa/leaf-nodes
GET    /api/coa/tree
POST   /api/coa/:id/archive
POST   /api/coa/:id/restore
GET    /api/journal-entries/pending
POST   /api/journal-entries/:id/approve
POST   /api/journal-entries/:id/reject
GET    /api/trial-balance
```

---

### Step 7: Add Database Indexes
```javascript
// COA Model
coaSchema.index({ accountCode: 1 });
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });

// Journal Model
journalSchema.index({ voucherNumber: 1 });
journalSchema.index({ voucherDate: -1 });
journalSchema.index({ createdBy: 1, voucherDate: -1 });
journalSchema.index({ approvalStatus: 1, status: 1 });
journalSchema.index({ 'bookEntries.account': 1 });
```

---

## 💻 FRONTEND IMPLEMENTATION

### Step 1: Update Journal Entry Form
**File:** `frontend/src/components/JournalEntryForm.jsx`

**Use:** `FRONTEND_JOURNAL_FORM_UPDATED.jsx` content

**Features:**
- Real-time balance calculation
- Line item validation
- Leaf node filtering
- Disabled submit when unbalanced
- Clear error messages

---

### Step 2: Create COA Tree Component
**File:** `frontend/src/components/COATree.jsx`

**Use:** `FRONTEND_COA_TREE_UPDATED.jsx` content

**Features:**
- Hierarchical tree display
- Expand/collapse nodes
- Leaf node indicators
- Parent account disabling
- Status indicators

---

### Step 3: Update Account Selector
**File:** `frontend/src/components/AccountSelector.jsx`

**Changes:**
- Filter to show only leaf nodes
- Show account code and name
- Add status indicators
- Prevent parent selection

---

## 🧪 TESTING CHECKLIST

### Backend Tests
- [ ] Create account with parent (should succeed)
- [ ] Attempt circular reference (should fail)
- [ ] Create 2-line journal entry (should succeed)
- [ ] Create 1-line entry (should fail)
- [ ] Create unbalanced entry (should fail)
- [ ] Use parent account in transaction (should fail)
- [ ] Edit posted entry (should fail)
- [ ] Approve entry and verify locked
- [ ] Calculate balance from journal
- [ ] Delete account with transactions (should fail)
- [ ] Soft delete account
- [ ] Get trial balance (should be balanced)

### Frontend Tests
- [ ] Form shows real-time balance
- [ ] Submit disabled when unbalanced
- [ ] Account selector shows only leaf nodes
- [ ] Adding/removing lines updates balance
- [ ] Debit/credit auto-clear
- [ ] Validation errors display
- [ ] Tree shows parent/child relationships
- [ ] Parent accounts disabled in selector

---

## 📊 DATA MIGRATION

```javascript
// 1. Update all existing accounts
db.chartofaccounts.updateMany(
  {},
  {
    $set: {
      status: "active",
      hasChildren: false,
      hasTransactions: false,
      deletedAt: null,
      deletedBy: null
    }
  }
);

// 2. Set hasChildren for parent accounts
const parents = db.chartofaccounts.distinct("parentAccount");
db.chartofaccounts.updateMany(
  { _id: { $in: parents } },
  { $set: { hasChildren: true } }
);

// 3. Set hasTransactions for accounts with entries
const withEntries = db.journalentries.distinct("bookEntries.account");
db.chartofaccounts.updateMany(
  { _id: { $in: withEntries } },
  { $set: { hasTransactions: true } }
);

// 4. Update all journal entries
db.journalentries.updateMany(
  {},
  {
    $set: {
      status: "posted",
      approvalStatus: "approved",
      isLocked: true
    }
  }
);
```

---

## 🚀 DEPLOYMENT STEPS

1. Backup database
2. Deploy backend (models + services)
3. Run migrations
4. Create indexes
5. Deploy frontend
6. Test in staging
7. Monitor logs
8. Have rollback ready

---

## ✅ VERIFICATION

After implementation:
- ✅ No circular references
- ✅ All entries balanced
- ✅ Trial balance = 0
- ✅ No parent accounts in transactions
- ✅ Posted entries immutable
- ✅ Balances match calculated values
- ✅ Soft-deleted accounts hidden
- ✅ All indexes created
- ✅ Frontend validation works
- ✅ Error messages clear

