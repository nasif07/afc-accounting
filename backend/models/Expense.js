import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ['Petty Cash', 'Rent', 'Utility', 'Maintenance', 'Salary', 'Other'],
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: 0,
  },
  paymentMode: {
    type: String,
    enum: ['Bank Transfer', 'Cheque', 'Cash'],
    required: true,
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  billAttachment: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Paid'],
    default: 'Pending',
  },
  recordedBy: {
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
  notes: {
    type: String,
    trim: true,
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

export default mongoose.model('Expense', expenseSchema);
