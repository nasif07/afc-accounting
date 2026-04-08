# Comprehensive Accounting Module Audit Report
## Alliance Française Accounting System

**Date:** April 8, 2026  
**Scope:** Chart of Accounts, Journal Entries, Ledger, Cash/Bank, Reports  
**Status:** IN PROGRESS

---

## Executive Summary

This audit examines the end-to-end accounting functionality including:
- Chart of Accounts (COA) hierarchy and management
- Journal Entry creation, approval, and posting
- Ledger calculations and account balances
- Cash/Bank management
- Financial Reports (Trial Balance, Income Statement, Balance Sheet, Cash Flow)

---

## Phase 1: Backend Code Examination

### 1.1 Chart of Accounts Service (`coa.service.js`)

**Current Implementation:**
- Account hierarchy with parent-child relationships
- Leaf node detection via `hasRealChildren()`
- Transaction detection via `hasRealTransactions()`
- Account status management (active, inactive, archived)
- Soft delete support (deletedAt field)

**Issues Found:**

#### ISSUE #1: Inefficient Leaf Node Detection ⚠️
**Problem:** `hasRealChildren()` is called in a loop for each account
```javascript
if (filters.leafNodesOnly) {
  const leafAccounts = [];
  for (const account of accounts) {
    const hasChildren = await this.hasRealChildren(account._id);  // N+1 query!
    if (!hasChildren) {
      leafAccounts.push(account);
    }
  }
  return leafAccounts;
}
```
**Impact:** O(n) database queries for filtering - performance bottleneck
**Fix:** Use aggregation pipeline or batch query

#### ISSUE #2: No Circular Reference Prevention ⚠️
**Problem:** `updateAccount()` allows setting parentAccount without checking for circular references
```javascript
if (updateData.parentAccount !== undefined && String(updateData.parentAccount || '') !== String(account.parentAccount || '')) {
    const hasTransactions = await this.hasRealTransactions(accountId);
    if (hasTransactions) throw new Error("Cannot change parent of an account with transactions");
}
// ❌ No check: Can set parent to a child, creating circular reference!
```
**Impact:** Can corrupt account hierarchy
**Fix:** Add circular reference validation

#### ISSUE #3: Archive Logic Unclear ⚠️
**Problem:** `archiveAccount()` method not shown - need to verify it handles children properly

### 1.2 Accounting Service (`accounting.service.js`)

**Current Implementation:**
- Trial Balance generation
- Income Statement (P&L)
- Balance Sheet
- Cash Flow Statement
- General Ledger
- Account balance calculation

**Issues Found:**

#### ISSUE #4: Balance Calculation Inefficiency ⚠️
**Problem:** `calculateAccountBalance()` fetches ALL journal entries for an account
```javascript
const entries = await JournalEntry.find({
  "bookEntries.account": accountId,
  status: "posted",
  deletedAt: null,
  voucherDate: { $lte: asOfDate },
}).lean();

for (const entry of entries) {
  for (const line of entry.bookEntries) {
    if (line.account.toString() === accountId.toString()) {
      balance += line.debit || 0;
      balance -= line.credit || 0;
    }
  }
}
```
**Impact:** 
- Slow for accounts with many transactions
- No pagination or limits
- Recalculates on every query

**Fix:** 
- Cache account balances
- Use aggregation pipeline
- Add indexes on voucherDate

#### ISSUE #5: Income Statement Period Calculation ⚠️
**Problem:** Uses cumulative balance difference instead of period-specific entries
```javascript
const balanceData = await this.calculateAccountBalance(account._id, new Date(endDate));
const startBalanceData = await this.calculateAccountBalance(account._id, new Date(startDate));
const periodBalance = balanceData.balance - startBalanceData.balance;
```
**Impact:** Incorrect if opening balance changes
**Fix:** Query only entries within the period

#### ISSUE #6: Retained Earnings Calculation ⚠️
**Problem:** Uses fiscal year start, not actual retained earnings account
```javascript
const fiscalYearStart = new Date(asOfDate.getFullYear(), 0, 1);
const incomeStatement = await this.generateIncomeStatement(fiscalYearStart, asOfDate);
const retainedEarnings = incomeStatement.netIncome;
```
**Impact:** Doesn't account for prior year earnings
**Fix:** Query actual Retained Earnings account balance

#### ISSUE #7: Missing Ledger Implementation ⚠️
**Problem:** `getGeneralLedgerForAccount()` exists but no endpoint to list all accounts' ledgers
**Fix:** Add ledger listing and filtering endpoints

### 1.3 Journal Entry Model & Service

**Need to examine:**
- Validation logic
- Double-entry enforcement
- Leaf account enforcement
- Approval workflow
- Post logic

---

## Phase 2: Frontend Code Examination

**Need to examine:**
- Chart of Accounts tree view
- Journal Entry form
- Ledger display
- Reports UI
- Validation and error handling

---

## Phase 3: Integration Issues

**Need to verify:**
- API response formats
- Error handling consistency
- Frontend-backend data flow
- Missing endpoints

---

## Identified Issues Summary

| # | Issue | Severity | Component | Fix |
|---|-------|----------|-----------|-----|
| 1 | N+1 queries in leaf node filtering | HIGH | COA Service | Use aggregation |
| 2 | No circular reference prevention | CRITICAL | COA Service | Add validation |
| 3 | Archive logic unclear | MEDIUM | COA Service | Review & document |
| 4 | Balance calculation inefficiency | HIGH | Accounting Service | Cache & optimize |
| 5 | Income statement period calculation | HIGH | Accounting Service | Query period entries |
| 6 | Retained earnings calculation | MEDIUM | Accounting Service | Use actual account |
| 7 | Missing ledger endpoints | MEDIUM | Accounting Service | Add endpoints |

---

## Next Steps

1. Complete backend code review
2. Examine frontend code
3. Test end-to-end flows
4. Fix identified issues
5. Implement missing features
6. Verify accounting logic correctness

