const mongoose = require('mongoose');
const { ACCOUNT_TYPES } = require('../../config/constants');

const coaSchema = new mongoose.Schema(
  {
    accountCode: {
      type: String,
      required: [true, 'Please provide an account code'],
      unique: true,
      trim: true
    },
    accountName: {
      type: String,
      required: [true, 'Please provide an account name'],
      trim: true
    },
    accountType: {
      type: String,
      enum: Object.values(ACCOUNT_TYPES),
      required: [true, 'Please provide an account type']
    },
    description: {
      type: String,
      trim: true
    },
    openingBalance: {
      type: Number,
      default: 0
    },
    currentBalance: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChartOfAccounts', coaSchema);
