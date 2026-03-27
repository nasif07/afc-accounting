# Alliance Accounting System - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [User Roles & Access](#user-roles--access)
3. [Dashboard Overview](#dashboard-overview)
4. [Module Guides](#module-guides)
5. [Approval Workflows](#approval-workflows)
6. [Financial Reports](#financial-reports)
7. [Settings & Configuration](#settings--configuration)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- JavaScript enabled

### Accessing the System

1. **Open the Application**
   - Go to your deployed frontend URL (e.g., https://alliance-accounting.vercel.app)
   - You'll see the login page

2. **Login**
   - Enter your email address
   - Enter your password
   - Click "Login"
   - You'll be redirected to the Dashboard

3. **First Time Setup**
   - If you don't have an account, ask your Director to create one
   - Director can register new users and assign roles

### Default Test Credentials
```
Email: admin@alliance.com
Password: password123
Role: Director
```

---

## User Roles & Access

### Three User Roles

#### 1. **Director**
**Full System Access**
- Create and manage all data
- Approve/Reject all transactions
- Manage user accounts
- Configure system settings
- View all reports
- Manage bank accounts
- Set approval limits

**Dashboard Access:**
- View all pending approvals
- View financial summaries
- Access all modules

**Typical Users:**
- School Principal
- Finance Director
- Head of Finance

---

#### 2. **Accountant**
**Create & Manage Data**
- Create students, vendors, employees
- Record receipts and expenses
- Create journal entries
- Create payroll records
- View reports
- Cannot approve transactions
- Cannot change system settings

**Dashboard Access:**
- View created transactions
- View pending approvals
- View financial summaries

**Typical Users:**
- Accountant
- Finance Officer
- Data Entry Operator

---

#### 3. **Sub-Accountant**
**View & Limited Data Entry**
- View all data
- Create receipts only
- Cannot create expenses or payroll
- Cannot approve anything
- Cannot change settings

**Dashboard Access:**
- View dashboard metrics
- View own created receipts

**Typical Users:**
- Junior Accountant
- Data Entry Clerk
- Office Assistant

---

## Dashboard Overview

### Main Dashboard Components

#### 1. **Key Metrics Cards**
Located at the top of the dashboard:

- **Total Bank Balance**
  - Shows combined balance of all bank accounts
  - Updated in real-time
  - Click to view bank details

- **Today's Receipts**
  - Total amount received today
  - Number of receipts
  - Click to view today's receipts

- **Today's Expenses**
  - Total amount spent today
  - Number of expenses
  - Click to view today's expenses

- **Pending Approvals**
  - Number of items waiting for approval
  - Shows count by type (Receipts, Expenses, Payroll)
  - Click to view pending items

#### 2. **Recent Transactions**
Shows last 10 transactions:
- Transaction type (Receipt, Expense, Payroll)
- Amount
- Date
- Status (Pending, Approved, Rejected)
- Click to view details

#### 3. **Quick Action Buttons**
Fast access to common tasks:
- **+ New Receipt** - Create new fee collection
- **+ New Expense** - Record new expense
- **+ New Payroll** - Create payroll
- **+ New Student** - Add student
- **View Reports** - Access financial reports

#### 4. **Sidebar Navigation**
Left sidebar with menu items:
- Dashboard
- Chart of Accounts
- Journal Entries
- Students
- Receipts
- Expenses
- Vendors
- Employees
- Payroll
- Reports
- Settings
- Logout

---

## Module Guides

### Module 1: Chart of Accounts

**Purpose:** Master list of all accounts used in accounting

#### How to Create an Account

1. Click **Chart of Accounts** in sidebar
2. Click **+ New Account** button
3. Fill in the form:
   - **Account Code** (e.g., 1001) - Must be unique
   - **Account Name** (e.g., Bank Account)
   - **Account Type** - Select from dropdown:
     - Asset (Bank, Cash, Receivables)
     - Liability (Payables, Loans)
     - Equity (Capital, Opening Balance)
     - Income (Tuition Fees, Exam Fees)
     - Expense (Salary, Utilities)
   - **Opening Balance** - Initial balance
   - **Parent Account** (Optional) - For hierarchical structure
4. Click **Save**

#### How to View Account Balance

1. Click **Chart of Accounts**
2. Find the account in the list
3. **Current Balance** column shows:
   - For Asset/Expense accounts: Debit balance
   - For Liability/Income accounts: Credit balance
4. Click account name to view transaction history

#### How to Edit an Account

1. Click **Chart of Accounts**
2. Find the account
3. Click **Edit** button
4. Modify details (except Account Code)
5. Click **Save**

#### How to Delete an Account

1. Click **Chart of Accounts**
2. Find the account
3. Click **Delete** button
4. Confirm deletion
5. **Note:** Cannot delete if account has transactions

---

### Module 2: Students

**Purpose:** Manage student profiles and track fees

#### How to Add a Student

1. Click **Students** in sidebar
2. Click **+ New Student** button
3. Fill in the form:
   - **Roll Number** (Unique identifier)
   - **Full Name**
   - **Class** (e.g., 10A, 12B)
   - **Section** (Optional)
   - **Date of Birth**
   - **Email** (Optional)
   - **Phone** (Optional)
   - **Parent Name**
   - **Parent Email**
   - **Parent Phone**
   - **Address**
   - **Total Fees Payable** (Annual amount)
4. Click **Save**

#### How to View Student Details

1. Click **Students**
2. Click on student name
3. View:
   - Student information
   - Total fees payable
   - Total fees paid
   - Pending amount
   - Fee payment history
   - Receipts issued

#### How to Bulk Import Students

1. Click **Students**
2. Click **Bulk Import** button
3. Download the CSV template
4. Fill in the template with student data:
   ```
   Roll Number, Full Name, Class, Parent Name, Total Fees Payable
   001, John Doe, 10A, Mr. Doe, 50000
   002, Jane Smith, 10A, Mr. Smith, 50000
   ```
5. Upload the CSV file
6. System validates data
7. Click **Import** to add all students
8. View import report with success/error count

#### How to Edit Student

1. Click **Students**
2. Click on student name
3. Click **Edit** button
4. Modify details
5. Click **Save**

#### How to Change Student Status

1. Click **Students**
2. Click on student name
3. Click **Status** dropdown
4. Select:
   - Active (Can collect fees)
   - Inactive (No fees collected)
   - Suspended (Temporary suspension)
5. Click **Save**

---

### Module 3: Fee Collection (Receipts)

**Purpose:** Record student fee payments

#### How to Create a Receipt

1. Click **Receipts** in sidebar
2. Click **+ New Receipt** button
3. Fill in the form:
   - **Student** - Select from dropdown
   - **Fee Type** - Select:
     - Tuition
     - Exam
     - Registration
     - Activity
     - Transport
     - Miscellaneous
   - **Amount** - Fee amount
   - **Payment Mode** - Select:
     - Bank Transfer
     - Cheque
     - Card
     - Cash
   - **Reference Number** - Cheque no., transaction ID, etc.
   - **Description** (Optional)
4. Click **Submit for Approval**
5. Receipt status becomes "Pending"

#### How to View Receipt

1. Click **Receipts**
2. Click on receipt number
3. View:
   - Receipt details
   - Student information
   - Amount and payment mode
   - Status
   - If approved: PDF receipt

#### How to Download Receipt PDF

1. Click **Receipts**
2. Click on receipt number
3. If status is "Approved":
   - Click **Download PDF** button
   - PDF receipt will download
   - Contains school details, student info, amount, date

#### How to Search Receipts

1. Click **Receipts**
2. Use search bar at top:
   - Search by receipt number
   - Search by student name
   - Search by amount
3. Use filters:
   - **Date Range** - Select start and end date
   - **Status** - Pending, Approved, Rejected
   - **Fee Type** - Tuition, Exam, etc.
4. Click **Search** button

#### Receipt Status Meanings

- **Pending** - Waiting for Director approval
- **Approved** - Director approved, PDF generated
- **Rejected** - Director rejected, reason provided

---

### Module 4: Expenses

**Purpose:** Record and track school expenses

#### How to Create an Expense

1. Click **Expenses** in sidebar
2. Click **+ New Expense** button
3. Fill in the form:
   - **Expense Number** (Auto-generated)
   - **Category** - Select:
     - Salary
     - Utilities
     - Supplies
     - Maintenance
     - Petty Cash
     - Other
   - **Vendor** (Optional) - Select existing vendor
   - **Description** - What was purchased
   - **Amount** - Expense amount
   - **Payment Mode** - Bank, Cheque, Card, Cash
   - **Reference Number** - Transaction/Cheque number
   - **Attachments** - Upload bill/invoice (optional)
4. Click **Submit for Approval**

#### How to Upload Attachments

1. In expense form, click **Choose File**
2. Select bill or invoice image/PDF
3. File will be attached
4. You can attach multiple files
5. Maximum file size: 5MB per file

#### How to View Expense

1. Click **Expenses**
2. Click on expense number
3. View:
   - Expense details
   - Vendor information
   - Amount and payment mode
   - Attached documents
   - Status

#### How to Download Expense Attachment

1. Click **Expenses**
2. Click on expense number
3. In attachments section, click **Download**
4. File will download

#### How to Search Expenses

1. Click **Expenses**
2. Use search bar:
   - Search by expense number
   - Search by vendor name
   - Search by description
3. Use filters:
   - **Date Range**
   - **Category**
   - **Status**
   - **Amount Range**

#### How to Edit Expense (Before Approval)

1. Click **Expenses**
2. Click on expense number
3. If status is "Pending":
   - Click **Edit** button
   - Modify details
   - Click **Save**
4. If status is "Approved" or "Rejected":
   - Cannot edit
   - Contact Director if changes needed

---

### Module 5: Vendors

**Purpose:** Manage vendor/supplier information

#### How to Create a Vendor

1. Click **Vendors** in sidebar
2. Click **+ New Vendor** button
3. Fill in the form:
   - **Vendor Code** (Unique identifier)
   - **Vendor Name**
   - **Vendor Type** - Supplier, Service Provider, etc.
   - **Contact Person**
   - **Email**
   - **Phone**
   - **Address**
   - **Bank Account** (Optional)
   - **IFSC Code** (Optional)
   - **Tax ID** (Optional)
4. Click **Save**

#### How to View Vendor Details

1. Click **Vendors**
2. Click on vendor name
3. View:
   - Vendor information
   - Total payable amount
   - Total paid amount
   - Outstanding balance
   - Expense history with this vendor

#### How to View Vendor Payables

1. Click **Vendors**
2. Click on vendor name
3. Scroll to **Payables** section
4. View all unpaid expenses with this vendor
5. Total outstanding amount shown at bottom

#### How to Edit Vendor

1. Click **Vendors**
2. Click on vendor name
3. Click **Edit** button
4. Modify details
5. Click **Save**

---

### Module 6: Employees

**Purpose:** Manage employee records

#### How to Add an Employee

1. Click **Employees** in sidebar
2. Click **+ New Employee** button
3. Fill in the form:
   - **Employee Code** (Unique)
   - **Full Name**
   - **Designation** (e.g., Teacher, Principal)
   - **Department** (e.g., Science, English)
   - **Date of Joining**
   - **Email**
   - **Phone**
   - **Address**
   - **Bank Account** (For salary transfer)
   - **IFSC Code**
4. Click **Save**

#### How to View Employee Details

1. Click **Employees**
2. Click on employee name
3. View:
   - Employee information
   - Payroll history
   - Total salary paid
   - Leave records

#### How to Update Employee Status

1. Click **Employees**
2. Click on employee name
3. Click **Status** dropdown
4. Select:
   - Active (Receiving salary)
   - Inactive (No salary)
   - On Leave
   - Resigned
5. Click **Save**

#### How to Edit Employee

1. Click **Employees**
2. Click on employee name
3. Click **Edit** button
4. Modify details
5. Click **Save**

---

### Module 7: Payroll

**Purpose:** Process employee salaries

#### How to Create Payroll

1. Click **Payroll** in sidebar
2. Click **+ New Payroll** button
3. Fill in the form:
   - **Employee** - Select from dropdown
   - **Month** - Select month (1-12)
   - **Year** - Select year
   - **Base Salary** - Monthly salary
   - **Allowances** - HRA, DA, etc. (Optional)
   - **Bonus** - Performance bonus (Optional)
   - **Deductions** - PF, Tax, etc. (Optional)
   - **Leave Deduction** - If employee took unpaid leave
   - **Description** (Optional)

4. System automatically calculates:
   - **Total Earnings** = Base + Allowances + Bonus
   - **Total Deductions** = Deductions + Leave Deduction
   - **Net Salary** = Total Earnings - Total Deductions

5. Review calculations
6. Click **Submit for Approval**

#### How to View Payroll

1. Click **Payroll**
2. Click on payroll record
3. View:
   - Employee information
   - Salary components
   - Calculations
   - Status
   - If approved: Payslip PDF

#### How to Download Payslip

1. Click **Payroll**
2. Click on payroll record
3. If status is "Approved":
   - Click **Download Payslip** button
   - PDF payslip will download
   - Contains employee info, salary breakdown, net amount

#### How to Mark Payroll as Paid

1. Click **Payroll**
2. Click on payroll record
3. If status is "Approved":
   - Click **Mark as Paid** button
   - Enter payment details:
     - Payment Date
     - Payment Mode (Bank, Cheque, Cash)
     - Reference Number
   - Click **Confirm**
4. Status changes to "Paid"

#### How to Search Payroll

1. Click **Payroll**
2. Use search bar:
   - Search by employee name
   - Search by payroll number
3. Use filters:
   - **Month/Year**
   - **Status**
   - **Payment Status** (Paid/Unpaid)

#### How to Edit Payroll (Before Approval)

1. Click **Payroll**
2. Click on payroll record
3. If status is "Pending":
   - Click **Edit** button
   - Modify salary components
   - Click **Save**
4. If status is "Approved" or "Rejected":
   - Cannot edit
   - Contact Director if changes needed

---

### Module 8: Journal Entries

**Purpose:** Record accounting transactions with double-entry system

#### How to Create Journal Entry

1. Click **Journal Entries** in sidebar
2. Click **+ New Entry** button
3. Fill in the form:
   - **Reference Number** (Auto-generated)
   - **Transaction Type** - Select:
     - General (Manual entry)
     - Fee (Receipt)
     - Expense (Payment)
     - Payroll (Salary)
     - Transfer (Internal transfer)
   - **Description** - What is this transaction
   - **Date** - Transaction date

4. **Add Book Entries:**
   - Click **+ Add Line**
   - For each line:
     - **Account** - Select account to debit/credit
     - **Is Debit?** - Check if debit, uncheck if credit
     - **Amount** - Transaction amount
   - Add minimum 2 lines (1 debit, 1 credit)
   - System shows: Total Debits and Total Credits

5. **Validation:**
   - System checks: Total Debits = Total Credits
   - If not balanced: Shows error message
   - If balanced: Green checkmark shown

6. Click **Submit for Approval**

#### Example: Receipt of ৳10,000 Tuition Fee

```
Line 1: Bank Account (Debit) ৳10,000
Line 2: Tuition Income (Credit) ৳10,000

Total Debits: ৳10,000
Total Credits: ৳10,000
✓ Balanced
```

#### How to View Journal Entry

1. Click **Journal Entries**
2. Click on reference number
3. View:
   - Entry details
   - All book entries (debits and credits)
   - Status
   - Created by and approval details

#### How to Search Journal Entries

1. Click **Journal Entries**
2. Use search bar:
   - Search by reference number
   - Search by description
3. Use filters:
   - **Date Range**
   - **Transaction Type**
   - **Status**

#### How to Edit Journal Entry (Before Approval)

1. Click **Journal Entries**
2. Click on reference number
3. If status is "Pending":
   - Click **Edit** button
   - Modify entries
   - Ensure debits = credits
   - Click **Save**
4. If status is "Approved" or "Rejected":
   - Cannot edit
   - Contact Director if changes needed

---

### Module 9: Reports

**Purpose:** Generate financial statements

#### How to Generate Income Statement (P&L)

1. Click **Reports** in sidebar
2. Click **Income Statement** tab
3. Select:
   - **From Date** - Start of period
   - **To Date** - End of period
4. Click **Generate Report**
5. View:
   - Total Revenue (by fee type)
   - Total Expenses (by category)
   - Net Income = Revenue - Expenses
6. Click **Download PDF** or **Download Excel**

#### How to Generate Balance Sheet

1. Click **Reports**
2. Click **Balance Sheet** tab
3. Select date (as of which date)
4. Click **Generate Report**
5. View:
   - **Assets** - What school owns
   - **Liabilities** - What school owes
   - **Equity** - School's net worth
6. Verify: Assets = Liabilities + Equity
7. Click **Download PDF** or **Download Excel**

#### How to Generate Cash Flow Statement

1. Click **Reports**
2. Click **Cash Flow** tab
3. Select:
   - **From Date**
   - **To Date**
4. Click **Generate Report**
5. View:
   - Opening Cash Balance
   - Cash Inflows (Receipts)
   - Cash Outflows (Expenses)
   - Closing Cash Balance
6. Click **Download PDF** or **Download Excel**

#### How to Generate Receipt & Payment Summary

1. Click **Reports**
2. Click **Receipt & Payment** tab
3. Select:
   - **From Date**
   - **To Date**
4. Click **Generate Report**
5. View:
   - Total Receipts by fee type
   - Total Payments by category
   - Summary statistics
6. Click **Download PDF** or **Download Excel**

#### How to Generate Head-wise Income Report

1. Click **Reports**
2. Click **Head-wise Income** tab
3. Select:
   - **From Date**
   - **To Date**
4. Click **Generate Report**
5. View:
   - Income by fee type (Tuition, Exam, etc.)
   - Amount for each type
   - Number of transactions
   - Average per transaction
6. Click **Download PDF** or **Download Excel**

#### How to Generate Trial Balance

1. Click **Reports**
2. Click **Trial Balance** tab
3. Select date (as of which date)
4. Click **Generate Report**
5. View:
   - All accounts with balances
   - Total Debits and Total Credits
   - Should be equal (Balanced)
6. If not balanced: Error in journal entries
7. Click **Download PDF** or **Download Excel**

---

## Approval Workflows

### Understanding Approval Status

| Status | Meaning | What Happens |
|--------|---------|--------------|
| **Pending** | Waiting for Director approval | Not yet effective, accounts not updated |
| **Approved** | Director approved | Effective, accounts updated, PDF generated |
| **Rejected** | Director rejected | Not effective, reason provided, can be edited and resubmitted |

### Receipt Approval Workflow

**Step 1: Accountant Creates Receipt**
- Accountant fills receipt form
- Clicks "Submit for Approval"
- Status: **Pending**
- Receipt appears in Director's pending list

**Step 2: Director Reviews**
- Director sees receipt in pending approvals
- Reviews student name, amount, payment mode
- Can click to view details

**Step 3: Director Approves**
- Director clicks **Approve** button
- Status: **Approved**
- System creates journal entry:
  - Debit: Bank Account
  - Credit: Tuition Income
- PDF receipt generated
- Student fee status updated
- Notification sent to Accountant

**Step 4: Director Rejects**
- Director clicks **Reject** button
- Enters rejection reason
- Status: **Rejected**
- Accountant notified
- Accountant can edit and resubmit

### Expense Approval Workflow

**Step 1: Accountant Creates Expense**
- Accountant fills expense form
- Uploads bill/invoice (optional)
- Clicks "Submit for Approval"
- Status: **Pending**

**Step 2: Director Reviews**
- Director sees expense in pending list
- Checks amount against approval limit
- Reviews attached documents
- Can view vendor details

**Step 3: Director Approves**
- Director clicks **Approve** button
- Status: **Approved**
- System creates journal entry:
  - Debit: Expense Account
  - Credit: Bank Account
- Vendor payable updated
- Notification sent

**Step 4: Director Rejects**
- Director clicks **Reject** button
- Enters reason
- Status: **Rejected**
- Accountant can edit and resubmit

### Payroll Approval Workflow

**Step 1: Accountant Creates Payroll**
- Accountant fills payroll form
- System calculates net salary
- Clicks "Submit for Approval"
- Status: **Pending**

**Step 2: Director Reviews**
- Director sees payroll in pending list
- Reviews salary components
- Verifies calculations

**Step 3: Director Approves**
- Director clicks **Approve** button
- Status: **Approved**
- System creates journal entry:
  - Debit: Salary Expense
  - Credit: Bank Account
- PDF payslip generated
- Notification sent

**Step 4: Director Marks as Paid**
- Director clicks **Mark as Paid**
- Enters payment details:
  - Payment date
  - Payment mode
  - Reference number
- Status: **Paid**
- Employee record updated

**Step 5: Director Rejects**
- Director clicks **Reject** button
- Enters reason
- Status: **Rejected**
- Accountant can edit and resubmit

---

## Settings & Configuration

### How to Access Settings

1. Click **Settings** in sidebar (Director only)
2. View configuration options

### Financial Year Setup

1. Click **Settings**
2. Click **Financial Year** tab
3. Select:
   - **July-June** (Indian financial year)
   - **January-December** (Calendar year)
4. Click **Save**
5. Used for report generation and financial closing

### Approval Limits

1. Click **Settings**
2. Click **Approval Limits** tab
3. Set:
   - **Accountant Approval Limit** (e.g., ৳50,000)
   - Transactions above this need Director approval
4. Click **Save**

### Voucher Numbering

1. Click **Settings**
2. Click **Voucher Format** tab
3. Set prefixes and starting numbers:
   - **Receipt Prefix** (e.g., RCP)
   - **Receipt Starting Number** (e.g., 1001)
   - **Expense Prefix** (e.g., EXP)
   - **Expense Starting Number** (e.g., 2001)
   - **Payroll Prefix** (e.g., PAY)
   - **Payroll Starting Number** (e.g., 3001)
   - **Journal Prefix** (e.g., JNL)
   - **Journal Starting Number** (e.g., 4001)
4. Click **Save**
5. Example: Receipt number becomes RCP-1001, RCP-1002, etc.

### Organization Details

1. Click **Settings**
2. Click **Organization** tab
3. Set:
   - **School Name**
   - **Address**
   - **Phone**
   - **Email**
   - **Logo** (Upload image)
   - **Signature** (Upload image)
4. Click **Save**
5. Used in PDF generation for receipts, payslips, reports

### Currency Format

1. Click **Settings**
2. Click **Currency** tab
3. Select currency (৳ for Bangladeshi Taka)
4. Click **Save**
5. Used in all reports and documents

---

## Troubleshooting

### Login Issues

**Problem: "Invalid Email or Password"**
- Solution: Check email and password spelling
- Ensure Caps Lock is off
- Reset password if forgotten

**Problem: "Account Locked"**
- Solution: You entered wrong password 5 times
- Wait 30 minutes for automatic unlock
- Contact Director to unlock manually

**Problem: "Session Expired"**
- Solution: Your login session expired
- Click "Login" and enter credentials again
- Sessions expire after 7 days of inactivity

### Data Entry Issues

**Problem: "Double-Entry Validation Failed"**
- Solution: In journal entries, debits must equal credits
- Check that total debits = total credits
- Add missing entry if needed

**Problem: "Account Code Already Exists"**
- Solution: Account codes must be unique
- Use different code for new account
- Or edit existing account

**Problem: "Student Roll Number Already Exists"**
- Solution: Roll numbers must be unique
- Use different roll number
- Or edit existing student

### Approval Issues

**Problem: "Cannot Approve - Amount Exceeds Limit"**
- Solution: Transaction amount exceeds approval limit
- Director can approve any amount
- Accountant can only approve up to limit

**Problem: "Cannot Edit - Already Approved"**
- Solution: Approved transactions cannot be edited
- Contact Director to reject and resubmit
- Or create new transaction

### Report Issues

**Problem: "No Data in Report"**
- Solution: No approved transactions in selected date range
- Check date range
- Ensure transactions are approved
- Check financial year setting

**Problem: "Balance Sheet Not Balanced"**
- Solution: Assets ≠ Liabilities + Equity
- Error in journal entries
- Contact Director to review entries

### File Upload Issues

**Problem: "File Size Too Large"**
- Solution: Maximum file size is 5MB
- Compress image or PDF
- Try uploading again

**Problem: "Invalid File Type"**
- Solution: Only PDF, JPG, PNG files allowed
- Convert file to supported format
- Try uploading again

---

## FAQ

### General Questions

**Q: How do I change my password?**
A: Click your profile icon (top right) → Settings → Change Password

**Q: Can I undo an approved transaction?**
A: No, approved transactions cannot be deleted. Contact Director if correction needed.

**Q: How do I export data?**
A: In Reports section, click "Download PDF" or "Download Excel" button

**Q: Can multiple people use the system at same time?**
A: Yes, the system supports multiple concurrent users

**Q: Is my data backed up?**
A: Yes, database is automatically backed up daily

### Financial Questions

**Q: What is double-entry accounting?**
A: Every transaction has two sides - a debit and a credit. They must always be equal.

**Q: Why do I need approval?**
A: Approval ensures accuracy and prevents unauthorized transactions

**Q: What is Chart of Accounts?**
A: Master list of all accounts used to record transactions

**Q: How is net salary calculated?**
A: Net Salary = (Base + Allowances + Bonus) - (Deductions + Leave Deduction)

**Q: What is trial balance?**
A: List of all accounts showing total debits should equal total credits

### Role Questions

**Q: What can Sub-Accountant do?**
A: Can only create receipts and view data. Cannot create expenses or payroll.

**Q: What can Accountant do?**
A: Can create all transactions but cannot approve them.

**Q: What can Director do?**
A: Can create, approve, and manage all transactions. Can change settings.

**Q: How do I request more permissions?**
A: Contact your Director to change your role

### Technical Questions

**Q: What browser should I use?**
A: Chrome, Firefox, Safari, or Edge (latest versions recommended)

**Q: Do I need to install anything?**
A: No, it's a web application. Just open in browser.

**Q: Can I use on mobile?**
A: Yes, responsive design works on tablets and phones

**Q: What if I lose internet connection?**
A: You'll be logged out. Reconnect and login again.

**Q: How do I report a bug?**
A: Contact your Director with details of the issue

---

## Support & Help

### Getting Help

1. **Read this Manual** - Most questions answered here
2. **Check FAQ** - Common questions and answers
3. **Contact Director** - For system access or permission issues
4. **Check Workflow Documentation** - For technical details

### Contact Information

- **System Administrator**: [Your Director's Email]
- **Technical Support**: [Your IT Contact]
- **Finance Questions**: [Your Finance Head]

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save form |
| `Ctrl + P` | Print/Download PDF |
| `Ctrl + F` | Search |
| `Escape` | Close dialog/modal |
| `Tab` | Move to next field |
| `Enter` | Submit form |

---

## Tips & Best Practices

### Data Entry Tips

1. **Use consistent naming** - Vendor names, categories, etc.
2. **Upload documents** - Keep bill/invoice copies for expenses
3. **Enter descriptions** - Help future reference
4. **Check amounts** - Verify before submitting
5. **Use correct date** - Transaction date, not entry date

### Approval Tips

1. **Review carefully** - Check all details before approving
2. **Request documents** - Ask for bills/invoices if missing
3. **Reject with reason** - Help accountant understand issues
4. **Approve promptly** - Don't delay pending items
5. **Keep records** - Document approval decisions

### Reporting Tips

1. **Generate regularly** - Monthly financial reports
2. **Compare periods** - Check month-to-month changes
3. **Investigate variances** - If numbers seem wrong
4. **Export for analysis** - Use Excel for deeper analysis
5. **Share with stakeholders** - Keep management informed

---

## Version Information

- **Application**: Alliance Accounting System
- **Version**: 1.0.0
- **Last Updated**: March 2026
- **Status**: Production Ready

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Mar 2026 | Initial release |

---

**For more technical details, refer to WORKFLOW_DOCUMENTATION.md**

---

**© 2026 Alliance Accounting System. All Rights Reserved.**
