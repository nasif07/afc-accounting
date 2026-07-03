const { z } = require("zod");
const { FEE_TYPES, PAYMENT_MODES, APPROVAL_STATUS } = require("../config/constants");
const { objectId, idParam, paginationQuery } = require("./common");

const amount = z.coerce.number().positive("Amount must be greater than 0");

const createReceiptBody = z.object({
  receiptNumber: z.string().min(1, "Receipt number is required"),
  student: objectId,
  feeType: z.enum(Object.values(FEE_TYPES)),
  amount,
  paymentMode: z.enum(Object.values(PAYMENT_MODES)),
  referenceNumber: z.string().trim().optional(),
  description: z.string().trim().optional(),
  chequeNumber: z.string().trim().optional(),
  chequeDate: z.coerce.date().optional(),
  bankName: z.string().trim().optional(),
  cardNumber: z.string().trim().optional(),
  transactionId: z.string().trim().optional(),
});

// Approval/financial-outcome fields (approvalStatus, approvedBy,
// approvalDate, rejectionReason, journalEntryId, accountingStatus) are
// intentionally NOT part of this shape. Approval state changes only go
// through PUT /:id/approve and /:id/reject (director-only). Unknown keys
// (including those) are silently stripped since .passthrough() is not
// used — a request that includes them succeeds but they're ignored.
const updateReceiptBody = z.object({
  receiptNumber: z.string().min(1).optional(),
  student: objectId.optional(),
  feeType: z.enum(Object.values(FEE_TYPES)).optional(),
  amount: amount.optional(),
  paymentMode: z.enum(Object.values(PAYMENT_MODES)).optional(),
  referenceNumber: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const rejectReceiptBody = z.object({
  rejectionReason: z.string().trim().min(1, "Rejection reason is required"),
});

const getAllReceiptsQuery = paginationQuery.extend({
  student: objectId.optional(),
  feeType: z.enum(Object.values(FEE_TYPES)).optional(),
  approvalStatus: z.enum(Object.values(APPROVAL_STATUS)).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

module.exports = {
  createReceiptBody,
  updateReceiptBody,
  rejectReceiptBody,
  getAllReceiptsQuery,
  idParam,
};
