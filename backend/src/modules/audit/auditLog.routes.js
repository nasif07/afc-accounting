const express = require("express");
const AuditLogController = require("./auditLog.controller");
const auth = require("../../middleware/auth");
const { accountantOrDirector } = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const { entityLogsQuery } = require("../../validation/auditLog.validation");

const router = express.Router();

router.use(auth);

// Both entityType and entityId are required — this is deliberately a
// per-entity read (backed by the { entityType: 1, entityId: 1 } index), not
// a global audit-log browser. A tenant-wide log viewer is a separate,
// director-only concern.
router.get(
  "/",
  accountantOrDirector,
  validate({ query: entityLogsQuery }),
  AuditLogController.getEntityLogs,
);

module.exports = router;
