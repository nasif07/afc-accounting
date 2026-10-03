const AuditLog = require("./auditLog.model");

class AuditLogService {
  /**
   * Read-only listing of audit-log entries for a single entity.
   *
   * Sorted by `timestamp` descending — note this model sets
   * `{ timestamps: false }` and carries its own immutable `timestamp` field,
   * so there is no `createdAt` to sort on. `timestamp` is the indexed field
   * (auditLog.model.js declares `index: -1` on it, plus the compound
   * `{ entityType: 1, entityId: 1 }` index this query filters on).
   */
  static async getEntityLogs(entityType, entityId, options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = { entityType, entityId };

    const [data, total] = await Promise.all([
      AuditLog.find(query)
        .populate("userId", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }
}

module.exports = AuditLogService;
