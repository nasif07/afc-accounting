# Alliance Accounting System - Complete Workflow Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Workflows](#core-workflows)
4. [Module Workflows](#module-workflows)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Database Schema Overview](#database-schema-overview)
7. [Approval Workflows](#approval-workflows)
8. [Financial Reporting](#financial-reporting)
9. [Security & Authentication](#security--authentication)
10. [Deployment Guide](#deployment-guide)

---

## System Architecture

### Technology Stack
- **Backend**: Express.js 4.21.2 + Node.js
- **Database**: MongoDB 6.13.0 + Mongoose 8.10.0
- **Frontend**: React 19 + Vite + Redux Toolkit + Tailwind CSS 4
- **Authentication**: JWT (JSON Web Tokens)
- **File Management**: Multer for uploads
- **PDF Generation**: PDFKit
- **Email**: Nodemailer

### Project Structure
```
alliance-accounting-mern/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js (MongoDB connection)
│   │   │   ├── constants.js (App constants)
│   │   │   └── passport.js (JWT strategy)
│   │   ├── middleware/
│   │   │   ├── auth.js (JWT verification)
│   │   │   ├── roleCheck.js (Role-based access)
│   │   │   └── errorMiddleware.js (Error handling)
│   │   ├── modules/ (13 modules)
│   │   │   ├── auth/
│   │   │   ├── chartOfAccounts/
│   │   │   ├── students/
│   │   │   ├── receipts/
│   │   │   ├── expenses/
│   │   │   ├── vendors/
│   │   │   ├── employees/
│   │   │   ├── payroll/
│   │   │   ├── accounting/
│   │   │   ├── bank/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── search/
│   │   ├── routes/
│   │   │   └── index.js (Central router)
│   │   ├── utils/
│   │   │   ├── apiResponse.js
│   │   │   ├── pdfGenerator.js
│   │   │   └── fileUploader.js
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── store/ (Redux)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── WORKFLOW_DOCUMENTATION.md
```

---

## User Roles & Permissions

### Three User Roles

| Role | Permissions | Approval Authority |
|------|-------------|-------------------|
| **Director** | Full access to all features, approves all transactions, manages settings | Can approve/reject all items |
| **Accountant** | Create/edit transactions, manage students/vendors/employees, view reports | Cannot approve (needs Director) |
| **Sub-Accountant** | View-only access, data entry for receipts/expenses | No approval authority |

### Role-Based Middleware
```javascript
// In middleware/roleCheck.js
- directorOnly: Only Director can access
- accountantOrDirector: Accountant and Director can access
- allRoles: All authenticated users can access
```

---

## Core Workflows

### 1. User Registration & Login Flow

**Registration:**
```
1. User visits /register
2. Enters: Name, Email, Password, Confirm Password
3. System validates password strength (min 6 chars)
4. Creates user with default role: sub-accountant
5. Returns JWT token
6. Token stored in httpOnly cookie
```

**Login:**
```
1. User enters Email & Password
2. System validates credentials
3. Checks account lock status (5 failed attempts = 30 min lock)
4. On success: Generates JWT token, updates lastLogin
5. Token stored in secure cookie
6. User redirected to Dashboard
```

**Logout:**
```
1. User clicks Logout
2. System clears authentication cookie
3. Redirects to Login page
```

---

### 2. Double-Entry Accounting System

**Core Principle:**
```
Debits = Credits (Always)

Every transaction must have:
- At least 2 book entries (1 debit, 1 credit)
- Total debits = Total credits
- If not balanced, transaction is rejected
```

**Example Transaction:**
```
Receipt of ৳10,000 tuition fee:
  Debit:  Bank Account    ৳10,000
  Credit: Tuition Income  ৳10,000
  
Payment of ৳5,000 salary:
  Debit:  Salary Expense  ৳5,000
  Credit: Bank Account    ৳5,000
```

---

### 3. Approval Workflow

**Standard Approval Process:**
```
1. Accountant creates transaction (Receipt, Expense, Payroll, etc.)
2. Transaction status: "Pending"
3. Director reviews transaction
4. Director can:
   a) Approve → Status: "Approved" (affects accounts)
   b) Reject → Status: "Rejected" (with reason)
5. If rejected, Accountant can edit and resubmit
```

**Approval Limits:**
- Accountant can create transactions up to limit (e.g., ৳50,000)
- Director approves all transactions
- Configurable in Settings

---

## Module Workflows

### Module 1: Chart of Accounts (COA)

**Purpose**: Master list of all accounts

**Workflow:**
```
1. Director creates Chart of Accounts
2. Define account types:
   - Asset (Bank, Receivables)
   - Liability (Payables)
   - Equity (Opening Balance)
   - Income (Fees, Donations)
   - Expense (Salary, Utilities)
3. Set opening balance for each account
4. System calculates current balance automatically
```

**Key Features:**
- Account Code (e.g., 1001, 2001)
- Account Name
- Account Type
- Opening Balance
- Current Balance (auto-calculated)
- Parent Account (for hierarchical structure)

---

### Module 2: Students Management

**Workflow:**
```
1. Accountant creates student profile
   - Roll Number (unique)
   - Name, Class, Section
   - Parent details
   - Contact information
   - Total fees payable

2. System tracks:
   - Total fees payable
   - Total fees paid
   - Pending amount

3. Bulk import available:
   - Upload CSV/Excel with student data
   - System validates and imports
   - Reports any errors
```

**Student Status:**
- Active
- Inactive
- Suspended

---

### Module 3: Fee Collection (Receipts)

**Workflow:**
```
1. Accountant creates receipt
   - Receipt Number (auto-generated)
   - Select Student
   - Fee Type (Tuition, Exam, Registration, etc.)
   - Amount
   - Payment Mode (Bank, Cheque, Card, Cash)
   - Reference Number (cheque no., transaction ID)

2. System creates journal entry:
   Debit:  Bank Account
   Credit: Tuition Income (or other fee type)

3. Receipt status: "Pending"

4. Director reviews and approves
   - On approval: PDF receipt generated
   - Student fee status updated
   - Journal entry confirmed

5. System sends notification to Director
```

**Payment Modes:**
- Bank Transfer
- Cheque
- Card
- Cash

**Fee Types:**
- Tuition
- Exam
- Registration
- Activity
- Transport
- Miscellaneous

---

### Module 4: Expense Management

**Workflow:**
```
1. Accountant creates expense
   - Expense Number (auto-generated)
   - Category (Salary, Utilities, Supplies, etc.)
   - Vendor (optional)
   - Description
   - Amount
   - Payment Mode
   - Attachments (Invoice/Bill)

2. System creates journal entry:
   Debit:  Expense Account
   Credit: Bank Account

3. Expense status: "Pending"

4. Director reviews and approves
   - Checks amount against approval limit
   - Reviews attachments
   - Approves or rejects with reason

5. On approval:
   - Expense marked as approved
   - Journal entry confirmed
   - Vendor payable updated
```

**Expense Categories:**
- Salary
- Utilities
- Supplies
- Maintenance
- Petty Cash
- Other

---

### Module 5: Vendor Management

**Workflow:**
```
1. Accountant creates vendor profile
   - Vendor Code
   - Vendor Name
   - Vendor Type (Supplier, Service Provider, etc.)
   - Contact details
   - Bank account info
   - Address

2. System tracks:
   - Total payable amount
   - Total paid amount
   - Outstanding balance

3. Vendor status:
   - Active
   - Inactive
   - Blocked
```

---

### Module 6: Employee Management

**Workflow:**
```
1. Director/Accountant creates employee record
   - Employee Code
   - Name, Designation, Department
   - Date of Joining
   - Salary Type (Fixed, Hourly, Per-Class)
   - Base Salary
   - Contact details
   - Address

2. Track employee status:
   - Active
   - Inactive
   - On Leave
   - Resigned

3. Department-wise grouping
```

---

### Module 7: Payroll Processing

**Workflow:**
```
1. Accountant creates payroll record for month
   - Select Employee
   - Month & Year
   - Base Salary
   - Allowances (HRA, DA, etc.)
   - Bonus
   - Deductions (PF, Tax, etc.)
   - Leave Deduction

2. System calculates:
   Total Earnings = Base + Allowances + Bonus
   Total Deductions = Deductions + Leave Deduction
   Net Salary = Total Earnings - Total Deductions

3. System creates journal entry:
   Debit:  Salary Expense
   Credit: Bank Account

4. Payroll status: "Pending"

5. Director approves
   - Reviews calculations
   - Approves or rejects

6. On approval:
   - Payroll marked as approved
   - PDF payslip generated
   - Journal entry confirmed

7. Mark as paid:
   - Payment Date
   - Payment Mode
   - Reference Number
```

**Salary Types:**
- Fixed: Same salary every month
- Hourly: Based on hours worked
- Per-Class: Based on classes taught

---

### Module 8: Journal Entries (Accounting)

**Workflow:**
```
1. Accountant creates journal entry
   - Reference Number
   - Transaction Type (General, Fee, Expense, Payroll, Transfer)
   - Description
   - Book Entries:
     * Account to Debit
     * Amount
     * Account to Credit
     * Amount

2. System validates:
   - Total Debits = Total Credits
   - All accounts exist
   - All amounts are positive

3. If validation fails: Entry rejected with error

4. If validation passes: Entry status = "Pending"

5. Director reviews and approves
   - Can view all book entries
   - Approve or reject

6. On approval:
   - Account balances updated
   - Entry marked as approved

7. On rejection:
   - Account balances NOT updated
   - Entry marked as rejected
   - Accountant can edit and resubmit
```

---

### Module 9: Bank Account Management

**Workflow:**
```
1. Director creates bank account
   - Bank Name
   - Account Number
   - Account Holder
   - IFSC Code
   - Branch
   - Account Type (Savings, Current)
   - Opening Balance

2. System tracks:
   - Opening Balance
   - Current Balance (auto-updated)
   - Last Reconciled Date
   - Reconciliation Difference

3. Bank reconciliation:
   - Director enters reconciled balance
   - System calculates difference
   - Flags if difference > threshold

4. Multiple bank accounts supported
   - Total balance across all accounts shown
```

---

### Module 10: Financial Reports

**Available Reports:**

**1. Income Statement (P&L)**
```
Revenue:
  - Tuition Fees: ৳X
  - Exam Fees: ৳Y
  - Total Revenue: ৳Z

Expenses:
  - Salary: ৳A
  - Utilities: ৳B
  - Total Expenses: ৳C

Net Income: ৳Z - ৳C
```

**2. Balance Sheet**
```
Assets:
  - Bank Balance: ৳X
  - Receivables: ৳Y
  Total Assets: ৳A

Liabilities:
  - Payables: ৳L
  Total Liabilities: ৳L

Equity:
  - Opening Balance: ৳E
  Total Equity: ৳E

Total Liabilities + Equity: ৳L + ৳E
(Should equal Total Assets)
```

**3. Cash Flow Statement**
```
Opening Cash: ৳X
+ Cash Inflows (Receipts): ৳I
- Cash Outflows (Expenses): ৳O
= Closing Cash: ৳X + ৳I - ৳O
```

**4. Receipt & Payment Summary**
```
Receipts by Type:
  - Tuition: ৳X
  - Exam: ৳Y
  Total Receipts: ৳Z

Payments by Category:
  - Salary: ৳A
  - Utilities: ৳B
  Total Payments: ৳C
```

**5. Head-wise Income Report**
```
Income by Fee Type with:
- Total amount
- Number of transactions
- Average per transaction
```

**6. Trial Balance**
```
List of all accounts with:
- Account Code
- Account Name
- Balance (Debit or Credit)

Validates: Total Debits = Total Credits
```

---

### Module 11: System Settings

**Configurable Settings:**

1. **Financial Year**
   - July-June (Indian FY)
   - January-December (Calendar year)

2. **Approval Limits**
   - Accountant approval limit (e.g., ৳50,000)
   - Director approval limit (Unlimited)

3. **Voucher Numbering**
   - Receipt prefix (e.g., RCP)
   - Expense prefix (e.g., EXP)
   - Payroll prefix (e.g., PAY)
   - Journal prefix (e.g., JNL)

4. **Currency Format**
   - Bangladeshi Taka (৳)
   - Other currencies

5. **Organization Details**
   - School name
   - Address
   - Logo
   - Signature

---

### Module 12: Global Search

**Search Capabilities:**

```
1. Global Search (across all modules)
   - Receipts
   - Expenses
   - Journal Entries
   - Students
   - Vendors
   - Employees

2. Specific Module Search
   - Search receipts by number, description
   - Search expenses by number, vendor
   - Search journal entries by reference
   - Search students by name, roll number

3. Advanced Filters
   - Date range
   - Amount range
   - Status (Pending, Approved, Rejected)
   - Category/Type
   - User (Created by)

4. Export Results
   - Download as CSV
   - Download as PDF
```

---

## API Endpoints Reference

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login user
POST   /api/auth/logout            Logout user
GET    /api/auth/me                Get current user
```

### Chart of Accounts
```
POST   /api/chart-of-accounts      Create account
GET    /api/chart-of-accounts      List all accounts
GET    /api/chart-of-accounts/:id  Get single account
PUT    /api/chart-of-accounts/:id  Update account
DELETE /api/chart-of-accounts/:id  Delete account
GET    /api/chart-of-accounts/:id/balance  Get balance
```

### Students
```
POST   /api/students               Create student
GET    /api/students               List students
GET    /api/students/:id           Get single student
PUT    /api/students/:id           Update student
DELETE /api/students/:id           Delete student
POST   /api/students/bulk/import   Bulk import
```

### Receipts (Fee Collection)
```
POST   /api/receipts               Create receipt
GET    /api/receipts               List receipts
GET    /api/receipts/:id           Get single receipt
PUT    /api/receipts/:id           Update receipt
DELETE /api/receipts/:id           Delete receipt
PUT    /api/receipts/:id/approve   Approve receipt
PUT    /api/receipts/:id/reject    Reject receipt
GET    /api/receipts/report/total-collected  Get totals
```

### Expenses
```
POST   /api/expenses               Create expense
GET    /api/expenses               List expenses
GET    /api/expenses/:id           Get single expense
PUT    /api/expenses/:id           Update expense
DELETE /api/expenses/:id           Delete expense
PUT    /api/expenses/:id/approve   Approve expense
PUT    /api/expenses/:id/reject    Reject expense
GET    /api/expenses/report/total-expenses  Get totals
```

### Vendors
```
POST   /api/vendors                Create vendor
GET    /api/vendors                List vendors
GET    /api/vendors/:id            Get single vendor
PUT    /api/vendors/:id            Update vendor
DELETE /api/vendors/:id            Delete vendor
GET    /api/vendors/:id/payables   Get payables
GET    /api/vendors/report/total-payables  Get totals
```

### Employees
```
POST   /api/employees              Create employee
GET    /api/employees              List employees
GET    /api/employees/:id          Get single employee
PUT    /api/employees/:id          Update employee
DELETE /api/employees/:id          Delete employee
PUT    /api/employees/:id/status   Update status
GET    /api/employees/report/total-employees  Get count
```

### Payroll
```
POST   /api/payroll                Create payroll
GET    /api/payroll                List payroll
GET    /api/payroll/:id            Get single payroll
PUT    /api/payroll/:id            Update payroll
DELETE /api/payroll/:id            Delete payroll
PUT    /api/payroll/:id/approve    Approve payroll
PUT    /api/payroll/:id/reject     Reject payroll
PUT    /api/payroll/:id/mark-paid  Mark as paid
GET    /api/payroll/report/summary Get summary
GET    /api/payroll/:id/payslip    Download payslip
```

### Journal Entries
```
POST   /api/accounting/journal-entries              Create entry
GET    /api/accounting/journal-entries              List entries
GET    /api/accounting/journal-entries/:id          Get entry
PUT    /api/accounting/journal-entries/:id          Update entry
DELETE /api/accounting/journal-entries/:id          Delete entry
PUT    /api/accounting/journal-entries/:id/approve  Approve entry
PUT    /api/accounting/journal-entries/:id/reject   Reject entry
```

### Bank
```
POST   /api/bank                   Create bank account
GET    /api/bank                   List accounts
GET    /api/bank/:id               Get single account
PUT    /api/bank/:id               Update account
DELETE /api/bank/:id               Delete account
PUT    /api/bank/:id/reconcile     Reconcile account
GET    /api/bank/report/total-balance  Get total balance
```

### Reports
```
GET    /api/reports/income-statement      Get P&L
GET    /api/reports/balance-sheet         Get Balance Sheet
GET    /api/reports/cash-flow             Get Cash Flow
GET    /api/reports/receipt-payment       Get R&P Summary
GET    /api/reports/headwise-income       Get Income Report
GET    /api/reports/trial-balance         Get Trial Balance
```

### Settings
```
GET    /api/settings                      Get settings
PUT    /api/settings                      Update settings
GET    /api/settings/financial-year       Get FY settings
GET    /api/settings/approval-limits      Get approval limits
PUT    /api/settings/approval-limits      Update limits
GET    /api/settings/voucher-format       Get voucher format
PUT    /api/settings/voucher-format       Update format
```

### Search
```
GET    /api/search?q=query                Global search
GET    /api/search/receipts?q=query       Search receipts
GET    /api/search/expenses?q=query       Search expenses
GET    /api/search/journal-entries?q=query  Search entries
GET    /api/search/students?q=query       Search students
GET    /api/search/amount-range?minAmount=X&maxAmount=Y  Amount search
```

---

## Database Schema Overview

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['director', 'accountant', 'sub-accountant'],
  loginAttempts: Number,
  lockUntil: Date,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### ChartOfAccounts
```javascript
{
  _id: ObjectId,
  accountCode: String (unique),
  accountName: String,
  accountType: Enum ['asset', 'liability', 'equity', 'income', 'expense'],
  openingBalance: Number,
  currentBalance: Number,
  parentAccount: ObjectId (ref),
  isActive: Boolean,
  createdBy: ObjectId (ref User),
  createdAt: Date,
  updatedAt: Date
}
```

### JournalEntry
```javascript
{
  _id: ObjectId,
  referenceNumber: String (unique),
  transactionType: Enum ['general', 'fee', 'expense', 'payroll', 'transfer'],
  description: String,
  date: Date,
  bookEntries: [
    {
      account: ObjectId (ref ChartOfAccounts),
      isDebit: Boolean,
      amount: Number
    }
  ],
  approvalStatus: Enum ['pending', 'approved', 'rejected'],
  createdBy: ObjectId (ref User),
  approvedBy: ObjectId (ref User),
  approvalDate: Date,
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Student
```javascript
{
  _id: ObjectId,
  rollNumber: String (unique),
  name: String,
  class: String,
  section: String,
  email: String,
  phone: String,
  parentName: String,
  parentEmail: String,
  parentPhone: String,
  address: String,
  dateOfBirth: Date,
  totalFeesPayable: Number,
  totalFeesPaid: Number,
  feePendingAmount: Number,
  status: Enum ['active', 'inactive', 'suspended'],
  createdAt: Date,
  updatedAt: Date
}
```

### Receipt
```javascript
{
  _id: ObjectId,
  receiptNumber: String (unique),
  student: ObjectId (ref Student),
  feeType: String,
  amount: Number,
  paymentMode: Enum ['bank', 'cheque', 'card', 'cash'],
  referenceNumber: String,
  description: String,
  date: Date,
  approvalStatus: Enum ['pending', 'approved', 'rejected'],
  createdBy: ObjectId (ref User),
  approvedBy: ObjectId (ref User),
  approvalDate: Date,
  rejectionReason: String,
  pdfPath: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Expense
```javascript
{
  _id: ObjectId,
  expenseNumber: String (unique),
  category: String,
  vendor: ObjectId (ref Vendor),
  description: String,
  amount: Number,
  paymentMode: Enum ['bank', 'cheque', 'card', 'cash'],
  referenceNumber: String,
  date: Date,
  attachments: [String],
  approvalStatus: Enum ['pending', 'approved', 'rejected'],
  createdBy: ObjectId (ref User),
  approvedBy: ObjectId (ref User),
  approvalDate: Date,
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Payroll
```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref Employee),
  month: Number (1-12),
  year: Number,
  baseSalary: Number,
  allowances: Number,
  bonus: Number,
  deductions: Number,
  leaveDeduction: Number,
  netSalary: Number,
  description: String,
  approvalStatus: Enum ['pending', 'approved', 'rejected'],
  paymentStatus: Enum ['unpaid', 'paid'],
  paymentDate: Date,
  paymentMode: String,
  referenceNumber: String,
  createdBy: ObjectId (ref User),
  approvedBy: ObjectId (ref User),
  approvalDate: Date,
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Approval Workflows

### Receipt Approval Flow
```
Accountant Creates Receipt
         ↓
   Status: Pending
         ↓
  Director Reviews
    ↙        ↘
Approve    Reject
   ↓          ↓
Approved   Rejected
   ↓          ↓
PDF Gen    Accountant
Journal    Can Edit
Updated    & Resubmit
```

### Expense Approval Flow
```
Accountant Creates Expense
         ↓
   Status: Pending
         ↓
  Director Reviews
  (Checks Amount Limit)
    ↙        ↘
Approve    Reject
   ↓          ↓
Approved   Rejected
   ↓          ↓
Journal    Accountant
Updated    Can Edit
Vendor     & Resubmit
Updated
```

### Payroll Approval Flow
```
Accountant Creates Payroll
         ↓
   Status: Pending
         ↓
  Director Reviews
  (Checks Calculations)
    ↙        ↘
Approve    Reject
   ↓          ↓
Approved   Rejected
   ↓          ↓
Journal    Accountant
Updated    Can Edit
         & Resubmit
         ↓
    Director Marks Paid
         ↓
    Status: Paid
```

---

## Financial Reporting

### Report Generation Process

**1. Income Statement (P&L)**
```
Query all approved receipts → Sum by fee type → Total Revenue
Query all approved expenses → Sum by category → Total Expenses
Net Income = Revenue - Expenses
```

**2. Balance Sheet**
```
Query all asset accounts → Sum balances → Total Assets
Query all liability accounts → Sum balances → Total Liabilities
Query all equity accounts → Sum balances → Total Equity
Verify: Assets = Liabilities + Equity
```

**3. Cash Flow Statement**
```
Get opening bank balance
Query approved receipts in period → Total inflows
Query approved expenses in period → Total outflows
Closing Balance = Opening + Inflows - Outflows
```

**4. Trial Balance**
```
Query all accounts with balances
Sum all debit balances
Sum all credit balances
Verify: Total Debits = Total Credits
If not balanced → Error in journal entries
```

---

## Security & Authentication

### JWT Token Structure
```javascript
{
  userId: ObjectId,
  email: String,
  role: String,
  iat: Timestamp (issued at),
  exp: Timestamp (expires in 7 days)
}
```

### Password Security
- Minimum 6 characters
- Hashed with bcryptjs (10 salt rounds)
- Never stored in plain text
- Account locked after 5 failed attempts (30 min)

### Role-Based Access Control
```
Public Routes:
  - POST /api/auth/register
  - POST /api/auth/login

Protected Routes (All Authenticated):
  - GET /api/auth/me
  - POST /api/auth/logout

Accountant+ Routes:
  - Create/Edit transactions
  - Manage students/vendors/employees

Director Only Routes:
  - Approve/Reject transactions
  - Manage bank accounts
  - Update settings
  - Manage users
```

### Data Protection
- All sensitive data encrypted at rest
- HTTPS enforced in production
- CORS configured for frontend domain
- Rate limiting on auth endpoints
- SQL injection prevention via Mongoose
- XSS protection via input validation

---

## Deployment Guide

### Prerequisites
- Node.js v14+
- MongoDB Atlas account
- Environment variables configured

### Backend Deployment (Railway)

1. **Create Railway Account**
   - Go to railway.app
   - Sign up with GitHub

2. **Connect Repository**
   - Connect your GitHub account
   - Select alliance-accounting-app repository

3. **Create Service**
   - Click "New Service"
   - Select "GitHub Repo"
   - Choose repository
   - Select "backend" directory as root

4. **Configure Environment Variables**
   ```
   PORT=5000
   MONGODB_URI=<your_mongodb_atlas_uri>
   JWT_SECRET=<your_secret_key>
   JWT_EXPIRE=7d
   NODE_ENV=production
   CORS_ORIGIN=<your_frontend_url>
   ```

5. **Deploy**
   - Railway auto-deploys on push
   - Get backend URL from Railway dashboard

### Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Go to vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Select GitHub repository
   - Choose "alliance-accounting-app"

3. **Configure**
   - Set root directory: "frontend"
   - Build command: "npm run build"
   - Output directory: "dist"

4. **Environment Variables**
   ```
   VITE_API_URL=<your_railway_backend_url>
   ```

5. **Deploy**
   - Vercel auto-deploys on push
   - Get frontend URL from Vercel dashboard

### Database Setup (MongoDB Atlas)

1. **Create Cluster**
   - Go to mongodb.com/cloud
   - Create free cluster
   - Choose region

2. **Create Database User**
   - Username: admin
   - Password: <strong_password>

3. **Get Connection String**
   - Copy connection string
   - Replace <username> and <password>
   - Use in MONGODB_URI

4. **Whitelist IP**
   - Add 0.0.0.0/0 for development
   - Restrict in production

---

## Testing Workflow

### Manual Testing

1. **Register & Login**
   - Create new user account
   - Login with credentials
   - Verify JWT token in cookies

2. **Create Chart of Accounts**
   - Create asset, liability, equity, income, expense accounts
   - Verify account codes are unique
   - Check opening balances

3. **Create Students**
   - Add individual students
   - Test bulk import
   - Verify fee tracking

4. **Create Receipt**
   - Create receipt for student
   - Verify journal entry created
   - Submit for approval
   - Director approves
   - Verify PDF generated

5. **Create Expense**
   - Create expense with attachment
   - Submit for approval
   - Director approves
   - Verify journal entry created

6. **Create Payroll**
   - Create payroll for employee
   - Verify salary calculation
   - Submit for approval
   - Director approves
   - Mark as paid

7. **Generate Reports**
   - Generate Income Statement
   - Generate Balance Sheet
   - Generate Cash Flow
   - Verify calculations

8. **Search Functionality**
   - Global search
   - Specific module search
   - Filter by date range
   - Filter by amount range

---

## Troubleshooting

### Common Issues

**1. JWT Token Expired**
- Solution: User needs to login again
- Token expires in 7 days

**2. Double-Entry Validation Failed**
- Solution: Ensure debits = credits
- Check all amounts are positive

**3. Account Balance Mismatch**
- Solution: Check journal entries
- Verify all transactions are approved

**4. PDF Generation Failed**
- Solution: Check file permissions
- Verify PDFKit is installed

**5. MongoDB Connection Error**
- Solution: Check connection string
- Verify IP whitelist in Atlas
- Check database user credentials

---

## Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review pending approvals
   - Check error logs
   - Verify backups

2. **Monthly**
   - Reconcile bank accounts
   - Review financial reports
   - Archive old data

3. **Quarterly**
   - Update dependencies
   - Security audit
   - Performance optimization

4. **Annually**
   - Financial year closing
   - Data archival
   - System upgrade

---

## Conclusion

The Alliance Accounting System provides a comprehensive solution for school financial management with:
- Secure authentication and role-based access
- Double-entry accounting with validation
- Automated approval workflows
- Comprehensive financial reporting
- Scalable architecture
- Professional deployment options

For questions or support, refer to the implementation guide or contact the development team.

---

**Last Updated**: 2026-03-08
**Version**: 1.0.0
**Status**: Production Ready
