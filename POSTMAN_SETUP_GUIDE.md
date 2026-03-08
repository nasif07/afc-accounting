# Postman API Testing Guide - Alliance Accounting System

## Table of Contents
1. [Installation](#installation)
2. [Importing the Collection](#importing-the-collection)
3. [Setting Up Environment Variables](#setting-up-environment-variables)
4. [Authentication Flow](#authentication-flow)
5. [Testing Each Module](#testing-each-module)
6. [Common Testing Scenarios](#common-testing-scenarios)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### Step 1: Download Postman

1. Go to https://www.postman.com/downloads/
2. Download Postman for your operating system (Windows, Mac, or Linux)
3. Install Postman on your computer
4. Launch Postman

### Step 2: Create Postman Account (Optional but Recommended)

1. Click "Sign Up" in Postman
2. Create account with email
3. Verify email
4. Login to Postman
5. Benefits: Cloud sync, team collaboration, history backup

---

## Importing the Collection

### Method 1: Import JSON File

1. **Open Postman**
2. Click **Import** button (top left)
3. Click **Upload Files**
4. Select `POSTMAN_COLLECTION.json` from your project folder
5. Click **Import**
6. Collection will appear in left sidebar under "Collections"

### Method 2: Import from Link

1. Click **Import** button
2. Click **Link** tab
3. Paste collection URL (if hosted)
4. Click **Continue**
5. Click **Import**

### Verify Import

After importing, you should see:
- **Alliance Accounting System - API Collection** in Collections
- Expandable folders for each module:
  - Authentication
  - Chart of Accounts
  - Students
  - Receipts
  - Expenses
  - Vendors
  - Employees
  - Payroll
  - Journal Entries
  - Bank
  - Reports
  - Search
  - Settings

---

## Setting Up Environment Variables

### Step 1: Create Environment

1. Click **Environments** (left sidebar)
2. Click **+** button to create new environment
3. Name it: `Alliance Accounting - Local`
4. Click **Create**

### Step 2: Add Variables

In the environment, add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| BASE_URL | http://localhost:5000 | http://localhost:5000 |
| TOKEN | (empty) | (empty) |
| ACCOUNT_ID | (empty) | (empty) |
| STUDENT_ID | (empty) | (empty) |
| RECEIPT_ID | (empty) | (empty) |
| EXPENSE_ID | (empty) | (empty) |
| VENDOR_ID | (empty) | (empty) |
| EMPLOYEE_ID | (empty) | (empty) |
| PAYROLL_ID | (empty) | (empty) |
| ENTRY_ID | (empty) | (empty) |
| BANK_ID | (empty) | (empty) |
| BANK_ACCOUNT_ID | (empty) | (empty) |
| EQUITY_ACCOUNT_ID | (empty) | (empty) |

### Step 3: Select Environment

1. Top right corner, click environment dropdown
2. Select **Alliance Accounting - Local**
3. Now all requests will use these variables

### Step 4: Update BASE_URL (if needed)

If your backend is running on different port:
1. Click environment name
2. Update BASE_URL value
3. Click **Save**

Example:
- Local development: `http://localhost:5000`
- Railway deployment: `https://your-railway-url.railway.app`
- Vercel: `https://your-vercel-url.vercel.app`

---

## Authentication Flow

### Step 1: Register New User

1. Expand **Authentication** folder
2. Click **Register User**
3. In the **Body** tab, modify:
   ```json
   {
     "name": "Your Name",
     "email": "your-email@example.com",
     "password": "password123",
     "confirmPassword": "password123"
   }
   ```
4. Click **Send**
5. You'll get response with user details

### Step 2: Login

1. Click **Login** request
2. In the **Body** tab, enter:
   ```json
   {
     "email": "your-email@example.com",
     "password": "password123"
   }
   ```
3. Click **Send**
4. Response will contain JWT token

### Step 3: Copy Token to Environment

1. In response, find the **token** value
2. Copy the token (long string)
3. Click **Environments** → **Alliance Accounting - Local**
4. Find **TOKEN** variable
5. Paste token in **Current Value**
6. Click **Save**

### Step 4: Verify Authentication

1. Click **Get Current User** request
2. Click **Send**
3. If token is valid, you'll see your user details
4. If token is invalid, you'll get 401 error

---

## Testing Each Module

### Module 1: Chart of Accounts

**Test Sequence:**

1. **Create Account**
   - Click "Create Account" request
   - Modify body with your data
   - Click Send
   - Copy account ID from response
   - Paste in TOKEN variable as ACCOUNT_ID

2. **Get All Accounts**
   - Click "Get All Accounts"
   - Click Send
   - View list of all accounts

3. **Get Single Account**
   - Click "Get Single Account"
   - Click Send
   - View details of specific account

4. **Update Account**
   - Click "Update Account"
   - Modify body
   - Click Send
   - Verify changes

5. **Get Account Balance**
   - Click "Get Account Balance"
   - Click Send
   - View current balance

6. **Delete Account** (Optional)
   - Click "Delete Account"
   - Click Send
   - Account will be deleted

---

### Module 2: Students

**Test Sequence:**

1. **Create Student**
   - Click "Create Student"
   - Modify body with student data
   - Click Send
   - Copy student ID from response
   - Paste in environment as STUDENT_ID

2. **Get All Students**
   - Click "Get All Students"
   - Click Send
   - View all students

3. **Get Single Student**
   - Click "Get Single Student"
   - Click Send
   - View student details

4. **Update Student**
   - Click "Update Student"
   - Modify body
   - Click Send

5. **Delete Student** (Optional)
   - Click "Delete Student"
   - Click Send

---

### Module 3: Receipts (Fee Collection)

**Test Sequence:**

1. **Create Receipt**
   - Click "Create Receipt"
   - In body, use your STUDENT_ID
   - Modify fee type and amount
   - Click Send
   - Copy receipt ID from response
   - Paste in environment as RECEIPT_ID

2. **Get All Receipts**
   - Click "Get All Receipts"
   - Click Send
   - View all receipts

3. **Get Single Receipt**
   - Click "Get Single Receipt"
   - Click Send
   - View receipt details

4. **Approve Receipt** (Director only)
   - Click "Approve Receipt"
   - Click Send
   - Receipt status changes to "Approved"

5. **Reject Receipt** (Director only)
   - Create another receipt first
   - Click "Reject Receipt"
   - In body, add rejection reason
   - Click Send
   - Receipt status changes to "Rejected"

---

### Module 4: Expenses

**Test Sequence:**

1. **Create Expense**
   - Click "Create Expense"
   - Modify body with expense data
   - Click Send
   - Copy expense ID from response
   - Paste in environment as EXPENSE_ID

2. **Get All Expenses**
   - Click "Get All Expenses"
   - Click Send

3. **Get Single Expense**
   - Click "Get Single Expense"
   - Click Send

4. **Approve Expense** (Director only)
   - Click "Approve Expense"
   - Click Send

5. **Reject Expense** (Director only)
   - Click "Reject Expense"
   - Add rejection reason
   - Click Send

---

### Module 5: Vendors

**Test Sequence:**

1. **Create Vendor**
   - Click "Create Vendor"
   - Modify body
   - Click Send
   - Copy vendor ID
   - Paste as VENDOR_ID

2. **Get All Vendors**
   - Click "Get All Vendors"
   - Click Send

3. **Get Single Vendor**
   - Click "Get Single Vendor"
   - Click Send

4. **Update Vendor**
   - Click "Update Vendor"
   - Modify body
   - Click Send

---

### Module 6: Employees

**Test Sequence:**

1. **Create Employee**
   - Click "Create Employee"
   - Modify body
   - Click Send
   - Copy employee ID
   - Paste as EMPLOYEE_ID

2. **Get All Employees**
   - Click "Get All Employees"
   - Click Send

3. **Get Single Employee**
   - Click "Get Single Employee"
   - Click Send

4. **Update Employee**
   - Click "Update Employee"
   - Modify body
   - Click Send

---

### Module 7: Payroll

**Test Sequence:**

1. **Create Payroll**
   - Click "Create Payroll"
   - Use your EMPLOYEE_ID
   - Modify salary details
   - Click Send
   - Copy payroll ID
   - Paste as PAYROLL_ID

2. **Get All Payroll**
   - Click "Get All Payroll"
   - Click Send

3. **Get Single Payroll**
   - Click "Get Single Payroll"
   - Click Send

4. **Approve Payroll** (Director only)
   - Click "Approve Payroll"
   - Click Send

5. **Mark Payroll as Paid** (Director only)
   - Click "Mark Payroll as Paid"
   - Modify payment details
   - Click Send

---

### Module 8: Journal Entries

**Test Sequence:**

1. **Create Journal Entry**
   - Click "Create Journal Entry"
   - Use your BANK_ACCOUNT_ID and EQUITY_ACCOUNT_ID
   - Ensure debits = credits
   - Click Send
   - Copy entry ID
   - Paste as ENTRY_ID

2. **Get All Journal Entries**
   - Click "Get All Journal Entries"
   - Click Send

3. **Get Single Journal Entry**
   - Click "Get Single Journal Entry"
   - Click Send

4. **Approve Journal Entry** (Director only)
   - Click "Approve Journal Entry"
   - Click Send

---

### Module 9: Bank

**Test Sequence:**

1. **Create Bank Account**
   - Click "Create Bank Account"
   - Modify body with bank details
   - Click Send
   - Copy bank ID
   - Paste as BANK_ID

2. **Get All Bank Accounts**
   - Click "Get All Bank Accounts"
   - Click Send

3. **Get Single Bank Account**
   - Click "Get Single Bank Account"
   - Click Send

4. **Reconcile Bank Account** (Director only)
   - Click "Reconcile Bank Account"
   - Modify reconciled balance
   - Click Send

---

### Module 10: Reports

**Test Sequence:**

1. **Income Statement**
   - Click "Income Statement"
   - Modify date range in URL
   - Click Send
   - View revenue and expenses

2. **Balance Sheet**
   - Click "Balance Sheet"
   - Modify date in URL
   - Click Send
   - View assets, liabilities, equity

3. **Cash Flow Statement**
   - Click "Cash Flow Statement"
   - Modify date range
   - Click Send

4. **Receipt & Payment Summary**
   - Click "Receipt & Payment Summary"
   - Modify date range
   - Click Send

5. **Trial Balance**
   - Click "Trial Balance"
   - Modify date
   - Click Send
   - Verify debits = credits

---

### Module 11: Search

**Test Sequence:**

1. **Global Search**
   - Click "Global Search"
   - Modify search query (e.g., "john")
   - Click Send
   - View results across all modules

2. **Search Receipts**
   - Click "Search Receipts"
   - Modify search query
   - Click Send

3. **Search Expenses**
   - Click "Search Expenses"
   - Modify search query
   - Click Send

4. **Search by Amount Range**
   - Click "Search by Amount Range"
   - Modify minAmount and maxAmount
   - Click Send

---

### Module 12: Settings

**Test Sequence:**

1. **Get Settings**
   - Click "Get Settings"
   - Click Send
   - View current settings

2. **Update Settings** (Director only)
   - Click "Update Settings"
   - Modify settings
   - Click Send

3. **Get Approval Limits** (Director only)
   - Click "Get Approval Limits"
   - Click Send

4. **Update Approval Limits** (Director only)
   - Click "Update Approval Limits"
   - Modify limits
   - Click Send

---

## Common Testing Scenarios

### Scenario 1: Complete Fee Collection Workflow

1. Create Student
2. Create Receipt for Student
3. (Director) Approve Receipt
4. Download Receipt PDF
5. View Student fee status updated

**Steps:**
1. Run "Create Student" → Copy STUDENT_ID
2. Run "Create Receipt" with STUDENT_ID
3. Login as Director
4. Run "Approve Receipt"
5. Verify student fee status

### Scenario 2: Complete Expense Workflow

1. Create Vendor
2. Create Expense with Vendor
3. (Director) Approve Expense
4. Verify Journal Entry created

**Steps:**
1. Run "Create Vendor" → Copy VENDOR_ID
2. Run "Create Expense" with VENDOR_ID
3. Login as Director
4. Run "Approve Expense"
5. Check journal entries

### Scenario 3: Complete Payroll Workflow

1. Create Employee
2. Create Payroll for Employee
3. (Director) Approve Payroll
4. (Director) Mark as Paid
5. Download Payslip

**Steps:**
1. Run "Create Employee" → Copy EMPLOYEE_ID
2. Run "Create Payroll" with EMPLOYEE_ID
3. Login as Director
4. Run "Approve Payroll"
5. Run "Mark Payroll as Paid"

### Scenario 4: Double-Entry Accounting

1. Create Bank Account
2. Create Chart of Accounts (Asset, Equity)
3. Create Journal Entry (Debit Bank, Credit Equity)
4. Verify Debits = Credits
5. (Director) Approve Entry

**Steps:**
1. Run "Create Bank Account" → Copy BANK_ID
2. Run "Create Account" (Equity) → Copy EQUITY_ACCOUNT_ID
3. Run "Create Journal Entry" with both IDs
4. Verify debits = credits in response
5. Login as Director
6. Run "Approve Journal Entry"

### Scenario 5: Financial Reporting

1. Create multiple receipts and expenses
2. Generate Income Statement
3. Generate Balance Sheet
4. Generate Cash Flow
5. Verify calculations

**Steps:**
1. Create several transactions
2. Run "Income Statement" report
3. Run "Balance Sheet" report
4. Run "Cash Flow Statement" report
5. Verify numbers make sense

---

## Troubleshooting

### Error: "401 Unauthorized"

**Problem:** Token is missing or invalid

**Solution:**
1. Check if TOKEN variable is set in environment
2. Login again to get new token
3. Copy token to environment
4. Retry request

### Error: "404 Not Found"

**Problem:** Resource ID is wrong

**Solution:**
1. Verify {{STUDENT_ID}}, {{ACCOUNT_ID}}, etc. are set correctly
2. Create the resource first
3. Copy correct ID from response
4. Paste in environment
5. Retry request

### Error: "400 Bad Request"

**Problem:** Request body is invalid

**Solution:**
1. Check JSON syntax in body
2. Verify all required fields are present
3. Check data types (string, number, boolean)
4. Use correct values for enums (e.g., "asset" not "Asset")

### Error: "500 Internal Server Error"

**Problem:** Server error

**Solution:**
1. Check backend server is running
2. Check MongoDB connection
3. Check environment variables on backend
4. View backend logs for details
5. Restart backend server

### Error: "Double-Entry Validation Failed"

**Problem:** Debits don't equal credits

**Solution:**
1. In journal entry body, verify:
   - Total debits = Total credits
   - All amounts are positive
   - isDebit is true/false correctly
2. Example:
   ```json
   "bookEntries": [
     {"account": "...", "isDebit": true, "amount": 10000},
     {"account": "...", "isDebit": false, "amount": 10000}
   ]
   ```

### Error: "Account Code Already Exists"

**Problem:** Account code is not unique

**Solution:**
1. Use different account code
2. Or delete existing account first
3. Or update existing account instead of creating new

### Error: "Cannot Approve - Insufficient Permissions"

**Problem:** Your role doesn't have permission

**Solution:**
1. Login as Director
2. Director can approve all transactions
3. Accountant cannot approve
4. Sub-Accountant cannot approve

---

## Tips & Best Practices

### 1. Use Environment Variables

Always use {{VARIABLE}} instead of hardcoding IDs:
```
✓ Good:  /api/students/{{STUDENT_ID}}
✗ Bad:   /api/students/507f1f77bcf86cd799439011
```

### 2. Copy IDs from Responses

After creating resource:
1. Look in response body for ID
2. Copy the ID value
3. Paste in environment variable
4. Use in subsequent requests

### 3. Organize Tests

Create a test sequence:
1. Authentication (Login)
2. Create resources (Students, Vendors, etc.)
3. Create transactions (Receipts, Expenses, etc.)
4. Approval (Director approves)
5. Reports (Generate reports)

### 4. Use Pre-request Scripts

Automate token extraction:
1. Click "Pre-request Script" tab
2. Add script to extract token automatically
3. Saves manual copying

### 5. Use Tests Tab

Verify responses:
1. Click "Tests" tab
2. Add assertions to verify response
3. Example:
   ```javascript
   pm.test("Status code is 200", function() {
     pm.response.to.have.status(200);
   });
   ```

### 6. Export Results

1. Click "..." menu on collection
2. Select "Export"
3. Save as JSON
4. Share with team

### 7. Use Collections for Team

1. Create workspace
2. Share collection with team
3. Everyone uses same requests
4. Consistent testing

---

## Next Steps

1. **Import Collection** - Follow steps above
2. **Set Up Environment** - Add BASE_URL and TOKEN
3. **Test Authentication** - Login and get token
4. **Test Each Module** - Follow module testing sequences
5. **Try Scenarios** - Test complete workflows
6. **Explore API** - Try different parameters
7. **Deploy** - Test against production URLs

---

## Support

If you encounter issues:

1. Check this guide first
2. Review error message carefully
3. Check backend logs
4. Verify environment variables
5. Try with fresh token
6. Restart backend server
7. Contact support with error details

---

**Happy Testing! 🚀**

For more details, refer to WORKFLOW_DOCUMENTATION.md and USER_MANUAL.md
