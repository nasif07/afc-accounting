const express = require("express");
const ApprovalController = require("./approval.controller");
const auth = require("../../middleware/auth");
const {
  directorOnly,
  accountantOrDirector,
} = require("../../middleware/roleCheck");
const validate = require("../../validation/validate");
const {
  presignUploadBody,
  createApprovalBody,
  getApprovalsQuery,
  rejectApprovalBody,
  bulkApproveBody,
  notifyBody,
  statsQuery,
  attachmentParams,
  idParam,
} = require("../../validation/approval.validation");

const router = express.Router();

router.use(auth);

// ── Attachments ───────────────────────────────────────────────────────────
// Mints presigned PUT URLs. The browser uploads directly to R2 from here; no
// file bytes pass through this process.
router.post(
  "/attachments/presign",
  accountantOrDirector,
  validate({ body: presignUploadBody }),
  ApprovalController.createUploadUrls,
);

// ── Notification recipients ───────────────────────────────────────────────
// The directors an accountant may email a request to. Not director-only: an
// accountant needs the list precisely because they are the one choosing.
router.get(
  "/directors",
  accountantOrDirector,
  ApprovalController.listDirectors,
);

// Counts for the stat tiles. Declared with the other static segments, before
// "/:id", or Express parses "stats" as an id.
router.get(
  "/stats",
  accountantOrDirector,
  validate({ query: statsQuery }),
  ApprovalController.getStats,
);

// ── Bulk operations ───────────────────────────────────────────────────────
// Declared before "/:id" so "bulk-approve" is never parsed as an id.
router.post(
  "/bulk-approve",
  directorOnly,
  validate({ body: bulkApproveBody }),
  ApprovalController.bulkApprove,
);

// ── CRUD ──────────────────────────────────────────────────────────────────
router.post(
  "/",
  accountantOrDirector,
  validate({ body: createApprovalBody }),
  ApprovalController.createApproval,
);

router.get(
  "/",
  accountantOrDirector,
  validate({ query: getApprovalsQuery }),
  ApprovalController.getApprovals,
);

router.get(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam }),
  ApprovalController.getApprovalById,
);

// Short-lived presigned GET for one attachment. The key is URL-encoded by the
// client; the (*) pattern keeps its slashes intact through routing.
router.get(
  "/:id/attachments/:key(*)",
  accountantOrDirector,
  validate({ params: attachmentParams }),
  ApprovalController.getAttachmentUrl,
);

// Creator-only, pending-only. Soft delete.
router.delete(
  "/:id",
  accountantOrDirector,
  validate({ params: idParam }),
  ApprovalController.deleteApproval,
);

// Emails an existing pending request to selected directors. Creator-scoped
// through assertCanView, so an accountant can only chase their own requests.
router.post(
  "/:id/notify",
  accountantOrDirector,
  validate({ params: idParam, body: notifyBody }),
  ApprovalController.notifyDirectors,
);

// ── Approval operations ───────────────────────────────────────────────────
// Mirrors accounting.routes.js:97-108 — decisions are director-only.
router.patch(
  "/:id/approve",
  directorOnly,
  validate({ params: idParam }),
  ApprovalController.approveApproval,
);

router.patch(
  "/:id/reject",
  directorOnly,
  validate({ params: idParam, body: rejectApprovalBody }),
  ApprovalController.rejectApproval,
);

module.exports = router;
