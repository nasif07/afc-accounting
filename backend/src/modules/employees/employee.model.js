const mongoose = require("mongoose");

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
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", employeeSchema);
