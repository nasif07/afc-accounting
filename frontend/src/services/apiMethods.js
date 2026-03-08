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
  getAll: (params) => api.get('/accounting', { params }),
  getById: (id) => api.get(`/accounting/${id}`),
  create: (data) => api.post('/accounting', data),
  update: (id, data) => api.put(`/accounting/${id}`, data),
  delete: (id) => api.delete(`/accounting/${id}`),
  approve: (id) => api.post(`/accounting/${id}/approve`),
  reject: (id, data) => api.post(`/accounting/${id}/reject`, data),
  search: (query) => api.get('/accounting/search', { params: { query } }),
};

// ==================== CHART OF ACCOUNTS ====================
export const coaAPI = {
  getAll: (params) => api.get('/chart-of-accounts', { params }),
  getById: (id) => api.get(`/chart-of-accounts/${id}`),
  create: (data) => api.post('/chart-of-accounts', data),
  update: (id, data) => api.put(`/chart-of-accounts/${id}`, data),
  delete: (id) => api.delete(`/chart-of-accounts/${id}`),
  getBalance: (id) => api.get(`/chart-of-accounts/${id}/balance`),
};

// ==================== BANK ====================
export const bankAPI = {
  getAll: (params) => api.get('/bank', { params }),
  getById: (id) => api.get(`/bank/${id}`),
  create: (data) => api.post('/bank', data),
  update: (id, data) => api.put(`/bank/${id}`, data),
  delete: (id) => api.delete(`/bank/${id}`),
  reconcile: (id, data) => api.post(`/bank/${id}/reconcile`, data),
};

// ==================== REPORTS ====================
export const reportAPI = {
  incomeStatement: (params) => api.get('/reports/income-statement', { params }),
  balanceSheet: (params) => api.get('/reports/balance-sheet', { params }),
  cashFlow: (params) => api.get('/reports/cash-flow', { params }),
  trialBalance: (params) => api.get('/reports/trial-balance', { params }),
  receiptPayment: (params) => api.get('/reports/receipt-payment', { params }),
  exportPDF: (reportType, params) => api.get(`/reports/${reportType}/export-pdf`, { params, responseType: 'blob' }),
  exportExcel: (reportType, params) => api.get(`/reports/${reportType}/export-excel`, { params, responseType: 'blob' }),
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
