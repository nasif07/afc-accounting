const fs = require("fs");
const path = require("path");
const logger = require("./logger");

/**
 * The logo every server-generated report prints: the payslip (PDF + Word), the
 * bank book statement and the bank reconciliation statement.
 *
 * Two things this fixes over the per-file copies it replaces:
 *
 *  1. It uses the full logo (crest + wordmark), not the compact mark that
 *     belongs to the sidebar and login screen.
 *  2. It resolves a path that actually exists in production. The backend image
 *     is built with `context: ./backend` (docker-compose), so ../../frontend is
 *     NOT in the container — every generator pointing at frontend/public
 *     silently produced logo-less PDFs on the server. src/assets ships with the
 *     image; the frontend path is kept only as a local-development fallback.
 */
const LOGO_CANDIDATES = [
  path.resolve(__dirname, "../assets/afc-full-logo.jpg"),
  path.resolve(__dirname, "../../../frontend/public/afc-full-logo.jpg"),
];

/**
 * @param {string} [orgLogo] Explicit path configured in Settings; wins if it exists.
 * @returns {string|null} An existing file path, or null when nothing resolves.
 */
const resolveReportLogoPath = (orgLogo) => {
  if (orgLogo && fs.existsSync(orgLogo)) return orgLogo;

  return LOGO_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || null;
};

// 758x564 — landscape. Callers should set width and let height follow, or the
// artwork stretches.
const REPORT_LOGO_ASPECT = 758 / 564;

// ── Uploaded logos ─────────────────────────────────────────────────────────

/**
 * Bytes for the logo a document should print, as { data: Buffer, type }.
 *
 * Returning a Buffer rather than a path is what lets an uploaded logo work at
 * all. The bucket is private and the object lives in R2, so there is no file
 * for `doc.image(path)` or `fs.readFileSync` to open — and the old contract
 * failed in the worst possible way: `fs.existsSync(<r2 key>)` is simply false,
 * so every generator would quietly fall back to the bundled artwork and print
 * the wrong logo without erroring.
 *
 * `type` is the bare extension ("png"/"jpg"/"webp") because that is what the
 * docx image API wants; pdfkit infers the format from the buffer itself.
 */

// One entry, because there is one logo. Keyed by object key so a new upload is
// picked up on the very next request — the TTL only bounds staleness for the
// case nothing in the app does (overwriting a key in place).
let cache = null;

const { ORG_LOGO } = require("../config/constants");

const extensionOf = (keyOrPath) => {
  const ext = path.extname(keyOrPath || "").toLowerCase().replace(".", "");
  // Word rejects "jpeg" as an image type; pdfkit does not care either way.
  return ext === "jpeg" ? "jpg" : ext;
};

const readBundledLogo = () => {
  const filePath = resolveReportLogoPath();
  if (!filePath) return null;
  return { data: fs.readFileSync(filePath), type: extensionOf(filePath) };
};

/**
 * @param {object} orgInfo settings projection — orgLogoKey wins over orgLogo
 * @returns {Promise<{data: Buffer, type: string}|null>}
 */
const loadOrgLogo = async (orgInfo = {}) => {
  const key = orgInfo.orgLogoKey;

  // No upload: the hand-typed path if it resolves, otherwise the bundled mark.
  if (!key) {
    const legacy = resolveReportLogoPath(orgInfo.orgLogo);
    if (!legacy) return null;
    return { data: fs.readFileSync(legacy), type: extensionOf(legacy) };
  }

  if (cache && cache.key === key && Date.now() - cache.at < ORG_LOGO.CACHE_TTL_MS) {
    return cache.value;
  }

  try {
    // Required lazily: r2.service pulls in the AWS SDK, and this module is
    // also loaded by paths that never touch object storage.
    const r2 = require("../services/r2.service");
    const data = await r2.getObjectBuffer(key);
    const value = { data, type: extensionOf(key) };
    cache = { key, at: Date.now(), value };
    return value;
  } catch (error) {
    // A logo is decoration; a payslip is not. Falling back to the bundled mark
    // keeps documents generating when R2 is unreachable or the object has been
    // deleted out from under us, and the log says which happened.
    logger.error({ err: error, key }, "Could not load the uploaded org logo — falling back to the bundled one");
    return readBundledLogo();
  }
};

module.exports = { resolveReportLogoPath, loadOrgLogo, REPORT_LOGO_ASPECT };
