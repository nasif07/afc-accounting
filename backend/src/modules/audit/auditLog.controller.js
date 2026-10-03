const AuditLogService = require("./auditLog.service");
const ApiResponse = require("../../utils/apiResponse");

class AuditLogController {
  static async getEntityLogs(req, res, next) {
    try {
      const { entityType, entityId, page, limit } = req.query;

      const result = await AuditLogService.getEntityLogs(entityType, entityId, {
        page,
        limit,
      });

      return ApiResponse.success(
        res,
        result,
        "Audit logs retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuditLogController;
