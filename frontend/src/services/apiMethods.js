import api from "./api";

// ==================== DASHBOARD ====================
export const dashboardAPI = {
  getSummary: () => api.get("/dashboard/summary"),
};

// ==================== STUDENTS ====================
export const studentAPI = {
  getAll: (params) => api.get("/students", { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post("/students", data),
  update: (id, data) => api.patch(`/students/${id}`, data),
  updateFee: (id, data) => api.patch(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  bulkImport: (data) => api.post("/students/bulk-import", data),
};

// ==================== PAYROLL ====================
export const payrollAPI = {
  getAll: (params, config = {}) => api.get("/payroll", { ...config, params }),
  getById: (id) => api.get(`/payroll/${id}`),
  create: (data) => api.post("/payroll", data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  delete: (id) => api.delete(`/payroll/${id}`),
  approve: (id) => api.put(`/payroll/${id}/approve`),
  reject: (id, data) => api.put(`/payroll/${id}/reject`, data),
  markAsPaid: (id, data) => api.put(`/payroll/${id}/mark-paid`, data),
  // format: "pdf" (archival copy) or "docx" (editable Word file)
  generatePayslip: (id, format = "pdf") =>
    api.get(`/payroll/${id}/payslip`, { params: { format }, responseType: "blob" }),
};

// ==================== ACCOUNTING (JOURNAL ENTRIES) ====================
export const accountingAPI = {
  getAll: (params) => api.get("/accounting/journal-entries", { params }),
  getById: (id) => api.get(`/accounting/journal-entries/${id}`),
  create: (data) => api.post("/accounting/journal-entries", data),
  update: (id, data) => api.put(`/accounting/journal-entries/${id}`, data),
  delete: (id) => api.delete(`/accounting/journal-entries/${id}`),
  approve: (id) => api.patch(`/accounting/journal-entries/${id}/approve`),
  reject: (id, data) =>
    api.patch(`/accounting/journal-entries/${id}/reject`, data),
  getLedger: (accountId, params, config = {}) =>
    api.get(`/accounting/journal-entries/ledger/${accountId}`, { params, ...config }),
};

// ==================== CHART OF ACCOUNTS ====================
export const coaAPI = {
  getAll: (params) => api.get("/accounts", { params }),
  getLeafNodes: () => api.get("/accounts/leaf-nodes"),
  getById: (id) => api.get(`/accounts/${id}`),
  getBalance: (id) => api.get(`/accounts/${id}/balance`),
  create: (data) => api.post("/accounts", data),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
  archive: (id) => api.patch(`/accounts/${id}/archive`),
};

// ==================== BANK ====================
export const bankAPI = {
  getAll: (params) => api.get("/bank", { params }),
  getById: (id) => api.get(`/bank/${id}`),
  create: (data) => api.post("/bank", data),
  update: (id, data) => api.put(`/bank/${id}`, data),
  delete: (id) => api.delete(`/bank/${id}`),
  // `order` is the full list of bank account ids in the order they should
  // render on the Bank & Cash screen.
  reorder: (order) => api.patch("/bank/reorder", { order }),
  getTransactions: (id, params, config = {}) =>
    api.get(`/bank/${id}/transactions`, { ...config, params }),
  getReport: (id, params) => api.get(`/bank/${id}/report`, { params }),
  getTotalBalance: () => api.get("/bank/report/total-balance"),
  // FDR accounts (children of the 1100 head) with balance + transaction count.
  getFdrSummary: () => api.get("/bank/report/fdr-summary"),
};

// ==================== BANK BOOK / BANK STATEMENT ====================
export const bankBookAPI = {
  create: (data) => api.post("/bank-book", data),
  cancel: (id, data) => api.patch(`/bank-book/${id}/cancel`, data),
  getStatement: (params, config = {}) =>
    api.get("/bank-book/statement", { ...config, params }),
  exportExcel: (params) =>
    api.get("/bank-book/export/excel", { params, responseType: "blob" }),
  exportPdf: (params) =>
    api.get("/bank-book/export/pdf", { params, responseType: "blob" }),
};

// ==================== BANK RECONCILIATION ====================
export const bankReconciliationAPI = {
  create: (data) => api.post("/bank-book/reconciliations", data),
  getAll: (params) => api.get("/bank-book/reconciliations", { params }),
  getById: (id) => api.get(`/bank-book/reconciliations/${id}`),
  updateBalances: (id, data) =>
    api.patch(`/bank-book/reconciliations/${id}/balances`, data),
  addAdjustmentLine: (id, type, line) =>
    api.post(`/bank-book/reconciliations/${id}/adjustment-lines`, { type, line }),
  removeAdjustmentLine: (id, type, lineId) =>
    api.delete(`/bank-book/reconciliations/${id}/adjustment-lines/${type}/${lineId}`),
  // Books one adjustment line into the ledger. Only the two postable
  // categories (bankCharges, bankCreditsNotInBooks) accept this.
  postAdjustmentLine: (id, type, lineId, contraAccount) =>
    api.post(
      `/bank-book/reconciliations/${id}/adjustment-lines/${type}/${lineId}/post`,
      contraAccount ? { contraAccount } : {},
    ),
  // Finalizing also posts every still-unposted adjustment, unless skipPosting.
  finalize: (id, force = false, skipPosting = false) =>
    api.post(`/bank-book/reconciliations/${id}/finalize`, { force, skipPosting }),
  delete: (id) => api.delete(`/bank-book/reconciliations/${id}`),
  exportPdf: (id) =>
    api.get(`/bank-book/reconciliations/${id}/export/pdf`, { responseType: "blob" }),
};

// ==================== PETTY CASH ====================
export const pettyCashAPI = {
  getTransactions: (params, config = {}) =>
    api.get("/petty-cash/transactions", { ...config, params }),

  getReport: (params) => api.get("/petty-cash/report", { params }),

  getAll: (params) => api.get("/petty-cash", { params }),

  getById: (id) => api.get(`/petty-cash/${id}`),

  create: (data) => api.post("/petty-cash", data),

  update: (id, data) =>
    api.put(`/petty-cash/${id}`, data),

  delete: (id) =>
    api.delete(`/petty-cash/${id}`),

};

// ==================== SETTINGS ====================
export const passwordAPI = {
  // Signed-in change. The server revokes every other session and clears this
  // browser's cookies, so the caller must send the user back to /login.
  change: (data) => api.patch("/auth/change-password", data),

  // Always resolves 200 with the same message whether or not the address has
  // an account — do not branch on the response to infer anything about it.
  forgot: (email) => api.post("/auth/forgot-password", { email }),

  // Public: the caller is by definition not logged in.
  reset: (token, password) => api.post("/auth/reset-password", { token, password }),
};

export const settingsAPI = {
  get: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),

  // ── Organisation logo (director only) ──────────────────────────────────
  // Two steps, like approval attachments: mint a presigned PUT, then commit
  // the key once the browser has uploaded straight to R2. See useOrgLogo.js.
  presignLogo: (file) => api.post("/settings/logo/presign", file),

  // Verifies the uploaded object against R2's own metadata and saves it.
  setLogo: (key) => api.patch("/settings/logo", { key }),

  // Drops the upload; reports fall back to the artwork bundled with the app.
  clearLogo: () => api.delete("/settings/logo"),
};

// ==================== SEARCH ====================
export const searchAPI = {
  // Cross-module search behind the header drawer. `config` carries the
  // AbortController signal so a superseded keystroke's request is cancelled
  // rather than racing the newer one.
  global: (q, config = {}) => api.get("/search", { ...config, params: { q } }),
  journalEntries: (params, config = {}) =>
    api.get("/search/journal-entries", { ...config, params }),
};

// ==================== AUDIT LOG ====================
export const auditAPI = {
  // Per-entity change log. Both entityType and entityId are required by the
  // backend route — this is not a global audit browser.
  getEntityLogs: (entityType, entityId, params) =>
    api.get("/audit-logs", { params: { entityType, entityId, ...params } }),
};

// ==================== APPROVAL REQUESTS ====================
// Standalone document-approval workflow (backend modules/approval). Not a
// journal entry: no ledger posting, no amount.
export const approvalAPI = {
  getAll: (params, config = {}) => api.get("/approvals", { ...config, params }),

  getById: (id) => api.get(`/approvals/${id}`),

  // Counts for the stat tiles. Scoped exactly like getAll, so the numbers
  // always describe the same rows the list below them shows.
  getStats: (params) => api.get("/approvals/stats", { params }),

  create: (data) => api.post("/approvals", data),

  delete: (id) => api.delete(`/approvals/${id}`),

  approve: (id) => api.patch(`/approvals/${id}/approve`),

  reject: (id, data) => api.patch(`/approvals/${id}/reject`, data),

  // The directors an accountant may email a request to. Active, approved
  // accounts only — the server filters, so this is never the full user list.
  getDirectors: () => api.get("/approvals/directors"),

  // Emails an existing pending request to the selected directors. Returns
  // sent/failed/skipped so a partial delivery can be reported honestly.
  notify: (id, directorIds) => api.post(`/approvals/${id}/notify`, { directorIds }),

  // Directors only. `ids` are the exact rows the screen displayed — the server
  // never approves "everything pending".
  bulkApprove: (ids) => api.post("/approvals/bulk-approve", { ids }),

  // Asks the API to mint presigned PUT URLs. The bytes then go straight from
  // the browser to Cloudflare R2 (see uploadToR2 in hooks/useApprovals.js) —
  // deliberately NOT through this axios instance, which would attach cookies
  // and the API base URL to a third-party request.
  presignUploads: (files) => api.post("/approvals/attachments/presign", { files }),

  // Short-lived presigned GET for one attachment. The key contains slashes, so
  // it is encoded into a single path segment and decoded server-side.
  getAttachmentUrl: (id, key) =>
    api.get(`/approvals/${id}/attachments/${encodeURIComponent(key)}`),
};
