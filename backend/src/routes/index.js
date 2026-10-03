const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('../modules/auth/auth.routes');
const studentRoutes = require('../modules/students/student.routes');
const employeeRoutes = require('../modules/employees/employee.routes');
const payrollRoutes = require('../modules/payroll/payroll.routes');
const accountingRoutes = require('../modules/accounting/accounting.routes');
const coaRoutes = require('../modules/chartOfAccounts/coa.routes');
const bankRoutes = require('../modules/bank/bank.routes');
const bankBookRoutes = require('../modules/bankBook/bankBook.routes');
const bankReconciliationRoutes = require('../modules/bankBook/bankReconciliation.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const searchRoutes = require('../modules/search/search.routes');
const pettyCashRoutes = require('../modules/pettycash/pettycash.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const auditLogRoutes = require('../modules/audit/auditLog.routes');
const approvalRoutes = require('../modules/approval/approval.routes');

// Register routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/employees', employeeRoutes);
router.use('/payroll', payrollRoutes);
router.use('/accounting', accountingRoutes);
router.use('/accounts', coaRoutes);
router.use('/bank', bankRoutes);
router.use('/bank-book', bankBookRoutes);
router.use('/bank-book/reconciliations', bankReconciliationRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);
router.use('/petty-cash', pettyCashRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/approvals', approvalRoutes);

module.exports = router;
