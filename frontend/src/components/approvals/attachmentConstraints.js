// Client-side mirror of APPROVAL_ATTACHMENTS in
// backend/src/config/constants.js. Keeping these in a plain module (rather than
// alongside the dropzone component) keeps Fast Refresh working and gives the
// review page one shared formatter instead of its own copy.
//
// Everything here is UX only — the server re-enforces every one of these rules
// against Cloudflare's own object metadata in approval.service.js.

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES = 10;

// Both the MIME types and the bare extensions — Windows file pickers filter
// more reliably on extensions.
export const ACCEPT_ATTR = [
  ...ACCEPTED_MIME_TYPES,
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
].join(",");

export const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const isImageType = (type) => !!type?.startsWith("image/");
