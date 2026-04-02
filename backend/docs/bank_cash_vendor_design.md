# Phase 6: Bank/Cash Module and Vendor/Payable Tracking Design

## 1. Overview
This phase focuses on implementing the Bank/Cash management module and basic Vendor/Payable tracking system to handle cash flow and supplier relationships.

## 2. Bank/Cash Module

### 2.1 Bank Account Management
The system will track multiple bank accounts with reconciliation capabilities.

**Features:**
- **Bank Account Creation**: Add and manage multiple bank accounts
- **Account Details**: Account number, bank name, branch, balance
- **Transaction History**: Track all deposits and withdrawals
- **Bank Reconciliation**: Match bank statements with recorded transactions
- **Cheque Management**: Track issued, cleared, and bounced cheques

### 2.2 Data Model: BankAccount
```javascript
{
  accountNumber: String,
  bankName: String,
  branch: String,
  accountType: String (Checking, Savings),
  openingBalance: Number,
  currentBalance: Number, // Calculated from transactions
  isActive: Boolean,
  createdBy: ObjectId (User),
  createdAt: Date,
  updatedAt: Date,
}
```

### 2.3 Data Model: BankTransaction
```javascript
{
  bankAccount: ObjectId (BankAccount),
  transactionDate: Date,
  transactionType: String (Deposit, Withdrawal),
  amount: Number,
  description: String,
  referenceNumber: String,
  relatedJournalEntry: ObjectId (JournalEntry), // Link to GL
  status: String (Pending, Cleared, Reconciled),
  createdBy: ObjectId (User),
  createdAt: Date,
}
```

### 2.4 API Endpoints
- `POST /api/bank/accounts` - Create bank account
- `GET /api/bank/accounts` - List all bank accounts
- `GET /api/bank/accounts/:id` - Get bank account details
- `PUT /api/bank/accounts/:id` - Update bank account
- `DELETE /api/bank/accounts/:id` - Delete bank account
- `POST /api/bank/transactions` - Record bank transaction
- `GET /api/bank/transactions` - List bank transactions
- `PUT /api/bank/reconcile` - Perform bank reconciliation

## 3. Vendor/Payable Tracking

### 3.1 Vendor Management
Track supplier information and payment terms.

**Features:**
- **Vendor Profiles**: Store vendor details and contact information
- **Payment Terms**: Track payment terms (Net 30, Net 60, etc.)
- **Vendor Ledger**: View all transactions with each vendor
- **Payable Aging**: Track overdue payments
- **Payment History**: Record payments made to vendors

### 3.2 Data Model: Vendor
```javascript
{
  vendorCode: String,
  vendorName: String,
  contactPerson: String,
  email: String,
  phone: String,
  address: String,
  paymentTerms: String (Net 30, Net 60, etc.),
  taxId: String,
  isActive: Boolean,
  createdBy: ObjectId (User),
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.3 Data Model: VendorInvoice
```javascript
{
  vendor: ObjectId (Vendor),
  invoiceNumber: String,
  invoiceDate: Date,
  dueDate: Date,
  amount: Number,
  description: String,
  status: String (Pending, Partial, Paid),
  relatedJournalEntry: ObjectId (JournalEntry),
  attachments: [String],
  createdBy: ObjectId (User),
  createdAt: Date,
}
```

### 3.4 Data Model: VendorPayment
```javascript
{
  vendor: ObjectId (Vendor),
  invoices: [ObjectId (VendorInvoice)],
  paymentAmount: Number,
  paymentDate: Date,
  paymentMethod: String (Bank Transfer, Cheque, Cash),
  referenceNumber: String,
  relatedJournalEntry: ObjectId (JournalEntry),
  createdBy: ObjectId (User),
  createdAt: Date,
}
```

### 3.5 API Endpoints
- `POST /api/vendors` - Create vendor
- `GET /api/vendors` - List vendors
- `GET /api/vendors/:id` - Get vendor details
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor
- `POST /api/vendor-invoices` - Record vendor invoice
- `GET /api/vendor-invoices` - List invoices
- `POST /api/vendor-payments` - Record vendor payment
- `GET /api/vendor-ledger/:vendorId` - Get vendor ledger

## 4. Integration with General Ledger

### 4.1 Bank Transactions
- When a bank transaction is recorded, a corresponding journal entry is created
- The journal entry links the bank account to the appropriate GL account
- Example: Bank deposit → Debit Bank Account, Credit Revenue

### 4.2 Vendor Payments
- When a vendor payment is recorded, a journal entry is created
- The journal entry records the payment against the vendor payable account
- Example: Vendor payment → Debit Accounts Payable, Credit Bank Account

## 5. Implementation Plan

### 5.1 Backend Implementation
1. Create Bank module with BankAccount and BankTransaction models
2. Create Vendor module with Vendor, VendorInvoice, and VendorPayment models
3. Implement service classes for business logic
4. Create API controllers and routes
5. Integrate with accounting service for GL entries

### 5.2 Frontend Implementation
1. Create Bank Account management pages
2. Create Bank Transaction recording interface
3. Create Vendor management pages
4. Create Vendor Invoice and Payment tracking interfaces
5. Create reports for payable aging and cash flow

## 6. Reporting

### 6.1 Bank Reports
- Bank Account Summary
- Bank Reconciliation Report
- Cheque Register

### 6.2 Vendor Reports
- Payable Aging Report
- Vendor Ledger
- Payment History

This design ensures proper cash flow management and vendor relationship tracking while maintaining integration with the core accounting system.
