const { z } = require("zod");
const { objectId, idParam, paginationQuery, requiredDate } = require("./common");
const { APPROVAL_STATUS, APPROVAL_ATTACHMENTS } = require("../config/constants");
const { htmlToPlainText } = require("../utils/richText");

const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_FILES } = APPROVAL_ATTACHMENTS;

const maxFileSizeMb = Math.round(MAX_FILE_SIZE / 1024 / 1024);

// There are only ever a handful of directors; the cap exists so a malformed or
// hostile payload cannot turn one API call into an unbounded mail fan-out.
const MAX_NOTIFY_RECIPIENTS = 10;

/**
 * A rich-text (HTML) field from the TipTap editor.
 *
 * Length is measured on the plain-text projection, not on the markup: the
 * author typed words, not tags, so counting `<strong>` against their limit
 * would make the same sentence pass or fail depending on how it was formatted.
 * An editor that has been opened and cleared serialises to "<p></p>", which is
 * non-empty as a string but empty as a document — hence the emptiness check
 * runs on the text too.
 *
 * Sanitisation is NOT done here. Zod validates shape; the tag allowlist is
 * applied in the service immediately before persisting (approval.service.js),
 * so there is exactly one place that decides what markup is storable.
 */
const richText = (label, maxChars) =>
  z
    .string()
    .max(20000, `${label} is too long`)
    .refine((html) => htmlToPlainText(html).length > 0, {
      message: `${label} is required`,
    })
    .refine((html) => htmlToPlainText(html).length <= maxChars, {
      message: `${label} cannot exceed ${maxChars} characters`,
    });

// One file the client intends to upload. This is the *request* for a presigned
// URL, so the values are still claims at this point — they get pinned into the
// signature and then re-verified against R2 by HeadObject before anything is
// persisted (approval.service.js).
const presignFile = z.object({
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename cannot exceed 255 characters"),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    error: `File type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
  }),
  size: z
    .number()
    .int()
    .positive("File is empty")
    .max(MAX_FILE_SIZE, `File exceeds the ${maxFileSizeMb}MB limit`),
});

const presignUploadBody = z.object({
  files: z
    .array(presignFile)
    .min(1, "At least one file is required")
    .max(MAX_FILES, `Cannot upload more than ${MAX_FILES} files at once`),
});

// The client echoes back the keys it was given, plus the original filename for
// display. mimeType/size are deliberately absent — the server reads the real
// values from R2 rather than accepting the client's numbers.
const attachmentRef = z.object({
  key: z.string().trim().min(1, "Attachment key is required"),
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename cannot exceed 255 characters"),
});

const createApprovalBody = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  description: richText("Description", 2000),
  date: requiredDate("Date"),
  attachments: z
    .array(attachmentRef)
    .min(1, "At least one attachment is required")
    .max(MAX_FILES, `Cannot attach more than ${MAX_FILES} files`),

  // Optional: email these directors as soon as the request is created. Absent
  // or empty means "submit quietly" — the request still lands in the director
  // queue, it just does not push a notification.
  //
  // The ids are only *claimed* to be directors here; the service re-reads each
  // one and drops anyone who is not an active, approved director, so a crafted
  // payload cannot use this endpoint to mail arbitrary users.
  notifyDirectors: z
    .array(objectId)
    .max(MAX_NOTIFY_RECIPIENTS, `Cannot notify more than ${MAX_NOTIFY_RECIPIENTS} directors at once`)
    .optional()
    .default([]),
});

// The standalone Notify action on an existing request. Same recipient rules as
// above, but at least one is required — sending to nobody is not a thing the
// user can have meant.
const notifyBody = z.object({
  directorIds: z
    .array(objectId)
    .min(1, "Select at least one director to notify")
    .max(MAX_NOTIFY_RECIPIENTS, `Cannot notify more than ${MAX_NOTIFY_RECIPIENTS} directors at once`),
});

const getApprovalsQuery = paginationQuery.extend({
  status: z.enum(Object.values(APPROVAL_STATUS)).optional(),
  // Directors see every request by default; `mine=true` narrows to their own.
  mine: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .optional(),
  search: z.string().trim().max(200).optional(),
});

const rejectApprovalBody = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "A rejection reason is required")
    .max(1000, "Rejection reason cannot exceed 1000 characters"),
});

const bulkApproveBody = z.object({
  // Explicit ids only — never "approve everything pending". The director must
  // be approving the exact rows the screen showed them, not whatever happens to
  // be pending by the time the request lands.
  ids: z
    .array(objectId)
    .min(1, "Select at least one request to approve")
    .max(100, "Cannot approve more than 100 requests at once"),
});

// Same `mine` semantics as getApprovalsQuery, so the tiles and the list they
// sit above can never be scoped differently.
const statsQuery = z.object({
  mine: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .optional(),
});

const attachmentParams = z.object({
  id: objectId,
  // The key is URL-encoded by the client; Express decodes it into this param.
  key: z.string().min(1, "Attachment key is required"),
});

module.exports = {
  presignUploadBody,
  notifyBody,
  createApprovalBody,
  getApprovalsQuery,
  rejectApprovalBody,
  bulkApproveBody,
  statsQuery,
  attachmentParams,
  idParam,
};
