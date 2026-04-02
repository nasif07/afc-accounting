# Financial Reporting System Design for AFC Accounting

## 1. Introduction
This document outlines the design and implementation plan for the Trial Balance and core financial reports (Income Statement and Balance Sheet) within the AFC Accounting software. These reports are essential for assessing the financial health of the organization and ensuring accounting accuracy.

## 2. Trial Balance

The Trial Balance is a report that lists the balances of all general ledger accounts at a specific point in time. The total debits must equal the total credits.

### 2.1. Logic for Trial Balance Generation

1.  **Retrieve All Active Accounts**: Fetch all accounts from the `ChartOfAccounts` that are not deleted or archived.
2.  **Calculate Balances**: For each account, calculate its current balance using the `calculateAccountBalance` logic (Opening Balance + Debits - Credits).
3.  **Categorize**: Group accounts by their natural balance type (Debit or Credit).
    *   **Debit Column**: Assets and Expenses.
    *   **Credit Column**: Liabilities, Equity, and Revenue.
4.  **Sum Totals**: Calculate the total of the Debit column and the total of the Credit column.
5.  **Verification**: Ensure `Total Debits = Total Credits`.

### 2.2. API Endpoint: `GET /api/accounting/reports/trial-balance`
*   **Parameters**: `asOfDate` (query, optional)
*   **Response**: `{ accounts: [{ accountCode, accountName, debitBalance, creditBalance }], totalDebits, totalCredits, isBalanced }`

## 3. Income Statement (Profit & Loss)

The Income Statement shows the organization's financial performance over a specific period by summarizing revenues and expenses.

### 3.1. Logic for Income Statement Generation

1.  **Filter by Date Range**: Accept `startDate` and `endDate`.
2.  **Retrieve Revenue Accounts**: Fetch all accounts with `accountType: 'Revenue'`.
3.  **Retrieve Expense Accounts**: Fetch all accounts with `accountType: 'Expense'`.
4.  **Calculate Period Balances**: For each account, calculate the net change (Debits - Credits for Expenses, Credits - Debits for Revenue) within the date range.
5.  **Calculate Net Income**: `Net Income = Total Revenue - Total Expenses`.

### 3.2. API Endpoint: `GET /api/accounting/reports/income-statement`
*   **Parameters**: `startDate`, `endDate` (query, required)
*   **Response**: `{ revenues: [...], totalRevenue, expenses: [...], totalExpenses, netIncome }`

## 4. Balance Sheet

The Balance Sheet provides a snapshot of the organization's financial position (Assets, Liabilities, and Equity) at a specific point in time.

### 4.1. Logic for Balance Sheet Generation

1.  **Filter by Date**: Accept `asOfDate`.
2.  **Retrieve Asset Accounts**: Fetch all accounts with `accountType: 'Asset'`.
3.  **Retrieve Liability Accounts**: Fetch all accounts with `accountType: 'Liability'`.
4.  **Retrieve Equity Accounts**: Fetch all accounts with `accountType: 'Equity'`.
5.  **Calculate Balances**: Calculate the cumulative balance for each account as of the `asOfDate`.
6.  **Include Net Income**: The Net Income from the beginning of the financial year up to the `asOfDate` must be included in the Equity section (typically as Retained Earnings).
7.  **Verification**: Ensure `Total Assets = Total Liabilities + Total Equity`.

### 4.2. API Endpoint: `GET /api/accounting/reports/balance-sheet`
*   **Parameters**: `asOfDate` (query, optional)
*   **Response**: `{ assets: [...], totalAssets, liabilities: [...], totalLiabilities, equity: [...], totalEquity, isBalanced }`

## 5. Implementation Plan

1.  **Update `accounting.service.js`**: Implement `generateTrialBalance`, `generateIncomeStatement`, and `generateBalanceSheet` methods.
2.  **Update `accounting.controller.js`**: Add controller methods for these reports.
3.  **Update `accounting.routes.js`**: Add the corresponding API routes.
4.  **Frontend Integration**: Create report viewer components in the frontend to display these financial statements.

This design ensures that the financial reporting system is accurate, follows standard accounting principles, and provides valuable insights into the organization's financial status. [1]

## References
[1] [Financial Statements - Investopedia](https://www.investopedia.com/terms/f/financial-statements.asp)
