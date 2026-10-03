const { z } = require("zod");
const { ORG_LOGO } = require("../config/constants");

const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = ORG_LOGO;

const maxLogoMb = Math.round(MAX_FILE_SIZE / 1024 / 1024);

/**
 * The request for a presigned logo upload. Every value here is still a *claim*
 * — the browser uploads straight to R2, so the server only learns what really
 * landed when settings.service.js re-reads it with HeadObject before saving.
 * Checking the claim anyway means an obviously wrong file is rejected before
 * anyone spends bandwidth on it.
 */
const presignLogoBody = z.object({
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename cannot exceed 255 characters"),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    error: "Logo must be a PNG, JPG or WEBP image",
  }),
  size: z
    .number()
    .int()
    .positive("File is empty")
    .max(MAX_FILE_SIZE, `Logo exceeds the ${maxLogoMb}MB limit`),
});

/**
 * Commits an uploaded object as the organisation logo. Only the key comes
 * back from the client, and it is only ever a key this server minted —
 * r2.isLogoKey() rejects anything else, so this cannot be pointed at an
 * approval attachment or an arbitrary path in the bucket.
 */
const setLogoBody = z.object({
  key: z.string().trim().min(1, "Upload key is required"),
});

module.exports = { presignLogoBody, setLogoBody };
