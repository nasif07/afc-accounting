const mongoose = require('mongoose');
const { FINANCIAL_YEAR_TYPES, CURRENCY } = require('../../config/constants');

const settingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
      trim: true
    },
    schoolLogo: String,
    schoolAddress: String,
    schoolPhone: String,
    schoolEmail: String,
    financialYearType: {
      type: String,
      enum: Object.values(FINANCIAL_YEAR_TYPES),
      default: FINANCIAL_YEAR_TYPES.JULY_JUNE
    },
    currentFinancialYear: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      default: CURRENCY.CODE
    },
    currencySymbol: {
      type: String,
      default: CURRENCY.SYMBOL
    },
    decimalPlaces: {
      type: Number,
      default: CURRENCY.DECIMAL_PLACES
    },
    voucherNumberingFormat: {
      type: String,
      default: 'V-YYYY-MM-XXXXX'
    },
    receiptNumberingFormat: {
      type: String,
      default: 'R-YYYY-MM-XXXXX'
    },
    expenseNumberingFormat: {
      type: String,
      default: 'E-YYYY-MM-XXXXX'
    },
    payrollNumberingFormat: {
      type: String,
      default: 'P-YYYY-MM-XXXXX'
    },
    approvalLimitDirector: {
      type: Number,
      default: 999999
    },
    approvalLimitAccountant: {
      type: Number,
      default: 100000
    },
    approvalLimitSubAccountant: {
      type: Number,
      default: 10000
    },
    highValueTransactionThreshold: {
      type: Number,
      default: 50000
    },
    enableEmailNotifications: {
      type: Boolean,
      default: true
    },
    enableApprovalWorkflow: {
      type: Boolean,
      default: true
    },
    enableBulkImport: {
      type: Boolean,
      default: true
    },
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    lastBackupDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
