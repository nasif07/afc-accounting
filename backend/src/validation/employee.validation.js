const { z } = require("zod");
const { idParam, paginationQuery, requiredDate } = require("./common");

const VALID_STATUSES = ["active", "inactive", "on-leave", "resigned"];

const createEmployeeBody = z.object({
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  name: z.string().trim().min(1, "Name is required"),
  designation: z.string().trim().min(1, "Designation is required"),
  // Required on the Mongoose schema already — validating it here just
  // surfaces the same requirement earlier, as a clean 400 instead of a
  // Mongoose ValidationError.
  dateOfJoining: requiredDate("Date of joining"),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  dateOfBirth: z.coerce.date().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactRelationship: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  emergencyContactAltPhone: z.string().trim().optional(),
  emergencyContactAddress: z.string().trim().optional(),
});

// Mirrors the exact field set the controller already whitelists for update.
const updateEmployeeBody = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  designation: z.string().trim().min(1).optional(),
  department: z.string().trim().optional(),
  dateOfJoining: z.coerce.date().optional(),
  dateOfBirth: z.coerce.date().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactRelationship: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  emergencyContactAltPhone: z.string().trim().optional(),
  emergencyContactAddress: z.string().trim().optional(),
});

const getAllEmployeesQuery = paginationQuery.extend({
  department: z.string().optional(),
  designation: z.string().optional(),
  status: z.enum(VALID_STATUSES).optional(),
  search: z.string().trim().optional(),
});

module.exports = {
  createEmployeeBody,
  updateEmployeeBody,
  getAllEmployeesQuery,
  idParam,
};
