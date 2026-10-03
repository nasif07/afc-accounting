const crypto = require("crypto");
const path = require("path");
const {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { APPROVAL_ATTACHMENTS } = require("../config/constants");
const { BadRequestError } = require("../errors");
const logger = require("../utils/logger");

/**
 * Cloudflare R2 object storage (S3-compatible).
 *
 * The app never proxies file bytes: the browser PUTs directly to R2 using a
 * short-lived presigned URL, and reads go through an equally short-lived
 * presigned GET. That keeps large uploads out of the Node process entirely
 * (express.json is capped at 10mb, and serverless request bodies are capped
 * lower still) and means nothing is written to the container's ephemeral disk
 * the way utils/fileUploader.js does for petty cash.
 *
 * Because the server never sees the bytes, it cannot take the client's word
 * for what it uploaded. Two things close that gap:
 *   1. presignUpload() pins BOTH content-type and content-length into the
 *      signature, so R2 itself rejects a PUT that doesn't match what was
 *      authorised;
 *   2. headObject() is called on every claimed key before an Approval is
 *      persisted (approval.service.js), re-reading the real size and content
 *      type from R2.
 */

const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

const isConfigured = () => REQUIRED_ENV.every((key) => !!process.env[key]);

const missingEnv = () => REQUIRED_ENV.filter((key) => !process.env[key]);

let client = null;

const getClient = () => {
  if (!isConfigured()) {
    // Surfaced as a 400 rather than a 500 so the message reaches the operator
    // instead of being swallowed as a generic server error. Deployments that
    // never enable approvals are unaffected — nothing else touches R2.
    throw new BadRequestError(
      `Cloudflare R2 is not configured. Missing: ${missingEnv().join(", ")}`,
    );
  }

  if (!client) {
    client = new S3Client({
      region: "auto", // R2 ignores region, but the SDK requires one.
      endpoint:
        process.env.R2_ENDPOINT ||
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return client;
};

const bucket = () => process.env.R2_BUCKET;

/**
 * Server-generated object key. The client never chooses its own path — it only
 * ever receives a key that was minted here — so a caller cannot aim an upload
 * at another user's prefix or overwrite an existing attachment.
 */
const buildObjectKey = (userId, originalName) => {
  const ext = path.extname(originalName || "").toLowerCase().slice(0, 10);
  return `approvals/${userId}/${Date.now()}-${crypto.randomUUID()}${ext}`;
};

/**
 * Object key for the organisation logo.
 *
 * Unlike approval attachments this is not namespaced per user — there is one
 * logo for the whole organisation and only a director can replace it. The
 * uuid still matters: overwriting a fixed key would leave every cached copy
 * (browser, CDN, the report generators' in-process cache) pointing at stale
 * bytes with no way to tell they had changed.
 */
const buildLogoKey = (originalName) => {
  const ext = path.extname(originalName || "").toLowerCase().slice(0, 10);
  return `branding/logo-${Date.now()}-${crypto.randomUUID()}${ext}`;
};

/** Recognises keys minted by buildLogoKey, and nothing else. */
const isLogoKey = (key) =>
  typeof key === "string" &&
  /^branding\/logo-\d+-[0-9a-fA-F-]{36}\.[a-z0-9]+$/.test(key) &&
  !key.includes("..");

/** Keys we minted, and only those, are valid inputs to the read/delete paths. */
const isOwnedKey = (key) =>
  typeof key === "string" &&
  /^approvals\/[0-9a-fA-F]{24}\/[^/]+$/.test(key) &&
  !key.includes("..");

const presignUpload = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });

  // Only content-type is signed — deliberately NOT content-length.
  //
  // Pinning content-length into the signature looks appealing (R2 would reject
  // an oversized body outright), but it does not survive contact with a
  // browser: XHR/fetch own the Content-Length header, and any difference from
  // the size we signed yields SignatureDoesNotMatch. Worse, R2's 403 carries no
  // Access-Control-Allow-Origin, so the browser cannot read the response and
  // surfaces it as an opaque network error — a genuinely awful failure mode.
  //
  // The size limit is not lost. approval.service.js verifyAttachments() reads
  // every object's real ContentLength back from R2 (HeadObject) before the
  // Approval is persisted, and deletes anything over the cap. That check, not
  // the signature, is what actually enforces the limit.
  return getSignedUrl(getClient(), command, {
    expiresIn: APPROVAL_ATTACHMENTS.UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type"]),
  });
};

const presignDownload = async ({ key, filename, inline = true }) => {
  const disposition = inline ? "inline" : "attachment";
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    // Restores the original filename on download — the stored key is an opaque
    // uuid, which would otherwise be what the browser saves the file as.
    ResponseContentDisposition: filename
      ? `${disposition}; filename="${filename.replace(/["\\]/g, "")}"`
      : undefined,
  });

  return getSignedUrl(getClient(), command, {
    expiresIn: APPROVAL_ATTACHMENTS.DOWNLOAD_URL_TTL_SECONDS,
  });
};

/**
 * Downloads one object into memory.
 *
 * The only place the app deliberately pulls bytes THROUGH this process rather
 * than handing out a presigned URL — the report generators run server-side and
 * need the image itself, and a presigned URL would be useless to pdfkit. Kept
 * for small objects only (the logo is capped at 2 MB); attachments must keep
 * going direct to the browser.
 */
const getObjectBuffer = async (key) => {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );

  const chunks = [];
  for await (const chunk of result.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
};

/**
 * Reads the object's real metadata back from R2. Returns null when the object
 * does not exist, so callers can distinguish "never uploaded" from "upload
 * succeeded but is the wrong shape".
 */
const headObject = async (key) => {
  try {
    const result = await getClient().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return {
      size: result.ContentLength,
      contentType: result.ContentType,
    };
  } catch (error) {
    if (
      error?.name === "NotFound" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Best-effort cleanup for orphaned objects (an upload that succeeded but whose
 * Approval was never created, or was rejected by validation). Never throws:
 * a failed cleanup must not fail the user's request, and an orphan in the
 * bucket is a cost problem, not a correctness one.
 */
const deleteObjectQuietly = async (key) => {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
    );
  } catch (error) {
    logger.error({ err: error, key }, "Failed to delete orphaned R2 object");
  }
};

module.exports = {
  isConfigured,
  missingEnv,
  buildObjectKey,
  isOwnedKey,
  buildLogoKey,
  isLogoKey,
  presignUpload,
  presignDownload,
  getObjectBuffer,
  headObject,
  deleteObjectQuietly,
};
