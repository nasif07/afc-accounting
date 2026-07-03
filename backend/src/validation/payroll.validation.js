const { z } = require("zod");
const { SALARY_TYPES, APPROVAL_STATUS } = require("../config/constants");
const { objectId, idParam, paginationQuery, requiredDate } = require("./common");

const nonNegative = (label) =>
  z.coerce.number().min(0, `${label} cannot be negative`);

const createPayrollBody = z.object({
  employee: objectId,
  month: z.string().min(1, "Month is required"),
  year: z.coerce.number().int().min(2000).max(2100),
  salaryType: z.enum(Object.values(SALARY_TYPES)).optional(),
  baseSalary: nonNegative("Base salary"),
  allowances: nonNegative("Allowances").optional(),
  bonus: nonNegative("Bonus").optional(),
  deductions: nonNegative("Deductions").optional(),
  leaveDeduction: nonNegative("Leave deduction").optional(),
  leavesTaken: nonNegative("Leaves taken").optional(),
  workingDays: nonNegative("Working days").optional(),
  attendancePercentage: z.coerce.number().min(0).max(100).optional(),
  description: z.string().trim().optional(),
});

// Approval/financial-outcome fields (approvalStatus, approvedBy,
// approvalDate, rejectionReason, paymentStatus, journalEntryId,
// accountingStatus) are intentionally NOT part of this shape. Approval
// state changes only go through PUT /:id/approve and /:id/reject
// (director-only); payment state only through PUT /:id/mark-paid. Unknown
// keys (including those) are silently stripped since .passthrough() is
// not used — a request that includes them succeeds but they're ignored.
const updatePayrollBody = z.object({
  month: z.string().min(1).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  salaryType: z.enum(Object.values(SALARY_TYPES)).optional(),
  baseSalary: nonNegative("Base salary").optional(),
  allowances: nonNegative("Allowances").optional(),
  bonus: nonNegative("Bonus").optional(),
  deductions: nonNegative("Deductions").optional(),
  leaveDeduction: nonNegative("Leave deduction").optional(),
});

const rejectPayrollBody = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
});

const markPayrollAsPaidBody = z.object({
  paymentDate: requiredDate("Payment date"),
  paymentMode: z.string().min(1, "Payment mode is required"),
  referenceNumber: z.string().trim().optional(),
});

const getAllPayrollQuery = paginationQuery.extend({
  employee: objectId.optional(),
  month: z.string().optional(),
  year: z.coerce.number().int().optional(),
  approvalStatus: z.enum(Object.values(APPROVAL_STATUS)).optional(),
  paymentStatus: z.string().optional(),
});

module.exports = {
  createPayrollBody,
  updatePayrollBody,
  rejectPayrollBody,
  markPayrollAsPaidBody,
  getAllPayrollQuery,
  idParam,
};
