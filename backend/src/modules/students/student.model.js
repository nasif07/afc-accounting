const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: [true, "Please provide a roll number"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    class: {
      type: String,
      required: [true, "Please provide a class"],
      trim: true,
      index: true, 
    },
    section: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    profession: { 
      type: String,
      trim: true,
    },
    parent: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfBirth: Date,
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    financials: {
      totalPayable: { type: Number, default: 0, min: 0 },
      totalPaid: { type: Number, default: 0, min: 0 },
      pending: { type: Number, default: 0 },
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Performance: Compound index for class-based rosters
studentSchema.index({ class: 1, rollNumber: 1 });

// Middleware for logic
studentSchema.pre("save", function (next) {
  if (this.isModified("financials.totalPayable") || this.isModified("financials.totalPaid")) {
    this.financials.pending = this.financials.totalPayable - this.financials.totalPaid;
  }
  next();
});

module.exports = mongoose.model("Student", studentSchema);