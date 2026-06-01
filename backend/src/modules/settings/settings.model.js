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
    orgLogo: {
      type: String,
      default: '',
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Settings', settingsSchema);
