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

// ==================== RECEIPTS (FEE COLLECTION) ====================
export const receiptAPI = {
  getAll: (params) => api.get("/receipts", { params }),
  getById: (id) => api.get(`/receipts/${id}`),
  create: (data) => api.post("/receipts", data),
  update: (id, data) => api.put(`/receipts/${id}`, data),
  delete: (id) => api.delete(`/receipts/${id}`),
  approve: (id) => api.put(`/receipts/${id}/approve`),
  reject: (id, data) => api.put(`/receipts/${id}/reject`, data),
};

// ==================== PAYROLL ====================
export const payrollAPI = {
  getAll: (params) => api.get("/payroll", { params }),
  getById: (id) => api.get(`/payroll/${id}`),
  create: (data) => api.post("/payroll", data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  delete: (id) => api.delete(`/payroll/${id}`),
  approve: (id) => api.put(`/payroll/${id}/approve`),
  reject: (id, data) => api.put(`/payroll/${id}/reject`, data),
  markAsPaid: (id, data) => api.put(`/payroll/${id}/mark-paid`, data),
  generatePayslip: (id) =>
    api.get(`/payroll/${id}/payslip`, { responseType: "blob" }),
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
  getLedger: (accountId, params) =>
    api.get(`/accounting/journal-entries/ledger/${accountId}`, { params }),
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
  reconcile: (id, data) => api.put(`/bank/${id}/reconciliation`, data),
  getTransactions: (id, params) => api.get(`/bank/${id}/transactions`, { params }),
  getTotalBalance: () => api.get("/bank/report/total-balance"),
};

// ==================== BANK BOOK / BANK STATEMENT ====================
export const bankBookAPI = {
  create: (data) => api.post("/bank-book", data),
  cancel: (id, data) => api.patch(`/bank-book/${id}/cancel`, data),
  getStatement: (params) => api.get("/bank-book/statement", { params }),
  exportExcel: (params) =>
    api.get("/bank-book/export/excel", { params, responseType: "blob" }),
  exportPdf: (params) =>
    api.get("/bank-book/export/pdf", { params, responseType: "blob" }),
};

// ==================== REPORTS ====================
export const reportAPI = {
  incomeStatement: (params) =>
    api.get("/accounting/journal-entries/income-statement", { params }),
  balanceSheet: (params) =>
    api.get("/accounting/journal-entries/balance-sheet", { params }),
  trialBalance: (params) =>
    api.get("/accounting/journal-entries/trial-balance", { params }),
};

// ==================== PETTY CASH ====================
export const pettyCashAPI = {
  getTransactions: (params) => api.get("/petty-cash/transactions", { params }),

  getReport: (params) => api.get("/petty-cash/report", { params }),

  getAll: (params) => api.get("/petty-cash", { params }),

  getById: (id) => api.get(`/petty-cash/${id}`),

  create: (data) => api.post("/petty-cash", data),

  update: (id, data) =>
    api.put(`/petty-cash/${id}`, data),

  delete: (id) =>
    api.delete(`/petty-cash/${id}`),

};

// ==================== SEARCH ====================
export const searchAPI = {
  global: (query) => api.get("/search/global", { params: { query } }),
  receipts: (query) => api.get("/search/receipts", { params: { query } }),
  expenses: (query) => api.get("/search/expenses", { params: { query } }),
  students: (query) => api.get("/search/students", { params: { query } }),
  byAmount: (min, max) =>
    api.get("/search/amount-range", { params: { min, max } }),
};

// ==================== SETTINGS ====================
export const settingsAPI = {
  get: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),
};
