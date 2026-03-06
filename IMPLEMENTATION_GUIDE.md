# Alliance Accounting System - Implementation Guide

This guide provides the structure and patterns for implementing the remaining modules.

## Completed Modules

✅ **Auth** - Complete (Service, Controller, Routes)
✅ **Chart of Accounts** - Complete (Service, Controller, Routes)
✅ **Students** - Complete (Service, Controller, Routes)
✅ **Receipts (Fee Collection)** - Complete (Service, Controller, Routes)
✅ **Expenses** - Complete (Service, Controller, Routes)

## Remaining Modules to Implement

### 1. Vendors Module

**File Structure:**
```
src/modules/vendors/
├── vendor.model.js (✅ Created)
├── vendor.service.js
├── vendor.controller.js
└── vendor.routes.js
```

**Service Methods:**
- `createVendor(vendorData)` - Create new vendor
- `getAllVendors(filters)` - Get all vendors with filters
- `getVendorById(vendorId)` - Get single vendor
- `updateVendor(vendorId, updateData)` - Update vendor
- `deleteVendor(vendorId)` - Delete vendor
- `getVendorPayables(vendorId)` - Get outstanding amount
- `updateVendorBalance(vendorId, amount, isPaid)` - Update payable balance

**Controller Methods:**
- `createVendor` - POST /api/vendors
- `getAllVendors` - GET /api/vendors
- `getVendorById` - GET /api/vendors/:id
- `updateVendor` - PUT /api/vendors/:id
- `deleteVendor` - DELETE /api/vendors/:id
- `getVendorPayables` - GET /api/vendors/:id/payables

**Routes:**
- POST /api/vendors - Create (Accountant+)
- GET /api/vendors - List (All)
- GET /api/vendors/:id - Get (All)
- PUT /api/vendors/:id - Update (Accountant+)
- DELETE /api/vendors/:id - Delete (Accountant+)

---

### 2. Employees Module

**File Structure:**
```
src/modules/employees/
├── employee.model.js (✅ Created)
├── employee.service.js
├── employee.controller.js
└── employee.routes.js
```

**Service Methods:**
- `createEmployee(employeeData)` - Create employee
- `getAllEmployees(filters)` - Get all employees
- `getEmployeeById(employeeId)` - Get single employee
- `updateEmployee(employeeId, updateData)` - Update employee
- `deleteEmployee(employeeId)` - Delete employee
- `getEmployeesByDepartment(department)` - Get by department
- `getActiveEmployees()` - Get active employees only

**Controller Methods:**
- Standard CRUD operations
- Department-wise filtering
- Status management (active/inactive/on-leave/resigned)

**Routes:**
- POST /api/employees - Create (Accountant+)
- GET /api/employees - List (All)
- GET /api/employees/:id - Get (All)
- PUT /api/employees/:id - Update (Accountant+)
- DELETE /api/employees/:id - Delete (Accountant+)

---

### 3. Payroll Module

**File Structure:**
```
src/modules/payroll/
├── payroll.model.js (✅ Created)
├── payroll.service.js
├── payroll.controller.js
└── payroll.routes.js
```

**Service Methods:**
- `createPayroll(payrollData)` - Create payroll record
- `getAllPayroll(filters)` - Get all payroll records
- `getPayrollById(payrollId)` - Get single payroll
- `updatePayroll(payrollId, updateData)` - Update payroll
- `deletePayroll(payrollId)` - Delete payroll
- `calculateNetSalary(payrollData)` - Calculate net salary
- `approvePayroll(payrollId, approvedBy)` - Approve payroll
- `rejectPayroll(payrollId, approvedBy, reason)` - Reject payroll
- `generatePayslip(payrollId)` - Generate PDF payslip
- `getPayrollByMonth(month, year)` - Get payroll for specific month

**Salary Calculation Logic:**
```
Total Earnings = Base Salary + Allowances + Bonus
Total Deductions = Deductions + Leave Deduction
Net Salary = Total Earnings - Total Deductions
```

**Routes:**
- POST /api/payroll - Create (Accountant+)
- GET /api/payroll - List (All)
- GET /api/payroll/:id - Get (All)
- PUT /api/payroll/:id - Update (Accountant+)
- PUT /api/payroll/:id/approve - Approve (Director)
- PUT /api/payroll/:id/reject - Reject (Director)
- GET /api/payroll/:id/payslip - Download payslip (All)

---

### 4. Accounting (Journal Entries) Module

**File Structure:**
```
src/modules/accounting/
├── accounting.model.js (✅ Created)
├── accounting.service.js
├── accounting.controller.js
└── accounting.routes.js
```

**Service Methods:**
- `createJournalEntry(entryData)` - Create journal entry
- `validateDoubleEntry(bookEntries)` - Validate debit = credit
- `getAllEntries(filters)` - Get all entries
- `getEntryById(entryId)` - Get single entry
- `updateEntry(entryId, updateData)` - Update entry
- `deleteEntry(entryId)` - Delete entry
- `approveEntry(entryId, approvedBy)` - Approve entry
- `rejectEntry(entryId, approvedBy, reason)` - Reject entry
- `getEntriesByDateRange(from, to)` - Get entries in date range

**Double-Entry Validation:**
```
Sum of Debits = Sum of Credits
If not balanced, reject the entry
```

**Routes:**
- POST /api/accounting/journal-entries - Create (Accountant+)
- GET /api/accounting/journal-entries - List (All)
- GET /api/accounting/journal-entries/:id - Get (All)
- PUT /api/accounting/journal-entries/:id - Update (Accountant+)
- PUT /api/accounting/journal-entries/:id/approve - Approve (Director)
- PUT /api/accounting/journal-entries/:id/reject - Reject (Director)

---

### 5. Bank Module

**File Structure:**
```
src/modules/bank/
├── bank.model.js (✅ Created)
├── bank.service.js
├── bank.controller.js
└── bank.routes.js
```

**Service Methods:**
- `createBankAccount(bankData)` - Create bank account
- `getAllBankAccounts()` - Get all accounts
- `getBankAccountById(bankId)` - Get single account
- `updateBankAccount(bankId, updateData)` - Update account
- `deleteBankAccount(bankId)` - Delete account
- `getTotalBankBalance()` - Get total balance across all accounts
- `updateAccountBalance(bankId, amount, isDebit)` - Update balance

**Routes:**
- POST /api/bank - Create (Director)
- GET /api/bank - List (All)
- GET /api/bank/:id - Get (All)
- PUT /api/bank/:id - Update (Director)
- DELETE /api/bank/:id - Delete (Director)
- GET /api/bank/report/total-balance - Get total balance

---

### 6. Reports Module

**File Structure:**
```
src/modules/reports/
├── report.service.js
├── report.controller.js
└── report.routes.js
```

**Report Types:**
1. **Income Statement (P&L)**
   - Revenue (Total Fee Collection)
   - Expenses (Total Expenses by Category)
   - Net Income = Revenue - Expenses

2. **Balance Sheet**
   - Assets (Bank Balance + Receivables)
   - Liabilities (Payables)
   - Equity (Opening Balance)

3. **Cash Flow Statement**
   - Opening Cash
   - Cash Inflows (Receipts)
   - Cash Outflows (Expenses, Payroll)
   - Closing Cash

4. **Receipt & Payment Summary**
   - Total Receipts by Fee Type
   - Total Payments by Category

5. **Head-wise Income Report**
   - Income by Fee Type
   - Comparison with previous periods

**Service Methods:**
- `getIncomeStatement(dateFrom, dateTo)` - Generate P&L
- `getBalanceSheet(asOfDate)` - Generate Balance Sheet
- `getCashFlowStatement(dateFrom, dateTo)` - Generate Cash Flow
- `getReceiptPaymentSummary(dateFrom, dateTo)` - Generate R&P Summary
- `getHeadwiseIncomeReport(dateFrom, dateTo)` - Generate Income Report
- `exportReportToPDF(reportData, reportType)` - Export to PDF
- `exportReportToExcel(reportData, reportType)` - Export to Excel

**Routes:**
- GET /api/reports/income-statement - Get P&L (All)
- GET /api/reports/balance-sheet - Get Balance Sheet (All)
- GET /api/reports/cash-flow - Get Cash Flow (All)
- GET /api/reports/receipt-payment - Get R&P Summary (All)
- GET /api/reports/headwise-income - Get Income Report (All)
- GET /api/reports/:id/export/pdf - Export to PDF (All)
- GET /api/reports/:id/export/excel - Export to Excel (All)

---

### 7. Settings Module

**File Structure:**
```
src/modules/settings/
├── settings.model.js (✅ Created)
├── settings.service.js
├── settings.controller.js
└── settings.routes.js
```

**Service Methods:**
- `getSettings()` - Get system settings
- `updateSettings(updateData)` - Update settings
- `getFinancialYearSettings()` - Get FY configuration
- `getApprovalLimits()` - Get approval limits by role
- `getVoucherNumberingFormat()` - Get numbering format

**Routes:**
- GET /api/settings - Get settings (All)
- PUT /api/settings - Update settings (Director)
- GET /api/settings/approval-limits - Get approval limits (All)

---

### 8. Search Module

**File Structure:**
```
src/modules/search/
├── search.service.js
├── search.controller.js
└── search.routes.js
```

**Service Methods:**
- `globalSearch(query, filters)` - Search across all modules
- `searchReceipts(query, filters)` - Search receipts
- `searchExpenses(query, filters)` - Search expenses
- `searchJournalEntries(query, filters)` - Search journal entries
- `searchStudents(query, filters)` - Search students
- `searchVendors(query, filters)` - Search vendors
- `searchEmployees(query, filters)` - Search employees

**Search Filters:**
- Date range
- Amount range
- Status
- Type/Category
- User

**Routes:**
- GET /api/search - Global search (All)
- GET /api/search/receipts - Search receipts (All)
- GET /api/search/expenses - Search expenses (All)
- GET /api/search/journal-entries - Search entries (All)

---

## Implementation Pattern

Each module follows this pattern:

### Service (business logic)
```javascript
class ModuleService {
  static async create(data) { }
  static async getAll(filters) { }
  static async getById(id) { }
  static async update(id, data) { }
  static async delete(id) { }
}
```

### Controller (request handling)
```javascript
class ModuleController {
  static async create(req, res, next) {
    try {
      // Validate input
      // Call service
      // Return response
    } catch (error) {
      next(error);
    }
  }
  // ... other methods
}
```

### Routes (endpoint definition)
```javascript
router.post('/', auth, roleCheck, Controller.create);
router.get('/', auth, Controller.getAll);
router.get('/:id', auth, Controller.getById);
router.put('/:id', auth, roleCheck, Controller.update);
router.delete('/:id', auth, roleCheck, Controller.delete);
```

---

## Registering Routes in Main App

Update `src/routes/index.js`:

```javascript
const authRoutes = require('../modules/auth/auth.routes');
const coaRoutes = require('../modules/chartOfAccounts/coa.routes');
const studentRoutes = require('../modules/students/student.routes');
const receiptRoutes = require('../modules/receipts/receipt.routes');
const expenseRoutes = require('../modules/expenses/expense.routes');
const vendorRoutes = require('../modules/vendors/vendor.routes');
const employeeRoutes = require('../modules/employees/employee.routes');
const payrollRoutes = require('../modules/payroll/payroll.routes');
const accountingRoutes = require('../modules/accounting/accounting.routes');
const bankRoutes = require('../modules/bank/bank.routes');
const reportRoutes = require('../modules/reports/report.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const searchRoutes = require('../modules/search/search.routes');

router.use('/auth', authRoutes);
router.use('/chart-of-accounts', coaRoutes);
router.use('/students', studentRoutes);
router.use('/receipts', receiptRoutes);
router.use('/expenses', expenseRoutes);
router.use('/vendors', vendorRoutes);
router.use('/employees', employeeRoutes);
router.use('/payroll', payrollRoutes);
router.use('/accounting', accountingRoutes);
router.use('/bank', bankRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);
```

---

## Testing

Use Postman or Thunder Client to test each endpoint:

1. Register user
2. Login and get token
3. Test CRUD operations with proper authorization
4. Test approval workflows
5. Test reports generation
6. Test search functionality

---

## Next Steps

1. Implement remaining modules following this guide
2. Test all endpoints
3. Deploy backend to Railway
4. Deploy frontend to Vercel
5. Configure production environment variables
