const AuditLog = require("../modules/audit/auditLog.model");
const logger = require("../utils/logger");

/**
 * Manual audit log creation for complex operations.
 *
 * Default behaviour is best-effort: failures are logged and swallowed, so a
 * broken audit write can never fail the user's request. That is fine for
 * telemetry-style logging, but NOT for a log that is itself a product
 * feature — the journal-entry change log is read back by
 * JournalEntryDetails, so a silently dropped write there would leave an edit
 * persisted with no trail. Callers in that situation pass `session` (to join
 * the caller's transaction) and `rethrow: true` (so a failed log aborts it).
 */
const createAuditLog = async ({
  action,
  entityType,
  entityId,
  userId,
  userName,
  userRole,
  ipAddress,
  userAgent,
  changes,
  status = "SUCCESS",
  errorMessage,
  description,
  session = null,
  rethrow = false,
}) => {
  try {
    await AuditLog.create(
      [
        {
          action,
          entityType,
          entityId,
          userId,
          userName,
          userRole,
          ipAddress,
          userAgent,
          changes,
          status,
          errorMessage,
          description,
          timestamp: new Date(),
        },
      ],
      session ? { session } : {},
    );
  } catch (error) {
    logger.error({ err: error }, "Error creating audit log");
    if (rethrow) throw error;
  }
};

module.exports = {
  createAuditLog,
};
