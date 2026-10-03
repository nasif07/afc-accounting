const mongoose = require('mongoose');
const { FINANCIAL_YEAR_TYPES, CURRENCY } = require('../../config/constants');

const settingsSchema = new mongoose.Schema(
  {
    // ── Organization identity ────────────────────────────────────────────────
    orgName: {
      type: String,
      trim: true,
      default: 'Alliance Francaise de Chittagong',
    },
    // Legacy: a path or URL typed by hand ('/afc-full-logo.jpg'). Kept
    // because existing installs have one, and because it is still the only
    // way to point at an asset shipped with the frontend. orgLogoKey wins
    // when both are set — an explicit upload beats a leftover string.
    orgLogo: {
      type: String,
      default: '',
    },

    // R2 object key for an uploaded logo (services/r2.service.js buildLogoKey).
    // The bucket is private, so this is never a URL: the app reads it through
    // GET /api/settings/logo, and the report generators fetch the bytes
    // directly (utils/reportLogo.js).
    orgLogoKey: {
      type: String,
      default: '',
      trim: true,
    },
    orgLogoMimeType: {
      type: String,
      default: '',
    },
    // Cache-buster for the <img> tag. The URL that serves the logo does not
    // change when the key behind it does, so without this a replaced logo
    // keeps rendering the old artwork until the browser's cache expires.
    orgLogoUpdatedAt: {
      type: Date,
      default: null,
    },
    orgEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'info@af-chittagong.org',
    },
    orgPhone: {
      type: String,
      trim: true,
      default: '+88 01318896444',
    },
    orgAddress: {
      type: String,
      trim: true,
      default: '123, K. B. Fazlul Kader Road, Panchlaish R/A, Chittagong-4203, Bangladesh',
    },
    orgWebsite: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Authorized signatory ─────────────────────────────────────────────────
    directorName: {
      type: String,
      trim: true,
      default: 'Bruno LACRAMPE',
    },
    directorTitle: {
      type: String,
      trim: true,
      default: 'Director',
    },

    // ── Report header / footer text ──────────────────────────────────────────
    reportHeader: {
      type: String,
      trim: true,
      default: '',
    },
    reportFooter: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Payslip-specific labels ──────────────────────────────────────────────
    leaveYearLabel: {
      type: String,
      trim: true,
      default: "July'2025 - June'2026",
    },
    benefitPeriodLabel: {
      type: String,
      trim: true,
      default: '01-07-2023 to 30-06-2025',
    },
    healthFundLabel: {
      type: String,
      trim: true,
      default: 'Health Fund',
    },

    // Yearly leave entitlements printed in the payslip's Leave Status block;
    // "taken" comes off the payroll run, "remaining" is the difference.
    annualLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    sickLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Payment defaults ─────────────────────────────────────────────────────
    bankNameForPayment: {
      type: String,
      trim: true,
      default: 'Brac Bank PLC',
    },
    bankAccountForPayment: {
      type: String,
      trim: true,
      default: 'XXXXXXXXXXXXXXX',
    },

    // ── Bank reconciliation posting defaults ─────────────────────────────────
    // The contra account each auto-posted reconciliation adjustment is booked
    // against, when the preparer doesn't pick one on the line itself. Only the
    // two "the bank moved money our books never recorded" categories post at
    // all — see POSTABLE_TYPES in bankReconciliation.service.js. Left null
    // here so a fresh install falls back to the seeded account codes rather
    // than pointing at an account that may not exist.
    bankChargeAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      default: null,
    },
    bankCreditAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      default: null,
    },

    // ── Financial year ───────────────────────────────────────────────────────
    financialYearType: {
      type: String,
      enum: Object.values(FINANCIAL_YEAR_TYPES),
      default: FINANCIAL_YEAR_TYPES.JULY_JUNE,
    },
    currentFinancialYear: {
      type: String,
      default: '',
    },

    // ── Currency ─────────────────────────────────────────────────────────────
    currency: {
      type: String,
      default: CURRENCY.CODE,
    },
    currencySymbol: {
      type: String,
      default: CURRENCY.SYMBOL,
    },
    decimalPlaces: {
      type: Number,
      default: CURRENCY.DECIMAL_PLACES,
    },

    // ── Approval limits ──────────────────────────────────────────────────────
    approvalLimitDirector: {
      type: Number,
      default: 999999,
    },
    approvalLimitAccountant: {
      type: Number,
      default: 100000,
    },
    approvalLimitSubAccountant: {
      type: Number,
      default: 10000,
    },
    highValueTransactionThreshold: {
      type: Number,
      default: 50000,
    },

    // ── Feature flags ────────────────────────────────────────────────────────
    enableEmailNotifications: {
      type: Boolean,
      default: true,
    },
    enableApprovalWorkflow: {
      type: Boolean,
      default: true,
    },

    // Master on/off switch for the 24-hour post-creation journal-entry edit
    // window (accounting.service.js's updateEntry). When false, no one can
    // edit a journal entry regardless of how recently it was created. This
    // only ever governs the narrative fields — amounts, accounts and
    // approval state are permanently immutable and no setting overrides that.
    allowJournalEdit: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Settings', settingsSchema);
