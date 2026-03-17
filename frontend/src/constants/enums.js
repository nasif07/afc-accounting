// User Roles
export const USER_ROLES = {
  DIRECTOR: 'director',
  ACCOUNTANT: 'accountant',
  SUB_ACCOUNTANT: 'sub-accountant'
};

// Transaction Types
export const TRANSACTION_TYPES = {
  RECEIPT: 'receipt',
  PAYMENT: 'payment',
  JOURNAL_ENTRY: 'journal-entry',
  TRANSFER: 'transfer'
};

// Account Types
export const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  INCOME: 'income',
  EXPENSE: 'expense'
};

// Fee Types
export const FEE_TYPES = {
  TUITION: 'tuition',
  EXAM: 'exam',
  REGISTRATION: 'registration',
  ACTIVITY: 'activity',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel'
};

// Payment Modes
export const PAYMENT_MODES = {
  BANK: 'bank',
  CHEQUE: 'cheque',
  CARD: 'card',
  CASH: 'cash',
  ONLINE: 'online'
};

// Expense Categories
export const EXPENSE_CATEGORIES = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  UTILITIES: 'utilities',
  SUPPLIES: 'supplies',
  PETTY_CASH: 'petty-cash',
  OTHER: 'other'
};

// Approval Status
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Salary Types
export const SALARY_TYPES = {
  FIXED: 'fixed',
  HOURLY: 'hourly',
  PER_CLASS: 'per-class'
};

// Currency
export const CURRENCY = {
  SYMBOL: '₹',
  CODE: 'INR',
  DECIMAL_PLACES: 2
};

// Financial Year Types
export const FINANCIAL_YEAR_TYPES = {
  JULY_JUNE: 'july-june',
  JAN_DEC: 'jan-dec'
};

// Display Labels
export const ROLE_LABELS = {
  [USER_ROLES.DIRECTOR]: 'Director',
  [USER_ROLES.ACCOUNTANT]: 'Accountant',
  [USER_ROLES.SUB_ACCOUNTANT]: 'Sub-Accountant'
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.RECEIPT]: 'Receipt',
  [TRANSACTION_TYPES.PAYMENT]: 'Payment',
  [TRANSACTION_TYPES.JOURNAL_ENTRY]: 'Journal Entry',
  [TRANSACTION_TYPES.TRANSFER]: 'Transfer'
};

export const ACCOUNT_TYPE_LABELS = {
  [ACCOUNT_TYPES.ASSET]: 'Asset',
  [ACCOUNT_TYPES.LIABILITY]: 'Liability',
  [ACCOUNT_TYPES.EQUITY]: 'Equity',
  [ACCOUNT_TYPES.INCOME]: 'Income',
  [ACCOUNT_TYPES.EXPENSE]: 'Expense'
};

export const APPROVAL_STATUS_LABELS = {
  [APPROVAL_STATUS.PENDING]: 'Pending',
  [APPROVAL_STATUS.APPROVED]: 'Approved',
  [APPROVAL_STATUS.REJECTED]: 'Rejected'
};

export const APPROVAL_STATUS_COLORS = {
  [APPROVAL_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [APPROVAL_STATUS.APPROVED]: 'bg-green-100 text-green-800',
  [APPROVAL_STATUS.REJECTED]: 'bg-red-100 text-red-800'
};

export const PAYMENT_MODE_LABELS = {
  [PAYMENT_MODES.BANK]: 'Bank Transfer',
  [PAYMENT_MODES.CHEQUE]: 'Cheque',
  [PAYMENT_MODES.CARD]: 'Card',
  [PAYMENT_MODES.CASH]: 'Cash',
  [PAYMENT_MODES.ONLINE]: 'Online'
};

export const EXPENSE_CATEGORY_LABELS = {
  [EXPENSE_CATEGORIES.OPERATIONAL]: 'Operational',
  [EXPENSE_CATEGORIES.MAINTENANCE]: 'Maintenance',
  [EXPENSE_CATEGORIES.UTILITIES]: 'Utilities',
  [EXPENSE_CATEGORIES.SUPPLIES]: 'Supplies',
  [EXPENSE_CATEGORIES.PETTY_CASH]: 'Petty Cash',
  [EXPENSE_CATEGORIES.OTHER]: 'Other'
};

export const FEE_TYPE_LABELS = {
  [FEE_TYPES.TUITION]: 'Tuition',
  [FEE_TYPES.EXAM]: 'Exam',
  [FEE_TYPES.REGISTRATION]: 'Registration',
  [FEE_TYPES.ACTIVITY]: 'Activity',
  [FEE_TYPES.TRANSPORT]: 'Transport',
  [FEE_TYPES.HOSTEL]: 'Hostel'
};

export const SALARY_TYPE_LABELS = {
  [SALARY_TYPES.FIXED]: 'Fixed',
  [SALARY_TYPES.HOURLY]: 'Hourly',
  [SALARY_TYPES.PER_CLASS]: 'Per Class'
};
