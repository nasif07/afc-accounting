import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Please provide an employee ID'],
    unique: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: [true, 'Please provide first name'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Please provide last name'],
    trim: true,
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },
  phone: {
    type: String,
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  salaryStructure: {
    type: String,
    enum: ['Fixed', 'Hourly', 'Per-Class'],
    default: 'Fixed',
  },
  baseSalary: {
    type: Number,
    default: 0,
  },
  hourlyRate: {
    type: Number,
    default: 0,
  },
  perClassRate: {
    type: Number,
    default: 0,
  },
  joinDate: {
    type: Date,
    required: true,
  },
  bankAccount: {
    type: String,
    trim: true,
  },
  bankName: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Resigned'],
    default: 'Active',
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

export default mongoose.model('Employee', employeeSchema);
