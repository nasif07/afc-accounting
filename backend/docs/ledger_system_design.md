# General Ledger System Design for AFC Accounting

## 1. Introduction
This document outlines the design and implementation plan for the General Ledger (GL) system and the associated account balance calculation logic within the AFC Accounting software. The primary goal is to provide a robust, accurate, and auditable ledger system that adheres to double-entry accounting principles and the requirement that account balances are calculated dynamically from journal entries, not stored.

## 2. Data Model

The existing `JournalEntry` and `ChartOfAccounts` models are foundational. The General Ledger itself will not require a new dedicated MongoDB collection. Instead, GL entries and account balances will be derived by querying and aggregating data from the `JournalEntry` collection, linked to `ChartOfAccounts`.

### 2.1. `JournalEntry` Model (Existing - Reference)

```javascript
const journalEntrySchema = new mongoose.Schema(
  {
    voucherNumber: { type: String, unique: true },
    voucherDate: { type: Date, required: true },
    transactionType: { type: String, enum: Object.values(TRANSACTION_TYPES), required: true },
    bookEntries: [
      {
        account: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts', required: true },
        debit: { type: Number, default: 0 }, // Stored as cents, retrieved as dollars
        credit: { type: Number, default: 0 }, // Stored as cents, retrieved as dollars
        description: { type: String, trim: true },
      },
    ],
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    isBalanced: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: Object.values(APPROVAL_STATUS), default: APPROVAL_STATUS.PENDING },
    status: { type: String, enum: ['draft', 'posted', 'reversed', 'deleted'], default: 'draft' },
    // ... other fields
  },
  { timestamps: true }
);
```

### 2.2. `ChartOfAccounts` Model (Existing - Reference)

```javascript
const coaSchema = new mongoose.Schema(
  {
    accountCode: { type: String, required: true, unique: true },
    accountName: { type: String, required: true },
    accountType: { type: String, enum: Object.values(ACCOUNT_TYPES), required: true },
    parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts', default: null },
    openingBalance: { type: Number, default: 0 }, // Stored as cents, retrieved as dollars
    // ... other fields
  },
  { timestamps: true }
);
```

## 3. General Ledger (GL) System Logic

The General Ledger will be a conceptual view generated on-the-fly by querying `JournalEntry` documents. For each `ChartOfAccounts` entry, its corresponding GL will list all `bookEntries` where that account is involved.

### 3.1. Retrieving General Ledger for a Specific Account

To retrieve the General Ledger for a given `accountId` within a specified date range, the following steps will be taken:

1.  **Query `JournalEntry`**: Find all `JournalEntry` documents where any `bookEntry.account` matches the `accountId` and the `voucherDate` falls within the requested range. Only `posted` entries should be considered.
2.  **Populate Account Details**: Populate the `bookEntries.account` field to get `accountName`, `accountCode`, and `accountType` for display.
3.  **Sort**: Sort the results by `voucherDate` and then `createdAt` to ensure chronological order.
4.  **Format**: Present the data in a clear, readable format, showing the `voucherNumber`, `voucherDate`, `description`, `debit`, and `credit` for each line item related to the target account.

### 3.2. Calculating Account Balances

Account balances will be calculated dynamically based on the `openingBalance` from the `ChartOfAccounts` and the sum of all `posted` `debit` and `credit` entries from the `JournalEntry` collection up to a specific date.

**Formula for Balance Calculation:**

`Current Balance = Opening Balance + Sum(Debits for Account) - Sum(Credits for Account)`

**Steps for Balance Calculation:**

1.  **Retrieve Opening Balance**: Fetch the `openingBalance` for the `accountId` from the `ChartOfAccounts` model.
2.  **Aggregate Journal Entries**: Use MongoDB aggregation to sum all `debit` and `credit` amounts for the `accountId` from `JournalEntry` documents with `status: 'posted'` and `voucherDate` less than or equal to the desired `asOfDate`.
3.  **Apply Account Type Logic**: Account types (e.g., Asset, Liability, Equity, Revenue, Expense) determine the natural balance. For example, Assets and Expenses naturally have debit balances, while Liabilities, Equity, and Revenue naturally have credit balances. The final balance display should reflect this (e.g., a negative balance for a liability account might be displayed as a positive credit balance).

## 4. API Endpoints (Proposed)

To support the General Ledger functionality, the following API endpoints will be added to the backend:

*   **`GET /api/accounting/ledger/:accountId`**: Retrieves the General Ledger for a specific account.
    *   **Parameters**: `accountId` (path), `startDate`, `endDate` (query, optional)
    *   **Response**: List of journal line items related to the account.

*   **`GET /api/accounting/balance/:accountId`**: Retrieves the current calculated balance for a specific account.
    *   **Parameters**: `accountId` (path), `asOfDate` (query, optional, defaults to today)
    *   **Response**: `{ accountId, balance, accountType, naturalBalanceType }`

## 5. Integration with Existing Modules

*   **`accounting.service.js`**: This service will be extended to include methods for `getGeneralLedgerForAccount` and `calculateAccountBalance`. These methods will encapsulate the querying and aggregation logic.
*   **`coa.service.js`**: The `getAccountBalance` method in `coa.service.js` will be updated to use the new balance calculation logic from `accounting.service.js` to ensure consistency and correctness.
*   **Frontend**: New components will be developed to display the General Ledger and account balances, utilizing these new API endpoints.

## 6. Implementation Steps

1.  **Update `accounting.service.js`**: Add `getGeneralLedgerForAccount` and `calculateAccountBalance` methods.
2.  **Update `accounting.controller.js`**: Add new routes for the GL and balance endpoints.
3.  **Update `coa.service.js`**: Modify `getAccountBalance` to use the new calculation.
4.  **Frontend Integration**: Develop UI components to consume these new APIs and display the GL and balances.

This design ensures that the General Ledger system is robust, accurate, and dynamically calculated, aligning with best accounting practices and the project's requirements. [1]

## References
[1] [Double-Entry Accounting Explained - Investopedia](https://www.investopedia.com/terms/d/double-entry.asp)
