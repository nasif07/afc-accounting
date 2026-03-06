// Financial Year Configuration
const FINANCIAL_YEAR_TYPES = {
  JULY_JUNE: 'july-june',
  JAN_DEC: 'jan-dec'
};

// Default: July-June (Indian Financial Year)
const DEFAULT_FINANCIAL_YEAR = FINANCIAL_YEAR_TYPES.JULY_JUNE;

// User Roles
const USER_ROLES = {
  DIRECTOR: 'director',
  ACCOUNTANT: 'accountant',
  SUB_ACCOUNTANT: 'sub-accountant'
};

// Transaction Types
const TRANSACTION_TYPES = {
  RECEIPT: 'receipt',
  PAYMENT: 'payment',
  JOURNAL_ENTRY: 'journal-entry',
  TRANSFER: 'transfer'
};

// Account Types
const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  INCOME: 'income',
  EXPENSE: 'expense'
};

// Fee Types
const FEE_TYPES = {
  TUITION: 'tuition',
  EXAM: 'exam',
  REGISTRATION: 'registration',
  ACTIVITY: 'activity',
  TRANSPORT: 'transport',
  HOSTEL: 'hostel'
};

// Payment Modes
const PAYMENT_MODES = {
  BANK: 'bank',
  CHEQUE: 'cheque',
  CARD: 'card',
  CASH: 'cash',
  ONLINE: 'online'
};

// Expense Categories
const EXPENSE_CATEGORIES = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  UTILITIES: 'utilities',
  SUPPLIES: 'supplies',
  PETTY_CASH: 'petty-cash',
  OTHER: 'other'
};

// Approval Status
const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Salary Types
const SALARY_TYPES = {
  FIXED: 'fixed',
  HOURLY: 'hourly',
  PER_CLASS: 'per-class'
};

// Currency
const CURRENCY = {
  SYMBOL: '₹',
  CODE: 'INR',
  DECIMAL_PLACES: 2
};

module.exports = {
  FINANCIAL_YEAR_TYPES,
  DEFAULT_FINANCIAL_YEAR,
  USER_ROLES,
  TRANSACTION_TYPES,
  ACCOUNT_TYPES,
  FEE_TYPES,
  PAYMENT_MODES,
  EXPENSE_CATEGORIES,
  APPROVAL_STATUS,
  SALARY_TYPES,
  CURRENCY
};
