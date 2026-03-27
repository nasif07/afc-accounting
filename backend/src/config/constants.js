// Financial Year Configuration
const FINANCIAL_YEAR_TYPES = {
  JULY_JUNE: 'july-june',
  JAN_DEC: 'jan-dec',
};

// Default: Bangladesh academic/accounting preference can be adjusted as needed
const DEFAULT_FINANCIAL_YEAR = FINANCIAL_YEAR_TYPES.JULY_JUNE;

// User Roles
const USER_ROLES = {
  DIRECTOR: 'director',
  ACCOUNTANT: 'accountant',
  SUB_ACCOUNTANT: 'sub-accountant',
};

// Transaction Types
const TRANSACTION_TYPES = {
  RECEIPT: 'receipt',
  PAYMENT: 'payment',
  JOURNAL_ENTRY: 'journal-entry',
  TRANSFER: 'transfer',
};

// Optional labels for frontend display
const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.RECEIPT]: 'Receipt',
  [TRANSACTION_TYPES.PAYMENT]: 'Payment',
  [TRANSACTION_TYPES.JOURNAL_ENTRY]: 'Journal Entry',
  [TRANSACTION_TYPES.TRANSFER]: 'Transfer',
};

// Account Types
const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  INCOME: 'income',
  EXPENSE: 'expense',
};

// Fee Types
const FEE_TYPES = {
  TUITION: 'tuition',
  EXAM: 'exam',
  REGISTRATION: 'registration',
  ACTIVITY: 'activity',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel',
};

// Payment Modes
const PAYMENT_MODES = {
  BANK: 'bank',
  CHEQUE: 'cheque',
  CARD: 'card',
  CASH: 'cash',
  ONLINE: 'online',
};

// Expense Categories
const EXPENSE_CATEGORIES = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  UTILITIES: 'utilities',
  SUPPLIES: 'supplies',
  PETTY_CASH: 'petty-cash',
  OTHER: 'other',
};

// Approval Status
const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Salary Types
const SALARY_TYPES = {
  FIXED: 'fixed',
  HOURLY: 'hourly',
  PER_CLASS: 'per-class',
};

// Currency
const CURRENCY = {
  SYMBOL: '৳',
  CODE: 'BDT',
  DECIMAL_PLACES: 2,
};

module.exports = {
  FINANCIAL_YEAR_TYPES,
  DEFAULT_FINANCIAL_YEAR,
  USER_ROLES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  ACCOUNT_TYPES,
  FEE_TYPES,
  PAYMENT_MODES,
  EXPENSE_CATEGORIES,
  APPROVAL_STATUS,
  SALARY_TYPES,
  CURRENCY,
};