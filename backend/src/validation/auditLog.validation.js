const { z } = require("zod");
const { objectId, paginationQuery } = require("./common");

// Mirrors auditLog.model.js's entityType enum. Kept as an explicit list (not
// derived from the model) so an unsupported value is rejected at the route
// with a clear message rather than silently returning an empty result set.
const AUDIT_ENTITY_TYPES = [
  "JournalEntry",
  "Account",
  "User",
  "Vendor",
  "VendorInvoice",
  "VendorPayment",
  "BankAccount",
  "BankBook",
  "BankTransaction",
  "Approval",
];

const entityLogsQuery = paginationQuery.extend({
  entityType: z.enum(AUDIT_ENTITY_TYPES),
  entityId: objectId,
});

module.exports = {
  AUDIT_ENTITY_TYPES,
  entityLogsQuery,
};
