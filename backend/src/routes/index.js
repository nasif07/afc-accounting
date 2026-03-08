const express = require('express');
const router = express.Router();

// Import route files (to be created)
const authRoutes = require('../modules/auth/auth.routes');
// const userRoutes = require('../modules/users/user.routes');
const studentRoutes = require('../modules/students/student.routes');
const receiptRoutes = require('../modules/receipts/receipt.routes');
const expenseRoutes = require('../modules/expenses/expense.routes');
const vendorRoutes = require('../modules/vendors/vendor.routes');
const employeeRoutes = require('../modules/employees/employee.routes');
const payrollRoutes = require('../modules/payroll/payroll.routes');
const accountingRoutes = require('../modules/accounting/accounting.routes');
const coaRoutes = require('../modules/chartOfAccounts/coa.routes');
const bankRoutes = require('../modules/bank/bank.routes');
const reportRoutes = require('../modules/reports/report.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const searchRoutes = require('../modules/search/search.routes');

// Register routes
router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/receipts', receiptRoutes);
router.use('/expenses', expenseRoutes);
router.use('/vendors', vendorRoutes);
router.use('/employees', employeeRoutes);
router.use('/payroll', payrollRoutes);
router.use('/accounting', accountingRoutes);
router.use('/chart-of-accounts', coaRoutes);
router.use('/bank', bankRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);

module.exports = router;
