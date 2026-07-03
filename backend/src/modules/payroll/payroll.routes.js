const express = require('express');
const PayrollController = require('./payroll.controller');
const auth = require('../../middleware/auth');
const { directorOnly, accountantOrDirector } = require('../../middleware/roleCheck');
const validate = require('../../validation/validate');
const {
  createPayrollBody,
  updatePayrollBody,
  rejectPayrollBody,
  markPayrollAsPaidBody,
  getAllPayrollQuery,
  idParam,
} = require('../../validation/payroll.validation');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  accountantOrDirector,
  validate({ body: createPayrollBody }),
  PayrollController.createPayroll,
);
router.get(
  '/',
  validate({ query: getAllPayrollQuery }),
  PayrollController.getAllPayroll,
);
router.get(
  '/:id',
  validate({ params: idParam }),
  PayrollController.getPayrollById,
);
router.put(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam, body: updatePayrollBody }),
  PayrollController.updatePayroll,
);
router.delete(
  '/:id',
  accountantOrDirector,
  validate({ params: idParam }),
  PayrollController.deletePayroll,
);

// Approval operations
router.put(
  '/:id/approve',
  directorOnly,
  validate({ params: idParam }),
  PayrollController.approvePayroll,
);
router.put(
  '/:id/reject',
  directorOnly,
  validate({ params: idParam, body: rejectPayrollBody }),
  PayrollController.rejectPayroll,
);

// Payment + payslip
router.put(
  '/:id/mark-paid',
  accountantOrDirector,
  validate({ params: idParam, body: markPayrollAsPaidBody }),
  PayrollController.markPayrollAsPaid,
);
router.get(
  '/:id/payslip',
  validate({ params: idParam }),
  PayrollController.generatePayslip,
);

module.exports = router;
