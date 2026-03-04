import mongoose from 'mongoose';

const bookEntrySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  type: {
    type: String,
    enum: ['Debit', 'Credit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
  },
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Please provide a date'],
    default: Date.now,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
  transactionType: {
    type: String,
    enum: ['Fee Collection', 'Expense', 'Payroll', 'Contra Entry', 'Opening Balance', 'Other'],
    default: 'Other',
  },
  entries: [bookEntrySchema],
  totalDebit: {
    type: Number,
    default: 0,
  },
  totalCredit: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
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

// Validate debit equals credit before saving
journalEntrySchema.pre('save', function (next) {
  const totalDebit = this.entries
    .filter(e => e.type === 'Debit')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalCredit = this.entries
    .filter(e => e.type === 'Credit')
    .reduce((sum, e) => sum + e.amount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return next(new Error('Debits must equal credits'));
  }

  this.totalDebit = totalDebit;
  this.totalCredit = totalCredit;
  next();
});

export default mongoose.model('JournalEntry', journalEntrySchema);
