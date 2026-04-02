const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    paymentTerms: {
      type: String,
      enum: ["net-15", "net-30", "net-60", "due-on-receipt", "custom"],
      default: "net-30",
    },
    taxId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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
  },
  { timestamps: true }
);

vendorSchema.index({ vendorCode: 1 }, { unique: true });
vendorSchema.index({ vendorName: 1, isActive: 1 });
vendorSchema.index({ createdBy: 1 });
vendorSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("Vendor", vendorSchema);
