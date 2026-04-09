# Frontend Accounting Module - Issues Found

## Issue #1: COA Tree View - Missing Import Statement ⚠️

**File:** `frontend/src/components/coa/COATreeView.jsx`

**Problem:** Line 1 imports React but missing `useState` import
```javascript
import React, { useMemo, useState } from "react";  // ✅ Correct
```
Actually, this is correct. No issue here.

---

## Issue #2: Journal Entry Form - Missing Import ⚠️ CRITICAL

**File:** `frontend/src/components/journal/DynamicJournalForm.jsx`

**Problem:** Missing `useState` import at the top
```javascript
import { Plus, Loader, X } from 'lucide-react';
import BookEntryRow from './BookEntryRow';
import BalanceSummary from './BalanceSummary';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'sonner';
// ❌ MISSING: import { useState } from 'react';
```

**Impact:** Component will crash with "useState is not defined"

**Fix:** Add React import with useState
```javascript
import React, { useState } from 'react';
```

---

## Issue #3: Journal Entry Form - Incorrect Balance Validation Logic ⚠️ CRITICAL

**File:** `frontend/src/components/journal/DynamicJournalForm.jsx` (Line 37)

**Problem:** Balance check requires `totalDebit > 0` which prevents entries with 0 amounts
```javascript
const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
```

**Issue:** This prevents valid journal entries where both debit and credit are 0 (empty form)

**Better Logic:**
```javascript
const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0 && totalCredit > 0;
```

---

## Issue #4: BookEntryRow - Numeric Coercion Bug ⚠️ CRITICAL

**File:** `frontend/src/components/journal/BookEntryRow.jsx` (Lines 26-43)

**Problem:** When user enters a debit amount, credit is set to 0 even if it was already 0
```javascript
const handleDebitChange = (e) => {
  const value = e.target.value;
  onUpdate(rowIndex, {
    ...entry,
    debit: value === '' ? '' : Number(value),
    credit: Number(value) > 0 ? 0 : entry.credit,  // ❌ Always sets to 0 if debit > 0
  });
};
```

**Issue:** 
- If user enters debit=100, credit becomes 0 ✓ (correct)
- But if user then changes debit to 50, credit stays 0 ✓ (correct)
- However, if user clears debit (empty string), `Number('')` = 0, so credit is NOT reset
- This creates inconsistent behavior

**Better Logic:**
```javascript
const handleDebitChange = (e) => {
  const value = e.target.value;
  const numValue = value === '' ? 0 : Number(value);
  
  onUpdate(rowIndex, {
    ...entry,
    debit: numValue,
    credit: numValue > 0 ? 0 : entry.credit,
  });
};
```

---

## Issue #5: Ledger Page - Missing Error Handling for Empty Transactions ⚠️

**File:** `frontend/src/pages/Ledger.jsx` (Line 178)

**Problem:** If `ledgerData.transactions` is undefined, the map will fail
```javascript
{ledgerData.transactions.length > 0 ? (
  ledgerData.transactions.map((tx, idx) => (
    // ...
  ))
) : (
  <tr>...</tr>
)}
```

**Fix:** Add safe check
```javascript
{ledgerData?.transactions?.length > 0 ? (
  ledgerData.transactions.map((tx, idx) => (
    // ...
  ))
) : (
  <tr>...</tr>
)}
```

---

## Issue #6: COA Tree View - Balance Display Not Calculated ⚠️ HIGH

**File:** `frontend/src/components/coa/COATreeView.jsx` (Lines 109-127)

**Problem:** Tree view displays balance but backend doesn't provide it in tree response
```javascript
const handleViewAccount = (account) => {
  const amount = account.balance ?? account.currentBalance ?? account.openingBalance ?? 0;
  // ...
};
```

**Issue:** The tree endpoint (`/accounts/tree`) doesn't return balance data
- Only the account details endpoint returns balance
- Tree view should either:
  1. Not display balance in tree (just show in detail view), OR
  2. Fetch balance separately for each account (N+1 query problem)

**Fix:** Remove balance display from tree view, add to detail modal

---

## Issue #7: Journal Entry Form - Missing Validation for Empty Rows ⚠️

**File:** `frontend/src/components/journal/DynamicJournalForm.jsx` (Lines 50-75)

**Problem:** Validation doesn't check if account is actually selected (could be empty string)
```javascript
if (!entry.account) {
  entryErrors.push('Account is required');
  isValid = false;
}
```

**Issue:** This check works, but the error message isn't shown to user until form submission

**Fix:** Show inline validation errors as user types

---

## Issue #8: Ledger Page - Missing Account Type in Response ⚠️

**File:** `frontend/src/pages/Ledger.jsx` (Line 132)

**Problem:** Ledger response doesn't include `accountType` but it's needed for correct balance interpretation
```javascript
{formatCurrency(ledgerData.openingBalance)}
```

**Issue:** Without account type, we can't determine if balance should be displayed as debit or credit

**Fix:** Backend should include `accountType` in ledger response

---

## Summary of Critical Fixes Needed

| # | Issue | Severity | File | Fix |
|---|-------|----------|------|-----|
| 1 | Missing useState import | CRITICAL | DynamicJournalForm.jsx | Add React import |
| 2 | Balance validation logic | HIGH | DynamicJournalForm.jsx | Require both debit and credit > 0 |
| 3 | Numeric coercion bug | HIGH | BookEntryRow.jsx | Fix empty string handling |
| 4 | Missing error handling | MEDIUM | Ledger.jsx | Add safe navigation |
| 5 | Balance not in tree | MEDIUM | COATreeView.jsx | Remove or fetch separately |
| 6 | Missing validation feedback | MEDIUM | DynamicJournalForm.jsx | Add inline validation |
| 7 | Missing accountType | MEDIUM | Ledger.jsx | Backend should include |

---

## Implementation Order

1. **FIRST:** Fix missing useState import (blocks entire form)
2. **SECOND:** Fix numeric coercion in BookEntryRow
3. **THIRD:** Fix balance validation logic
4. **FOURTH:** Add safe navigation in Ledger
5. **FIFTH:** Remove balance from tree view
6. **SIXTH:** Add inline validation feedback
7. **SEVENTH:** Update backend to include accountType in ledger

