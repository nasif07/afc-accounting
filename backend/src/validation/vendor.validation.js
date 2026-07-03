const { z } = require("zod");
const { idParam, paginationQuery } = require("./common");

const VENDOR_TYPES = ["supplier", "contractor", "service-provider", "other"];

const createVendorBody = z.object({
  vendorCode: z.string().trim().min(1, "Vendor code is required"),
  vendorName: z.string().trim().min(1, "Vendor name is required"),
  vendorType: z.enum(VENDOR_TYPES),
  email: z.string().trim().email("Please provide a valid email").optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").optional(),
  notes: z.string().trim().optional(),
});

// vendor.service.updateVendor already rejects immutable fields
// (vendorCode/createdBy/createdAt) with a specific error message —
// passthrough here so that check still runs against the fields as sent.
const updateVendorBody = z
  .object({
    vendorName: z.string().trim().min(1).optional(),
    vendorType: z.enum(VENDOR_TYPES).optional(),
    email: z.string().trim().email("Please provide a valid email").optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    zipCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
    gstNumber: z.string().trim().optional(),
    panNumber: z.string().trim().optional(),
    bankAccountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    paymentTerms: z.string().trim().optional(),
    creditLimit: z.coerce.number().min(0).optional(),
    notes: z.string().trim().optional(),
  })
  .passthrough();

const getAllVendorsQuery = paginationQuery.extend({
  vendorType: z.enum(VENDOR_TYPES).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  search: z.string().trim().optional(),
});

module.exports = {
  createVendorBody,
  updateVendorBody,
  getAllVendorsQuery,
  idParam,
};
