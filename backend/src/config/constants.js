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

// Approval Status
const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Which part of the system created a journal entry. These values were already
// enumerated inline on JournalEntry.sourceModule; they moved here so the
// model and the query validator can share one list.
const SOURCE_MODULES = {
  MANUAL: 'manual',
  BANK_BOOK: 'bank_book',
  STUDENT_COLLECTION: 'student_collection',
  PETTY_CASH: 'petty_cash',
  PAYROLL: 'payroll',
  RECEIPT: 'receipt',
  EXPENSE: 'expense',
  BANK_RECONCILIATION: 'bank_reconciliation',
  OPENING_BALANCE: 'OPENING_BALANCE',
};

const SOURCE_MODULE_LABELS = {
  [SOURCE_MODULES.MANUAL]: 'Manual',
  [SOURCE_MODULES.BANK_BOOK]: 'Bank Book',
  [SOURCE_MODULES.STUDENT_COLLECTION]: 'Student Collection',
  [SOURCE_MODULES.PETTY_CASH]: 'Petty Cash',
  [SOURCE_MODULES.PAYROLL]: 'Payroll',
  [SOURCE_MODULES.RECEIPT]: 'Receipt',
  [SOURCE_MODULES.EXPENSE]: 'Expense',
  [SOURCE_MODULES.BANK_RECONCILIATION]: 'Bank Reconciliation',
  [SOURCE_MODULES.OPENING_BALANCE]: 'Opening Balance',
};

// Salary Types
const SALARY_TYPES = {
  MONTHLY: 'monthly',
  CONTRACT: 'contract',
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

// Approval-request attachments (modules/approval). Deliberately separate from
// the global MAX_FILE_SIZE (5 MB) that express-fileupload and utils/fileUploader
// enforce for petty cash: scanned approval documents routinely exceed that, and
// raising the global limit would silently widen every other upload path too.
const APPROVAL_ATTACHMENTS = {
  // Kept in sync with the client-side list in ApprovalFileDropzone.jsx. GIF is
  // deliberately excluded (utils/fileUploader.js allows it for legacy reasons —
  // there is no reason to accept animated images as financial evidence).
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
  // Cross-checked against the MIME type so a .pdf renamed to .png is rejected.
  MIME_EXTENSIONS: {
    "application/pdf": [".pdf"],
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/webp": [".webp"],
  },
  MAX_FILE_SIZE: parseInt(process.env.APPROVAL_MAX_FILE_SIZE, 10) || 10485760, // 10 MB
  MAX_FILES: 10,
  // Lifetime of a presigned PUT. Long enough for a slow connection to finish a
  // 10 MB upload, short enough that a leaked URL is not a durable write grant.
  UPLOAD_URL_TTL_SECONDS: 15 * 60,
  // Lifetime of a presigned GET handed to a viewer. Short by design — these are
  // financial documents and the URL itself carries the authorization.
  DOWNLOAD_URL_TTL_SECONDS: 5 * 60,
};

// Organisation logo (modules/settings). Stored in R2 like approval
// attachments rather than on the container's disk — utils/fileUploader.js
// writes to an ephemeral volume, so a logo uploaded there disappears on the
// next deploy and every PDF silently reverts to the bundled artwork.
// Accounts that hold the director role but must never appear as a
// notification recipient — the vendor/support login, which exists to
// administer the system rather than to approve anything. Listing it here
// rather than deactivating the account keeps its access intact while taking
// it out of every recipient picker.
//
// Comma-separated env override so a deployment can adjust the list without a
// code change; the default covers the account this app ships with.
const NOTIFICATION_EXCLUDED_EMAILS = (
  process.env.NOTIFY_EXCLUDED_EMAILS || "softaura.dev@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ORG_LOGO = {
  // No PDF and no SVG. SVG is a script-execution vector when served back to a
  // browser, and the server-side generators (pdfkit, docx) cannot rasterise it
  // anyway — a logo that renders in the app but vanishes from every payslip is
  // worse than refusing the upload.
  ALLOWED_MIME_TYPES: ["image/png", "image/jpeg", "image/webp"],
  MIME_EXTENSIONS: {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/webp": [".webp"],
  },
  // Far below the 10 MB attachment cap: this is a header mark a few hundred
  // pixels wide, and every byte is re-downloaded by the report generators.
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2 MB
  UPLOAD_URL_TTL_SECONDS: 5 * 60,
  // How long a resolved logo is held in memory by utils/reportLogo.js before
  // it is re-fetched. Keyed by object key, so a NEW upload is picked up
  // immediately regardless of this — it only bounds staleness after a
  // same-key overwrite, which nothing in the app does.
  CACHE_TTL_MS: 10 * 60 * 1000,
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
  APPROVAL_STATUS,

  APPROVAL_ATTACHMENTS,
  NOTIFICATION_EXCLUDED_EMAILS,
  ORG_LOGO,
  SOURCE_MODULES,
  SOURCE_MODULE_LABELS,
  SALARY_TYPES,
  CURRENCY,
};
