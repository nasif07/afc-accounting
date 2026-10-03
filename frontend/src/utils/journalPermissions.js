// Edit/delete rules for journal entries, shared by the list and the details
// page so the two can't disagree about what a user may do.

// A journal entry stays editable for this long after creation, regardless of
// approval state. Mirrors EDIT_WINDOW_DAYS in accounting.service.js — the
// backend is the enforcing copy; this one only decides what the UI offers.
export const EDIT_WINDOW_DAYS = 3;
const EDIT_WINDOW_MS = EDIT_WINDOW_DAYS * 24 * 36e5;

// Approval state still governs deletion (the backend refuses to delete a
// posted entry) and the status badge — it is deliberately NOT what governs
// editing.
export const isEntryApproved = (entry) =>
  entry?.status === "posted" || entry?.approvalStatus === "approved";

// When the edit window closes, or null if the entry has no creation time.
export const editDeadline = (entry) => {
  if (!entry?.createdAt) return null;
  const created = new Date(entry.createdAt).getTime();
  return Number.isNaN(created) ? null : new Date(created + EDIT_WINDOW_MS);
};

export const canEditEntry = (entry, settings) => {
  if (!settings?.allowJournalEdit) return false;
  const deadline = editDeadline(entry);
  return Boolean(deadline) && Date.now() <= deadline.getTime();
};

export const editBlockedReason = (settings) =>
  settings?.allowJournalEdit
    ? "Editing window has closed"
    : "Editing is disabled by the Director";
