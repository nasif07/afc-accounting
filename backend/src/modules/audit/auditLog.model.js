const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "LOGIN", "LOGOUT"],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["JournalEntry", "Account", "User", "Vendor", "VendorInvoice", "VendorPayment", "BankAccount", "BankTransaction"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["director", "accountant", "sub-accountant"],
      required: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
    },
    errorMessage: {
      type: String,
    },
    description: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: false } // Don't use automatic timestamps for audit logs
);

// Ensure audit logs are immutable
auditLogSchema.pre("save", function(next) {
  if (!this.isNew) {
    throw new Error("Audit logs cannot be modified");
  }
  next();
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userRole: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
