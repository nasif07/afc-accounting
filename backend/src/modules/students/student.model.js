const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: [true, 'Please provide a roll number'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true
    },
    class: {
      type: String,
      required: [true, 'Please provide a class'],
      trim: true
    },
    section: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      trim: true
    },
    parentName: {
      type: String,
      trim: true
    },
    parentEmail: {
      type: String,
      lowercase: true
    },
    parentPhone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    admissionDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    totalFeesPayable: {
      type: Number,
      default: 0
    },
    totalFeesPaid: {
      type: Number,
      default: 0
    },
    feePendingAmount: {
      type: Number,
      default: 0
    },
    notes: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
