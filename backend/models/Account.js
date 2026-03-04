import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide an account code'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide an account name'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
    required: [true, 'Please provide an account type'],
  },
  subType: {
    type: String,
    enum: [
      'Bank', 'Cash', 'Receivable', 'Payable', 'Revenue', 'Expense',
      'Fixed Asset', 'Current Liability', 'Long Term Liability', 'Capital'
    ],
  },
  description: {
    type: String,
    trim: true,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  currentBalance: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Account', accountSchema);
