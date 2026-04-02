import api from './api';

// ==================== AUTHENTICATION ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// ==================== STUDENTS ====================
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  bulkImport: (data) => api.post('/students/bulk-import', data),
  search: (query) => api.get('/students/search', { params: { query } }),
};

// ==================== RECEIPTS (FEE COLLECTION) ====================
export const receiptAPI = {
  getAll: (params) => api.get('/receipts', { params }),
  getById: (id) => api.get(`/receipts/${id}`),
  create: (data) => api.post('/receipts', data),
  update: (id, data) => api.put(`/receipts/${id}`, data),
  delete: (id) => api.delete(`/receipts/${id}`),
  approve: (id) => api.post(`/receipts/${id}/approve`),
  reject: (id, data) => api.post(`/receipts/${id}/reject`, data),
  generatePDF: (id) => api.get(`/receipts/${id}/pdf`, { responseType: 'blob' }),
  search: (query) => api.get('/receipts/search', { params: { query } }),
};

// ==================== EXPENSES ====================
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  approve: (id) => api.post(`/expenses/${id}/approve`),
  reject: (id, data) => api.post(`/expenses/${id}/reject`, data),
  search: (query) => api.get('/expenses/search', { params: { query } }),
};

// ==================== VENDORS ====================
export const vendorAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  search: (query) => api.get('/vendors/search', { params: { query } }),
};

// ==================== EMPLOYEES ====================
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  search: (query) => api.get('/employees/search', { params: { query } }),
};

// ==================== PAYROLL ====================
export const payrollAPI = {
  getAll: (params) => api.get('/payroll', { params }),
  getById: (id) => api.get(`/payroll/${id}`),
  create: (data) => api.post('/payroll', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  delete: (id) => api.delete(`/payroll/${id}`),
  approve: (id) => api.post(`/payroll/${id}/approve`),
  markAsPaid: (id, data) => api.post(`/payroll/${id}/mark-paid`, data),
  generatePayslip: (id) => api.get(`/payroll/${id}/payslip`, { responseType: 'blob' }),
  search: (query) => api.get('/payroll/search', { params: { query } }),
};

// ==================== ACCOUNTING (JOURNAL ENTRIES) ====================
export const accountingAPI = {
  getAll: (params) => api.get('/accounting/journal-entries', { params }),
  getById: (id) => api.get(`/accounting/journal-entries/${id}`),
  create: (data) => api.post('/accounting/journal-entries', data),
  update: (id, data) => api.put(`/accounting/journal-entries/${id}`, data),
  delete: (id) => api.delete(`/accounting/journal-entries/${id}`),
  approve: (id) => api.patch(`/accounting/journal-entries/${id}/approve`),
  reject: (id, data) => api.patch(`/accounting/journal-entries/${id}/reject`, data),
  getPendingApprovals: () => api.get('/accounting/journal-entries/pending-approvals'),
  getLedger: (accountId, params) => api.get(`/accounting/journal-entries/ledger/${accountId}`, { params }),
  getAccountBalance: (accountId) => api.get(`/accounting/journal-entries/balance/${accountId}`),
  getEntriesByAccount: (accountId) => api.get(`/accounting/journal-entries/account/${accountId}`),
};

// ==================== CHART OF ACCOUNTS ====================
export const coaAPI = {
  getAll: (params) => api.get('/accounts', { params }),
  getTree: () => api.get('/accounts/tree'),
  getLeafNodes: () => api.get('/accounts/leaf-nodes'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
};

// ==================== BANK ====================
export const bankAPI = {
  getAll: (params) => api.get('/bank', { params }),
  getById: (id) => api.get(`/bank/${id}`),
  create: (data) => api.post('/bank', data),
  update: (id, data) => api.put(`/bank/${id}`, data),
  delete: (id) => api.delete(`/bank/${id}`),
  reconcile: (id, data) => api.put(`/bank/${id}/reconcile`, data),
  getTotalBalance: () => api.get('/bank/report/total-balance'),
};

// ==================== REPORTS ====================
export const reportAPI = {
  incomeStatement: (params) => api.get('/accounting/journal-entries/income-statement', { params }),
  balanceSheet: (params) => api.get('/accounting/journal-entries/balance-sheet', { params }),
  trialBalance: (params) => api.get('/accounting/journal-entries/trial-balance', { params }),
  exportPDF: (reportType, params) => api.get(`/reports/${reportType}/export-pdf`, { params, responseType: 'blob' }),
  exportExcel: (reportType, params) => api.get(`/reports/${reportType}/export-excel`, { params, responseType: 'blob' }),
};

// ==================== AUDIT LOGS ====================
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
};

// ==================== SEARCH ====================
export const searchAPI = {
  global: (query) => api.get('/search/global', { params: { query } }),
  receipts: (query) => api.get('/search/receipts', { params: { query } }),
  expenses: (query) => api.get('/search/expenses', { params: { query } }),
  students: (query) => api.get('/search/students', { params: { query } }),
  byAmount: (min, max) => api.get('/search/by-amount', { params: { min, max } }),
  byDateRange: (startDate, endDate) => api.get('/search/by-date', { params: { startDate, endDate } }),
};

// ==================== SETTINGS ====================
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getApprovalLimits: () => api.get('/settings/approval-limits'),
  updateApprovalLimits: (data) => api.put('/settings/approval-limits', data),
};
