const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: [true, 'Please provide a vendor name'],
      trim: true,
    },
    vendorCode: {
      type: String,
      required: [true, 'Please provide a vendor code'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    vendorType: {
      type: String,
      enum: ['supplier', 'contractor', 'service-provider', 'other'],
      required: [true, 'Please specify vendor type'],
    },
    email: {
      type: String,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    bankAccountNumber: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPayable: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate outstanding amount
vendorSchema.pre('save', function (next) {
  if (this.isModified('totalPayable') || this.isModified('totalPaid')) {
    this.outstandingAmount = Math.max(0, this.totalPayable - this.totalPaid);
  }
  next();
});

// Index for soft delete queries
vendorSchema.index({ deletedAt: 1 });
vendorSchema.index({ vendorCode: 1, deletedAt: 1 });
vendorSchema.index({ isActive: 1, deletedAt: 1 });

// Query helper to exclude deleted vendors
vendorSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Vendor', vendorSchema);
