# Phase 5: Journal UI Enhancement and COA Tree View Design

## 1. Overview
This phase focuses on enhancing the frontend user interface for Journal Entry creation with dynamic row management and implementing a hierarchical Tree View for the Chart of Accounts (COA).

## 2. Journal Entry Form Enhancement

### 2.1 Dynamic Row Management
The Journal Entry form will support dynamic addition and removal of book entries (debit/credit lines).

**Features:**
- **Add Row Button**: Allows users to add new line items dynamically
- **Remove Row Button**: Allows users to remove line items (with validation)
- **Real-time Balance Calculation**: Shows running total of debits and credits
- **Validation**: Ensures debits = credits before submission
- **Account Selection**: Dropdown showing only leaf accounts (parent accounts excluded)

### 2.2 Component Structure
```
JournalEntryForm
├── VoucherDetails (voucherNumber, voucherDate, transactionType)
├── BookEntriesTable
│   ├── BookEntryRow (dynamic, repeating)
│   │   ├── AccountSelect (leaf accounts only)
│   │   ├── DescriptionInput
│   │   ├── DebitInput
│   │   ├── CreditInput
│   │   └── RemoveButton
│   ├── AddRowButton
│   └── BalanceSummary (totalDebits, totalCredits, isBalanced)
├── AttachmentUpload
└── SubmitButton (enabled only when balanced)
```

### 2.3 Validation Logic
- Each row must have an account selected
- Each row must have either a debit or credit (not both, not zero)
- Total debits must equal total credits
- Account must be a leaf node (not a parent account)

## 3. COA Tree View Component

### 3.1 Tree Structure
The COA Tree View will display the hierarchical structure of accounts with expand/collapse functionality.

**Features:**
- **Hierarchical Display**: Parent-child account relationships
- **Expand/Collapse**: Toggle visibility of child accounts
- **Account Details**: Show account code, name, and type
- **Balance Display**: Show current balance for each account
- **Leaf Account Indicator**: Visual indication of leaf vs. parent accounts
- **Search/Filter**: Filter accounts by name or code
- **Account Actions**: View details, edit, delete (with appropriate permissions)

### 3.2 Component Structure
```
COATreeView
├── SearchBar (filter by name/code)
├── TreeContainer
│   ├── TreeNode (recursive)
│   │   ├── ExpandToggle (if has children)
│   │   ├── AccountIcon (parent/leaf indicator)
│   │   ├── AccountInfo (code, name, type)
│   │   ├── BalanceDisplay
│   │   ├── ActionButtons (edit, delete, view)
│   │   └── ChildNodes (if expanded)
```

### 3.3 API Integration
- **Fetch Tree**: `GET /api/accounts/tree` - Returns hierarchical account structure
- **Fetch Leaf Nodes**: `GET /api/accounts/leaf-nodes` - Returns only leaf accounts for journal entry selection
- **Get Account Balance**: `GET /api/accounting/balance/:accountId` - Get current balance

## 4. Implementation Plan

### 4.1 Frontend Components to Create
1. **DynamicJournalForm.jsx** - Enhanced journal entry form with dynamic rows
2. **BookEntryRow.jsx** - Individual row component for book entries
3. **AccountSelector.jsx** - Dropdown for selecting leaf accounts only
4. **BalanceSummary.jsx** - Display running totals and balance status
5. **COATreeView.jsx** - Hierarchical tree view of accounts
6. **TreeNode.jsx** - Individual tree node component (recursive)

### 4.2 State Management (Redux)
- Update `journalSlice` to handle dynamic row management
- Add `coaSlice` for tree view state and caching
- Implement selectors for leaf accounts only

### 4.3 Validation Hooks
- `useJournalValidation()` - Validate journal entry data
- `useAccountValidation()` - Validate account selections

## 5. User Experience Improvements

### 5.1 Error Handling
- Clear error messages for validation failures
- Highlight rows with errors
- Show balance mismatch warnings

### 5.2 User Feedback
- Loading states while fetching accounts
- Success/error notifications after submission
- Confirmation dialogs before deletion

### 5.3 Accessibility
- Keyboard navigation for adding/removing rows
- ARIA labels for screen readers
- Tab order optimization

## 6. Performance Considerations

- **Lazy Loading**: Load tree nodes on demand
- **Memoization**: Memoize tree nodes to prevent unnecessary re-renders
- **Virtual Scrolling**: For large account hierarchies
- **Caching**: Cache leaf accounts list for quick access

This design ensures a user-friendly interface for journal entry creation and a clear visualization of the account hierarchy, improving the overall user experience and data entry accuracy.
