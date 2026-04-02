const AuditLog = require("../modules/audit/auditLog.model");

/**
 * Middleware to log audit events
 * Usage: auditLog(action, entityType)(req, res, next)
 */
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original send method
    const originalSend = res.send;

    // Override send method to capture response
    res.send = async function(data) {
      try {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        // Parse response data
        let responseData = data;
        if (typeof data === "string") {
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = data;
          }
        }

        // Create audit log entry
        const auditEntry = {
          action,
          entityType,
          userId: req.user?._id,
          userName: req.user?.name || "Unknown",
          userRole: req.user?.role || "unknown",
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
          status: isSuccess ? "SUCCESS" : "FAILURE",
          timestamp: new Date(),
        };

        // Add entity ID if available
        if (req.params.id) {
          auditEntry.entityId = req.params.id;
        }

        // Add changes for UPDATE/CREATE actions
        if (action === "UPDATE" || action === "CREATE") {
          auditEntry.changes = {
            before: req.body.before || null,
            after: req.body,
          };
        }

        // Add error message if failure
        if (!isSuccess && responseData?.message) {
          auditEntry.errorMessage = responseData.message;
        }

        // Save audit log
        await AuditLog.create(auditEntry);
      } catch (error) {
        console.error("Error logging audit:", error);
        // Don't throw error, just log it
      }

      // Call original send
      res.send = originalSend;
      return res.send(data);
    };

    next();
  };
};

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
    console.error("Error creating audit log:", error);
  }
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (filters = {}) => {
  const query = {};

  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.userRole) query.userRole = filters.userRole;

  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }

  const logs = await AuditLog.find(query)
    .populate("userId", "name email")
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0);

  return logs;
};

module.exports = {
  auditLog,
  createAuditLog,
  getAuditLogs,
};
