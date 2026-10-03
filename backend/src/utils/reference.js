const { SOURCE_MODULES, SOURCE_MODULE_LABELS } = require("../config/constants");

// Opening balance journals store `OB-<accountId>` in referenceNumber. That
// string is not a document number a person can look up — it is an identity
// key, and coa.service.getOpeningBalanceJournalQuery still matches on it to
// find opening-balance journals written before `referenceAccount` existed.
// So it must keep its stored value and be translated only on the way out;
// rewriting it in the database would orphan those legacy journals from the
// dedupe/lookup path.
const OBJECT_ID = "[0-9a-f]{24}";
const BARE_OBJECT_ID = new RegExp(`^${OBJECT_ID}$`, "i");
const OPENING_BALANCE_REFERENCE = new RegExp(`^OB-${OBJECT_ID}$`, "i");

/**
 * Render a journal entry's reference for display.
 *
 * Returns "Opening Balance" for opening-balance journals, an empty string for
 * a reference that is only a raw ObjectId (nothing useful to show — callers
 * already fall back to the voucher number), and the stored value otherwise.
 *
 * @param {object} entry Journal entry (plain object or toJSON'd document).
 * @returns {string}
 */
const formatReferenceNumber = (entry = {}) => {
  const raw = String(entry.referenceNumber ?? "").trim();

  // Checked before the empty guard: an opening balance journal reads
  // "Opening Balance" whether or not it carries the legacy reference string.
  if (
    entry.sourceModule === SOURCE_MODULES.OPENING_BALANCE ||
    OPENING_BALANCE_REFERENCE.test(raw)
  ) {
    return SOURCE_MODULE_LABELS[SOURCE_MODULES.OPENING_BALANCE];
  }

  if (!raw) return "";
  if (BARE_OBJECT_ID.test(raw)) return "";

  return raw;
};

module.exports = { formatReferenceNumber };
