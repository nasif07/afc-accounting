import mongoose from 'mongoose';

const feeCollectionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: true,
  },
  feeType: {
    type: String,
    enum: ['Tuition', 'Exam', 'Registration', 'Other'],
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
    min: 0,
  },
  paymentMode: {
    type: String,
    enum: ['Bank Deposit', 'Bank Transfer', 'Cheque', 'Card', 'Cash'],
    required: true,
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
  chequeNumber: {
    type: String,
    trim: true,
  },
  chequeDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['Pending', 'Cleared', 'Bounced', 'Cancelled'],
    default: 'Cleared',
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

export default mongoose.model('FeeCollection', feeCollectionSchema);
