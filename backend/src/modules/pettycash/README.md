# Petty Cash Module

## Overview

The Petty Cash module provides a simplified interface for managing petty cash disbursements while automatically creating proper double-entry journal entries in the accounting system.

## Features

- **Simple UI Form**: Accountant-friendly form for petty cash disbursements
- **Automatic Journal Entries**: Creates balanced double-entry transactions
- **Approval Workflow**: Supports pending/approved/rejected status
- **COA Integration**: Links to expense accounts and petty cash account
- **Audit Trail**: Full tracking of who created, approved, and when

## Accounting Logic

### Petty Cash Disbursement
When a petty cash disbursement is approved, it creates a journal entry:

**Debit**: Expense Account (selected by user)
**Credit**: Petty Cash Account (configured)

Example:
```
Debit: Office Supplies Expense    ৳500.00
Credit: Petty Cash                ৳500.00
```

### Petty Cash Fund Setup
To establish a petty cash fund (separate setup needed):

**Debit**: Petty Cash (Asset)      ৳10,000.00
**Credit**: Cash/Bank              ৳10,000.00

### Reimbursement
When petty cash is replenished:

**Debit**: Petty Cash (Asset)      ৳10,000.00
**Credit**: Cash/Bank              ৳10,000.00

## API Endpoints

### Create Petty Cash Disbursement
```
POST /api/petty-cash
```

**Request Body:**
```json
{
  "date": "2024-01-15",
  "description": "Office supplies for January",
  "amount": 500.00,
  "paidTo": "John Doe",
  "expenseAccount": "64f1a2b3c4d5e6f7g8h9i0j1",
  "pettyCashAccount": "64f1a2b3c4d5e6f7g8h9i0j2",
  "referenceNumber": "SUP-001"
}
```

### Get All Petty Cash Records
```
GET /api/petty-cash
```

**Query Parameters:**
- `approvalStatus`: pending|approved|rejected
- `dateFrom`: Start date (YYYY-MM-DD)
- `dateTo`: End date (YYYY-MM-DD)

### Approve Petty Cash
```
PATCH /api/petty-cash/:id/approve
```

### Reject Petty Cash
```
PATCH /api/petty-cash/:id/reject
```

**Request Body:**
```json
{
  "rejectionReason": "Insufficient documentation"
}
```

### Get Petty Cash Statistics
```
GET /api/petty-cash/stats/summary
```

## Database Schema

### PettyCash Model
- `pettyCashNumber`: Auto-generated (PC-000001)
- `date`: Date of disbursement
- `description`: Description of expense
- `amount`: Amount disbursed
- `paidTo`: Person who received the cash
- `expenseAccount`: COA account for the expense
- `pettyCashAccount`: Petty cash asset account
- `approvalStatus`: pending|approved|rejected
- `journalEntryId`: Reference to created journal entry
- `accountingStatus`: pending|posted|reversed

## Validation Rules

- Amount must be > 0
- Expense account and petty cash account cannot be the same
- Both accounts must be active COA accounts
- Only pending records can be edited or deleted
- Only approved records create journal entries

## Security

- **Accountant**: Can create, update, delete (pending only)
- **Sub-Accountant**: Can create, update (pending only)
- **Director**: Read-only access

## Integration with Existing System

The Petty Cash module integrates seamlessly with:
- **Chart of Accounts**: Uses existing COA for account selection
- **Journal Entry System**: Creates journal entries via AccountingService
- **User Management**: Uses existing user roles and permissions
- **Audit Logging**: All actions are logged via audit middleware

## Setup Requirements

1. **Petty Cash Account**: Create an asset account in COA for "Petty Cash"
2. **Expense Accounts**: Ensure relevant expense accounts exist in COA
3. **User Roles**: Ensure users have appropriate accountant roles

## Future Enhancements

- Petty cash fund management
- Automatic reimbursement suggestions
- Petty cash limits and thresholds
- Multi-currency support
- Bulk approvals