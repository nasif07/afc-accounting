const mongoose = require("mongoose");
const { SALARY_TYPES, APPROVAL_STATUS } = require("../../config/constants");

const payrollSchema = new mongoose.Schema(
  {
    payrollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    salaryType: {
      type: String,
      enum: Object.values(SALARY_TYPES),
      required: true,
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    leaveDeduction: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    leavesTaken: {
      type: Number,
      default: 0,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.PENDING,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: Date,
    paymentDate: Date,
    paymentMode: String,
    referenceNumber: String,
    pdfPath: String,
    emailSent: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

// Prevent duplicate payroll for the same employee in the same month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true, sparse: false });

// Exclude soft-deleted records by default
function excludeDeleted(next) {
  const query = this.getQuery();
  if (!query.includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
}
payrollSchema.pre("find", excludeDeleted);
payrollSchema.pre("findOne", excludeDeleted);
payrollSchema.pre("countDocuments", excludeDeleted);

module.exports = mongoose.model("Payroll", payrollSchema);
