const mongoose = require("mongoose");
const { EMAIL_REGEX } = require("../../utils/validators");

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      match: [EMAIL_REGEX, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    department: String,
    dateOfJoining: {
      type: Date,
      required: true,
    },
    dateOfBirth: Date,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    bankAccountNumber: String,
    bankName: String,
    status: {
      type: String,
      enum: ["active", "inactive", "on-leave", "resigned"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,

    // ── Payslip reference figures ─────────────────────────────────────────────
    // Printed verbatim on the payslip (particulars block and the fund status
    // tables). They are reference data, not computed from payroll runs, so a
    // missing value simply prints as a dash.
    employmentType:           { type: String, trim: true, default: "Permanent" },
    payScale:                 { type: Number, min: 0 },
    scalePointValue:          { type: Number, min: 0 },
    monthlyWorkingHours:      { type: Number, min: 0 },
    healthFundTotal:          { type: Number, min: 0 },
    healthFundTaken:          { type: Number, min: 0 },
    healthFundNote:           { type: String, trim: true },
    lifeFundBalance:          { type: Number, min: 0 },
    retirementBenefitBalance: { type: Number, min: 0 },

    // ── Leave ────────────────────────────────────────────────────────────────
    // The payslip's Leave Status block. Entitlement and days taken both live
    // here so leave is managed in one place, on the employee, rather than the
    // entitlement being a single global Settings value applied to everyone.
    //
    // Left undefined rather than defaulted to 0 so the payslip can still fall
    // back to the organisation-wide Settings figure for employees nobody has
    // configured individually yet.
    annualLeaveDays:  { type: Number, min: 0 },
    annualLeaveTaken: { type: Number, min: 0, default: 0 },
    sickLeaveDays:    { type: Number, min: 0 },
    sickLeaveTaken:   { type: Number, min: 0, default: 0 },

    // ── Emergency contact ─────────────────────────────────────────────────────
    emergencyContactName:         { type: String, trim: true },
    emergencyContactRelationship: { type: String, trim: true },
    emergencyContactPhone:        { type: String, trim: true },
    emergencyContactAltPhone:     { type: String, trim: true },
    emergencyContactAddress:      { type: String, trim: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", employeeSchema);
