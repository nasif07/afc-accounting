const AuditLog = require("../modules/audit/auditLog.model");
const logger = require("../utils/logger");

/**
 * Manual audit log creation for complex operations
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
}) => {
  try {
    await AuditLog.create({
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
    });
  } catch (error) {
    logger.error({ err: error }, "Error creating audit log");
  }
};

module.exports = {
  createAuditLog,
};
