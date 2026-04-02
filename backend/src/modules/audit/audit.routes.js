const express = require("express");
const AuditLog = require("./auditLog.model");
const auth = require("../../middleware/auth");
const { directorOnly } = require("../../middleware/roleCheck");
const ApiResponse = require("../../utils/apiResponse");

const router = express.Router();

router.use(auth);

router.get("/", directorOnly, async (req, res, next) => {
  try {
    const { userId, action, entityType, startDate, endDate, limit, skip } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate("userId", "name email")
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 100)
      .skip(parseInt(skip) || 0);

    return ApiResponse.success(res, logs, "Audit logs retrieved successfully");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
