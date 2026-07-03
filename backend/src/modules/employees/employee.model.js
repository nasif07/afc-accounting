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
