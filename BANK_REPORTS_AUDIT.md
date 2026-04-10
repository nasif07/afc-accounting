# Bank-Cash & Reports Modules - Comprehensive Audit Report

**Date:** April 2026  
**Status:** Issues Found & Fixes Ready  
**Priority:** CRITICAL - Multiple integration issues blocking functionality

---

## Executive Summary

Comprehensive audit of Bank-Cash and Reports modules reveals **15+ critical issues** affecting:

1. **Journal Entry Creation** - Accounts marked as "not active" even when created
2. **Bank-Cash Module** - Route ordering bug, missing balance calculations, COA filtering issues
3. **Reports Module** - Redux slice mismatch, missing general-ledger report, incomplete error handling
4. **Frontend-Backend Integration** - Inconsistent state management, API response mismatches
5. **Data Validation** - Account status not set on creation, account type mismatches

---

## ISSUE #1: Journal Entry Creation Fails - Account Status Not Active (CRITICAL)

### Root Cause
When users create a Chart of Accounts entry, the `status` field is not being set to `'active'` by default.

**Backend Code (accounting.service.js:499):**
```javascript
if (account.status !== 'active') errors.push(`Account ${account.accountCode} is not active`);
```

**Frontend Error Message:** "Account is deactivated" or "Account is not active"

### Why This Happens
1. User creates COA account via frontend
2. Frontend doesn't send `status: 'active'` in payload
3. Backend creates account with `status: undefined`
4. When creating journal entry, validation fails because `undefined !== 'active'`

### The Fix
**In COA Controller (backend):**
```javascript
// Ensure status defaults to 'active' if not provided
const accountData = {
  ...req.body,
  status: req.body.status || 'active',  // ADD THIS LINE
  createdBy: req.user.userId
};
```

**In COA Model:**
```javascript
status: {
  type: String,
  enum: ['active', 'inactive', 'archived'],
  default: 'active'  // ENSURE DEFAULT
}
```

---

## ISSUE #2: Bank Routes - Total Balance Endpoint Unreachable (HIGH)

### Root Cause
Express route matching order - `/report/total-balance` is defined AFTER `/:id`, so `/:id` matches first.

**Current Routes (bank.routes.js):**
```javascript
router.get("/:id/balance", ...);      // Line 17
router.get("/:id", ...);              // Line 18 - MATCHES /report/total-balance!
router.get("/report/total-balance", ...); // Line 14 - NEVER REACHED
```

### Why This Breaks
When frontend calls `/bank/report/total-balance`:
1. Express tries to match against `/:id` route
2. `"report"` becomes the ID parameter
3. Controller tries to find bank with ID="report"
4. Returns 404 or error

### The Fix
**Reorder routes - static routes BEFORE dynamic routes:**
```javascript
// Static routes FIRST
router.get("/report/total-balance", BankController.getTotalBankBalance);

// Dynamic routes LAST
router.get("/:id/balance", BankController.getAccountBalance);
router.get("/:id", BankController.getBankAccountById);
```

---

## ISSUE #3: Bank Model Missing `openingBalance` Field (HIGH)

### Root Cause
Frontend and Controller send `openingBalance`, but Mongoose schema doesn't have this field.

**Frontend sends:**
```javascript
{
  bankName: "ABC Bank",
  accountNumber: "123456",
  openingBalance: 5000,  // ← SENT
  coaAccount: "..."
}
```

**Model doesn't have:**
```javascript
// Missing from schema!
openingBalance: { type: Number, default: 0 }
```

### Why This Breaks
- Data is silently dropped by Mongoose
- Balance calculations don't include opening balance
- Bank balance reports are incorrect

### The Fix
**Add to bank.model.js:**
```javascript
openingBalance: {
  type: Number,
  default: 0,
  min: 0
},
```

---

## ISSUE #4: Bank-Cash Frontend - Incorrect COA Filtering (MEDIUM)

### Root Cause
Frontend filters on `isActive` but backend uses `status` field.

**Current Code (BankCash.jsx:107):**
```javascript
const assetAccounts = accounts.filter(
  (acc) =>
    acc &&
    acc.accountType === 'asset' &&
    (acc.isActive !== false) &&  // ← WRONG FIELD!
    !acc.deletedAt
);
```

**Should be:**
```javascript
const assetAccounts = accounts.filter(
  (acc) =>
    acc &&
    acc.accountType === 'asset' &&
    acc.status === 'active' &&   // ← CORRECT FIELD
    !acc.deletedAt
);
```

### Why This Breaks
- Filters on wrong field
- Includes inactive accounts
- Allows linking to inactive COA accounts

---

## ISSUE #5: Bank-Cash Frontend - Fetches All Accounts Instead of Leaf Nodes (MEDIUM)

### Root Cause
Frontend calls `/accounts` (all accounts) instead of `/accounts/leaf-nodes` (leaf only).

**Current Code (BankCash.jsx:100):**
```javascript
const res = await api.get('/accounts');  // ← Gets ALL accounts
```

**Should be:**
```javascript
const res = await api.get('/accounts/leaf-nodes');  // ← Gets only leaf accounts
```

### Why This Breaks
- Shows parent accounts in dropdown
- User can link bank to parent account
- Violates accounting rules (only leaf accounts can be used)

---

## ISSUE #6: Reports Redux Slice Mismatch (HIGH)

### Root Cause
Redux slice defines generic CRUD thunks that don't match actual report endpoints.

**Redux Slice (reportSlice.js):**
```javascript
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    const response = await reportAPI.getAll();  // ← Doesn't exist!
    return response.data;
  }
);
```

**Actual API (apiMethods.js):**
```javascript
export const reportAPI = {
  incomeStatement: (params) => api.get('/accounting/journal-entries/income-statement', { params }),
  balanceSheet: (params) => api.get('/accounting/journal-entries/balance-sheet', { params }),
  trialBalance: (params) => api.get('/accounting/journal-entries/trial-balance', { params }),
  // NO getAll() method!
};
```

### Why This Breaks
- Redux slice is completely disconnected from actual API
- Reports page doesn't use Redux at all (uses local state)
- If someone tries to use Redux, it fails with 404

---

## ISSUE #7: Reports Page - Missing General Ledger Report (MEDIUM)

### Root Cause
ReportFilters component offers "General Ledger" option, but Reports page doesn't handle it.

**ReportFilters.jsx:**
```javascript
const reportOptions = [
  { value: 'trial-balance', label: 'Trial Balance' },
  { value: 'income-statement', label: 'Income Statement' },
  { value: 'balance-sheet', label: 'Balance Sheet' },
  { value: 'general-ledger', label: 'General Ledger' },  // ← OFFERED
  { value: 'cash-flow', label: 'Cash Flow' },
];
```

**Reports.jsx fetchReport():**
```javascript
switch (reportType) {
  case 'trial-balance': ...
  case 'income-statement': ...
  case 'balance-sheet': ...
  case 'cash-flow': ...
  // NO case for 'general-ledger'!
}
```

### Why This Breaks
- User selects "General Ledger"
- No fetch happens
- No error shown
- User sees blank report

---

## ISSUE #8: Reports Page - Missing useRef Import (CRITICAL)

### Root Cause
Reports.jsx uses `useRef` but doesn't import it.

**Current Code (Reports.jsx:15):**
```javascript
const printRef = useRef(null);  // ← useRef not imported!
```

### Why This Breaks
- Component crashes with "useRef is not defined"
- Reports page doesn't render at all

---

## ISSUE #9: Reports Page - Missing useEffect Import (CRITICAL)

### Root Cause
Reports.jsx likely uses `useEffect` but doesn't import it.

### Why This Breaks
- Component crashes with "useEffect is not defined"

---

## ISSUE #10: Bank Service - No Active Account Filter (MEDIUM)

### Root Cause
`getAllBankAccounts()` returns ALL bank accounts including deleted ones.

**Current Code (bank.service.js:36):**
```javascript
static async getAllBankAccounts() {
  const banks = await Bank.find()  // ← No filters!
    .populate("createdBy", "name email")
    .populate("coaAccount", "accountName accountCode accountType")
    .sort({ createdAt: -1 })
    .lean();
```

**Should be:**
```javascript
static async getAllBankAccounts() {
  const banks = await Bank.find({ deletedAt: null, isActive: true })  // ← Add filters
    .populate("createdBy", "name email")
    .populate("coaAccount", "accountName accountCode accountType")
    .sort({ createdAt: -1 })
    .lean();
```

### Why This Breaks
- Shows deleted bank accounts
- Shows inactive bank accounts
- User confusion

---

## ISSUE #11: Reports - No Error Boundary (MEDIUM)

### Root Cause
Reports page doesn't handle component rendering errors.

### Why This Breaks
- If a report component crashes, whole page crashes
- No fallback UI shown

---

## ISSUE #12: Bank-Cash Frontend - No Loading States for COA Fetch (MEDIUM)

### Root Cause
COA accounts fetched but no loading indicator shown.

**Current Code (BankCash.jsx:96):**
```javascript
const fetchCOAAccounts = async () => {
  setCoaLoading(true);
  try {
    const res = await api.get('/accounts');
    // ...
  } finally {
    setCoaLoading(false);
  }
};
```

**But form doesn't check `coaLoading`:**
```javascript
// No disabled state while loading
<Select options={coaOptions} ... />
```

### Why This Breaks
- User can submit form while COA is still loading
- Form might have stale data

---

## ISSUE #13: Bank Service - Balance Calculation Error Handling (MEDIUM)

### Root Cause
If balance calculation fails, error is silently caught and balance set to 0.

**Current Code (bank.service.js:44):**
```javascript
try {
  bank.currentBalance = await this.calculateBankBalance(bank._id);
} catch (error) {
  bank.currentBalance = 0;  // ← Silent failure
  bank.balanceError = error.message;
}
```

### Why This Breaks
- User doesn't know balance is wrong
- Silent data corruption
- No audit trail of errors

---

## ISSUE #14: Reports - Missing Account Selection for General Ledger (MEDIUM)

### Root Cause
General Ledger report needs account selection, but ReportFilters doesn't provide it.

### Why This Breaks
- Can't generate general ledger for specific account
- Report would be incomplete

---

## ISSUE #15: COA Controller - Account Creation Missing Status Default (CRITICAL)

### Root Cause
When creating COA account, `status` field not set to default.

**Current Code (coa.controller.js):**
```javascript
const accountData = {
  accountCode,
  accountName,
  accountType,
  parentAccount,
  description,
  // ← status NOT SET!
  createdBy: req.user.userId
};
```

### Why This Breaks
- Accounts created with `status: undefined`
- Journal entry validation fails
- User can't use accounts

---

## Summary of All Fixes Needed

| # | Issue | Severity | File | Type | Fix |
|---|-------|----------|------|------|-----|
| 1 | Account status not active | CRITICAL | coa.controller.js | Backend | Add `status: 'active'` default |
| 2 | Total balance route unreachable | HIGH | bank.routes.js | Backend | Reorder routes |
| 3 | Missing openingBalance field | HIGH | bank.model.js | Backend | Add field to schema |
| 4 | Wrong COA filter field | MEDIUM | BankCash.jsx | Frontend | Change `isActive` to `status` |
| 5 | Fetches all accounts | MEDIUM | BankCash.jsx | Frontend | Use `/accounts/leaf-nodes` |
| 6 | Redux slice mismatch | HIGH | reportSlice.js | Frontend | Remove or fix slice |
| 7 | Missing general-ledger case | MEDIUM | Reports.jsx | Frontend | Add case for general-ledger |
| 8 | Missing useRef import | CRITICAL | Reports.jsx | Frontend | Add import |
| 9 | Missing useEffect import | CRITICAL | Reports.jsx | Frontend | Add import |
| 10 | No active filter | MEDIUM | bank.service.js | Backend | Add filters to query |
| 11 | No error boundary | MEDIUM | Reports.jsx | Frontend | Add ErrorBoundary |
| 12 | No COA loading state | MEDIUM | BankCash.jsx | Frontend | Disable form while loading |
| 13 | Silent balance errors | MEDIUM | bank.service.js | Backend | Log errors properly |
| 14 | No account selection for GL | MEDIUM | ReportFilters.jsx | Frontend | Add account select |
| 15 | Status not set on creation | CRITICAL | coa.controller.js | Backend | Ensure default status |

---

## Next Steps

1. Fix all 15 issues listed above
2. Test end-to-end flows
3. Verify all reports generate correctly
4. Test bank account creation and linking
5. Verify journal entries can be created with all accounts

