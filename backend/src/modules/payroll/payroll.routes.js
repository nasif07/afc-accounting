const express = require('express');
const PayrollController = require('./payroll.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');

const router = express.Router();

router.use(auth);

router.post('/', accountantOrDirector, PayrollController.createPayroll);
router.get('/', PayrollController.getAllPayroll);
router.get('/:id', PayrollController.getPayrollById);
router.put('/:id', accountantOrDirector, PayrollController.updatePayroll);
router.delete('/:id', accountantOrDirector, PayrollController.deletePayroll);

// Approval operations
router.put('/:id/approve', directorOnly, PayrollController.approvePayroll);
router.put('/:id/reject', directorOnly, PayrollController.rejectPayroll);

// Payment operations
router.put('/:id/mark-paid', accountantOrDirector, PayrollController.markPayrollAsPaid);

// Reports
router.get('/report/summary', PayrollController.getPayrollSummary);
router.get('/:id/payslip', PayrollController.generatePayslip);

module.exports = router;
