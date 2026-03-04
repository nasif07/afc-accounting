import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  periodStartDate: {
    type: Date,
    required: true,
  },
  periodEndDate: {
    type: Date,
    required: true,
  },
  grossSalary: {
    type: Number,
    required: [true, 'Please provide gross salary'],
    min: 0,
  },
  deductions: [{
    name: String,
    amount: Number,
  }],
  totalDeductions: {
    type: Number,
    default: 0,
  },
  bonuses: [{
    name: String,
    amount: Number,
  }],
  totalBonuses: {
    type: Number,
    default: 0,
  },
  netSalary: {
    type: Number,
    required: [true, 'Please provide net salary'],
    min: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processed', 'Paid', 'Rejected'],
    default: 'Pending',
  },
  paymentDate: {
    type: Date,
  },
  paymentMode: {
    type: String,
    enum: ['Bank Transfer', 'Cheque', 'Cash'],
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

export default mongoose.model('Payroll', payrollSchema);
