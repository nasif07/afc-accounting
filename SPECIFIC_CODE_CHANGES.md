# 🔧 SPECIFIC CODE CHANGES FOR YOUR EXISTING FILES

This document shows **exactly what to add/modify** in your existing files. Not a rewrite—just the fixes needed.

---

## 1️⃣ COA MODEL - ADD THESE FIELDS

**File:** `backend/src/modules/chartOfAccounts/coa.model.js`

**ADD after line 41 (after parentAccount):**

```javascript
    hasChildren: {
      type: Boolean,
      default: false,
      index: true
    },
    hasTransactions: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
```

**REPLACE line 26-29 (openingBalance) with:**

```javascript
    openingBalance: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100)
    },
```

**REPLACE line 30-33 (currentBalance) with:**

```javascript
    currentBalance: {
      type: Number,
      default: 0,
      get: (v) => v / 100,
      set: (v) => Math.round(v * 100)
    },
```

**REPLACE line 34-37 (isActive) with:**

```javascript
    isActive: {
      type: Boolean,
      default: true,
      // DEPRECATED: Use 'status' field instead
    },
```

**ADD VALIDATION to parentAccount (line 38-41):**

```javascript
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      validate: {
        async validator(value) {
          if (!value) return true; // Optional field
          
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
        },
        message: "Invalid parent account"
      }
    },
```

**ADD INDEXES before closing schema (before line 48):**

```javascript
coaSchema.index({ accountCode: 1 });
coaSchema.index({ status: 1, accountType: 1 });
coaSchema.index({ parentAccount: 1, status: 1 });
coaSchema.index({ hasChildren: 1 });
```

---

## 2️⃣ JOURNAL ENTRY MODEL - ADD VALIDATIONS

**File:** `backend/src/modules/accounting/accounting.model.js`

**REPLACE bookEntrySchema (lines 4-19) with:**

```javascript
const bookEntrySchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts',
    required: true,
    validate: {
      async validator(value) {
        const account = await mongoose.model('ChartOfAccounts').findById(value);
        if (!account) throw new Error("Account does not exist");
        if (account.hasChildren) throw new Error("Cannot use parent account in transaction");
        if (account.status !== 'active') throw new Error("Account is not active");
        return true;
      },
      message: "Invalid account"
    }
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
    get: (v) => v / 100,
    set: (v) => Math.round(v * 100)
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
    get: (v) => v / 100,
    set: (v) => Math.round(v * 100)
  },
  description: String,
  validate: {
    validator: function() {
      // Cannot have both debit and credit
      if (this.debit > 0 && this.credit > 0) {
        throw new Error("Cannot have both debit and credit in same line");
      }
      // Cannot be zero
      if (this.debit === 0 && this.credit === 0) {
        throw new Error("Amount cannot be zero");
      }
      return true;
    },
    message: "Invalid book entry"
  }
});
```

**ADD NEW FIELDS after line 76 (after attachments):**

```javascript
    status: {
      type: String,
      enum: ['draft', 'posted', 'reversed'],
      default: 'draft',
      index: true
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry'
    },
```

**ADD PRE-SAVE HOOK before module.exports (before line 81):**

```javascript
// Validate balance before saving
journalEntrySchema.pre('save', function(next) {
  if (this.bookEntries && this.bookEntries.length > 0) {
    // Must have at least 2 entries
    if (this.bookEntries.length < 2) {
      throw new Error("Journal entry must have at least 2 line items");
    }
    
    // Calculate totals
    const totalD = this.bookEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalC = this.bookEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    
    // Update totals
    this.totalDebit = totalD;
    this.totalCredit = totalC;
    this.isBalanced = Math.abs(totalD - totalC) < 0.01;
    
    // Reject if not balanced
    if (!this.isBalanced) {
      throw new Error(`Journal entry is not balanced. Debits: ${totalD}, Credits: ${totalC}`);
    }
  }
  next();
});

// Prevent editing if locked
journalEntrySchema.pre('findByIdAndUpdate', function(next) {
  if (this.getOptions()._recursed) {
    return next();
  }
  
  this.findByIdAndUpdate({}, {}, { _recursed: true }).then(doc => {
    if (doc && doc.isLocked) {
      throw new Error("Cannot edit a locked journal entry");
    }
    next();
  }).catch(next);
});

// Add indexes
journalEntrySchema.index({ voucherNumber: 1 });
journalEntrySchema.index({ voucherDate: -1 });
journalEntrySchema.index({ createdBy: 1, voucherDate: -1 });
journalEntrySchema.index({ approvalStatus: 1, status: 1 });
journalEntrySchema.index({ 'bookEntries.account': 1 });
```

---

## 3️⃣ ACCOUNTING SERVICE - FIX THESE METHODS

**File:** `backend/src/modules/accounting/accounting.service.js`

**REPLACE createJournalEntry method (lines 5-25) with:**

```javascript
  static async createJournalEntry(entryData) {
    // ✅ FIX 1: Validate double-entry
    this.validateDoubleEntry(entryData.bookEntries);
    
    // ✅ FIX 2: Validate accounts are leaf nodes
    const accountErrors = await this.validateAccounts(entryData.bookEntries);
    if (accountErrors.length > 0) {
      throw new Error(`Invalid accounts: ${accountErrors.join(', ')}`);
    }

    // ✅ FIX 3: Use atomic transaction
    const session = await require('mongoose').startSession();
    session.startTransaction();
    
    try {
      const entry = new JournalEntry(entryData);
      await entry.save({ session });
      
      // ✅ FIX 4: Mark accounts as having transactions
      for (const bookEntry of entryData.bookEntries) {
        await ChartOfAccounts.findByIdAndUpdate(
          bookEntry.account,
          { hasTransactions: true },
          { session }
        );
      }
      
      await session.commitTransaction();
      return entry.populate('createdBy', 'name email').populate('bookEntries.account');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
```

**ADD NEW METHOD after validateDoubleEntry (after line 42):**

```javascript
  // ✅ NEW: Validate accounts are leaf nodes
  static async validateAccounts(bookEntries) {
    const errors = [];
    
    for (const entry of bookEntries) {
      const account = await ChartOfAccounts.findById(entry.account);
      
      if (!account) {
        errors.push(`Account ${entry.account} not found`);
        continue;
      }
      
      if (account.hasChildren) {
        errors.push(`Account ${account.accountCode} is a parent account and cannot be used`);
      }
      
      if (account.status !== 'active') {
        errors.push(`Account ${account.accountCode} is not active`);
      }
    }
    
    return errors;
  }
```

**REPLACE updateEntry method (lines 68-79) with:**

```javascript
  static async updateEntry(entryId, updateData) {
    // ✅ FIX 5: Check if entry is locked
    const entry = await JournalEntry.findById(entryId);
    if (entry && entry.isLocked) {
      throw new Error("Cannot edit a locked journal entry");
    }
    
    // If book entries are being updated, validate double-entry
    if (updateData.bookEntries) {
      this.validateDoubleEntry(updateData.bookEntries);
      const errors = await this.validateAccounts(updateData.bookEntries);
      if (errors.length > 0) {
        throw new Error(`Invalid accounts: ${errors.join(', ')}`);
      }
    }

    return await JournalEntry.findByIdAndUpdate(
      entryId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email').populate('bookEntries.account');
  }
```

**REPLACE deleteEntry method (lines 81-98) with:**

```javascript
  static async deleteEntry(entryId) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');
    
    // ✅ FIX 6: Cannot delete posted entries
    if (entry.status === 'posted') {
      throw new Error('Cannot delete a posted journal entry');
    }

    return await JournalEntry.findByIdAndDelete(entryId);
  }
```

**REPLACE approveEntry method (lines 100-110) with:**

```javascript
  static async approveEntry(entryId, approvedBy) {
    // ✅ FIX 7: Lock entry after approval
    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'approved',
        status: 'posted',
        isLocked: true,
        approvedBy,
        approvalDate: new Date()
      },
      { new: true }
    ).populate('bookEntries.account');
  }
```

**REPLACE rejectEntry method (lines 112-138) with:**

```javascript
  static async rejectEntry(entryId, approvedBy, rejectionReason) {
    const entry = await JournalEntry.findById(entryId);
    if (!entry) throw new Error('Entry not found');
    
    // ✅ FIX 8: Cannot reject posted entries
    if (entry.status === 'posted') {
      throw new Error('Cannot reject a posted journal entry');
    }

    return await JournalEntry.findByIdAndUpdate(
      entryId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason
      },
      { new: true }
    );
  }
```

**REPLACE getAllEntries method (lines 44-59) with:**

```javascript
  static async getAllEntries(filters = {}) {
    const query = {};
    if (filters.transactionType) query.transactionType = filters.transactionType;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    
    // ✅ FIX 9: Use voucherDate instead of date
    if (filters.dateFrom || filters.dateTo) {
      query.voucherDate = {};
      if (filters.dateFrom) query.voucherDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.voucherDate.$lte = new Date(filters.dateTo);
    }

    return await JournalEntry.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ voucherDate: -1 })
      .lean(); // ✅ FIX 10: Use lean() for performance
  }
```

**REPLACE getEntriesByDateRange method (lines 140-149) with:**

```javascript
  static async getEntriesByDateRange(dateFrom, dateTo) {
    // ✅ FIX 9: Use voucherDate instead of date
    return await JournalEntry.find({
      voucherDate: {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      }
    })
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ voucherDate: 1 })
      .lean(); // ✅ FIX 10: Use lean() for performance
  }
```

**ADD NEW METHOD at the end (before module.exports):**

```javascript
  // ✅ NEW: Calculate account balance from journal entries
  static async calculateAccountBalance(accountId) {
    const entries = await JournalEntry.find({
      'bookEntries.account': accountId,
      status: 'posted'
    });
    
    let balance = 0;
    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        if (bookEntry.account.toString() === accountId.toString()) {
          balance += bookEntry.debit - bookEntry.credit;
        }
      }
    }
    
    return balance;
  }

  // ✅ NEW: Get trial balance
  static async getTrialBalance() {
    const entries = await JournalEntry.find({ status: 'posted' })
      .populate('bookEntries.account');
    
    const balances = {};
    let totalDebits = 0;
    let totalCredits = 0;
    
    for (const entry of entries) {
      for (const bookEntry of entry.bookEntries) {
        const accountId = bookEntry.account._id.toString();
        if (!balances[accountId]) {
          balances[accountId] = {
            account: bookEntry.account,
            debit: 0,
            credit: 0
          };
        }
        
        balances[accountId].debit += bookEntry.debit || 0;
        balances[accountId].credit += bookEntry.credit || 0;
        totalDebits += bookEntry.debit || 0;
        totalCredits += bookEntry.credit || 0;
      }
    }
    
    return {
      balances: Object.values(balances),
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    };
  }
```

---

## 4️⃣ COA SERVICE - ADD NEW METHODS

**File:** `backend/src/modules/chartOfAccounts/coa.service.js`

**ADD THESE NEW METHODS:**

```javascript
  // ✅ NEW: Check if account is a leaf node
  static async isLeafNode(accountId) {
    const account = await ChartOfAccounts.findById(accountId);
    return account && !account.hasChildren;
  }

  // ✅ NEW: Get all children recursively
  static async getChildren(accountId) {
    const children = await ChartOfAccounts.find({ parentAccount: accountId });
    let allChildren = [...children];
    
    for (const child of children) {
      const grandchildren = await this.getChildren(child._id);
      allChildren = [...allChildren, ...grandchildren];
    }
    
    return allChildren;
  }

  // ✅ NEW: Get only leaf nodes
  static async getLeafNodes(filters = {}) {
    const query = { hasChildren: false, status: 'active' };
    if (filters.accountType) query.accountType = filters.accountType;
    
    return await ChartOfAccounts.find(query)
      .select('_id accountCode accountName accountType status')
      .lean();
  }

  // ✅ NEW: Soft delete account
  static async deleteAccount(accountId, userId) {
    const account = await ChartOfAccounts.findById(accountId);
    if (!account) throw new Error('Account not found');
    
    // Cannot delete if has transactions
    if (account.hasTransactions) {
      throw new Error('Cannot delete account with existing transactions');
    }
    
    // Cannot delete if has children
    if (account.hasChildren) {
      throw new Error('Cannot delete account with child accounts');
    }
    
    return await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      {
        status: 'archived',
        deletedAt: new Date(),
        deletedBy: userId
      },
      { new: true }
    );
  }

  // ✅ NEW: Restore archived account
  static async restoreAccount(accountId) {
    return await ChartOfAccounts.findByIdAndUpdate(
      accountId,
      {
        status: 'active',
        deletedAt: null,
        deletedBy: null
      },
      { new: true }
    );
  }

  // ✅ NEW: Build account tree
  static async buildAccountTree() {
    const accounts = await ChartOfAccounts.find({ status: 'active' }).lean();
    const accountMap = {};
    const roots = [];
    
    // Create map
    accounts.forEach(acc => {
      accountMap[acc._id] = { ...acc, children: [] };
    });
    
    // Build tree
    accounts.forEach(acc => {
      if (acc.parentAccount) {
        const parent = accountMap[acc.parentAccount];
        if (parent) {
          parent.children.push(accountMap[acc._id]);
        }
      } else {
        roots.push(accountMap[acc._id]);
      }
    });
    
    return roots;
  }
```

---

## 5️⃣ CREATE VALIDATION SERVICE

**File:** `backend/src/services/validationService.js`

**Create new file with:**

```javascript
class ValidationService {
  /**
   * Validate journal entry structure and balance
   */
  static validateJournalEntry(entryData) {
    const errors = [];
    
    // Check required fields
    if (!entryData.voucherNumber) errors.push("Voucher number is required");
    if (!entryData.voucherDate) errors.push("Voucher date is required");
    if (!entryData.bookEntries || entryData.bookEntries.length === 0) {
      errors.push("Book entries are required");
    }
    
    // Check minimum 2 entries
    if (entryData.bookEntries && entryData.bookEntries.length < 2) {
      errors.push("Journal entry must have at least 2 line items");
    }
    
    // Check balance
    if (entryData.bookEntries) {
      let totalDebits = 0;
      let totalCredits = 0;
      
      entryData.bookEntries.forEach((entry, index) => {
        if (!entry.account) {
          errors.push(`Line ${index + 1}: Account is required`);
        }
        if (entry.debit > 0 && entry.credit > 0) {
          errors.push(`Line ${index + 1}: Cannot have both debit and credit`);
        }
        if (entry.debit === 0 && entry.credit === 0) {
          errors.push(`Line ${index + 1}: Amount cannot be zero`);
        }
        
        totalDebits += entry.debit || 0;
        totalCredits += entry.credit || 0;
      });
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        errors.push(`Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate amount
   */
  static validateAmount(amount) {
    if (typeof amount !== 'number' || amount < 0) {
      return { isValid: false, error: "Amount must be a positive number" };
    }
    return { isValid: true };
  }

  /**
   * Validate date
   */
  static validateDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return { isValid: false, error: "Invalid date" };
    }
    return { isValid: true };
  }

  /**
   * Validate date range
   */
  static validateDateRange(dateFrom, dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return { isValid: false, error: "Invalid date range" };
    }
    
    if (from > to) {
      return { isValid: false, error: "From date must be before To date" };
    }
    
    return { isValid: true };
  }
}

module.exports = ValidationService;
```

---

## 6️⃣ SUMMARY OF CHANGES

| File | Changes | Fixes |
|------|---------|-------|
| coa.model.js | Add status, hasChildren, hasTransactions, soft-delete fields | Circular refs, parent validation, soft-delete |
| accounting.model.js | Add validation to bookEntry, add status/isLocked fields | Leaf node validation, immutability, balance validation |
| accounting.service.js | Add atomic transactions, fix date fields, add new methods | Atomicity, leaf node validation, balance calculation |
| coa.service.js | Add new methods for tree building, leaf nodes, soft-delete | Hierarchy validation, tree building, soft-delete |
| validationService.js | NEW file | Reusable validation for all modules |

---

## 7️⃣ TESTING AFTER CHANGES

```bash
# Test 1: Create account with parent
POST /api/coa
{ "accountCode": "1100", "accountName": "Bank", "accountType": "asset", "parentAccount": "1000" }
# Should succeed if parent exists and types match

# Test 2: Attempt circular reference
# Should fail with "Circular parent reference detected"

# Test 3: Create journal entry with 2 lines, balanced
POST /api/accounting/journal-entries
# Should succeed

# Test 4: Attempt 1-line entry
# Should fail with "must have at least 2 line items"

# Test 5: Attempt unbalanced entry
# Should fail with "not balanced"

# Test 6: Use parent account in transaction
# Should fail with "Cannot use parent account"

# Test 7: Edit posted entry
# Should fail with "Cannot edit a locked journal entry"

# Test 8: Get trial balance
GET /api/accounting/trial-balance
# Should return balanced totals
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Add fields to coa.model.js
- [ ] Add validation to parentAccount in coa.model.js
- [ ] Add indexes to coa.model.js
- [ ] Add validation to bookEntrySchema in accounting.model.js
- [ ] Add new fields to journalEntrySchema
- [ ] Add pre-save hook to journalEntrySchema
- [ ] Add indexes to journalEntrySchema
- [ ] Update createJournalEntry in accounting.service.js
- [ ] Add validateAccounts method to accounting.service.js
- [ ] Update updateEntry in accounting.service.js
- [ ] Update deleteEntry in accounting.service.js
- [ ] Update approveEntry in accounting.service.js
- [ ] Update rejectEntry in accounting.service.js
- [ ] Fix date fields (date → voucherDate)
- [ ] Add lean() to queries
- [ ] Add new methods to coa.service.js
- [ ] Create validationService.js
- [ ] Test all changes
- [ ] Update controllers if needed

