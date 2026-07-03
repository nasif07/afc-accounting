const { z } = require("zod");
const { idParam, paginationQuery } = require("./common");

const STATUS_VALUES = ["active", "inactive", "suspended"];

const parentSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
  })
  .optional();

const createStudentBody = z.object({
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  name: z.string().trim().min(1, "Name is required"),
  class: z.string().trim().min(1, "Class is required"),
  section: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  profession: z.string().trim().optional(),
  parent: parentSchema,
  address: z.string().trim().optional(),
  dateOfBirth: z.coerce.date().optional(),
  admissionDate: z.coerce.date().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  notes: z.string().trim().optional(),
});

// Mirrors the controller's own allowedUpdates whitelist — same fields,
// now with real type checking instead of accepting anything.
const updateStudentBody = z.object({
  name: z.string().trim().min(1).optional(),
  class: z.string().trim().min(1).optional(),
  section: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  address: z.string().trim().optional(),
});

const getAllStudentsQuery = paginationQuery.extend({
  class: z.string().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  search: z.string().trim().optional(),
});

// Preserves the controller's existing dual-shape acceptance
// (a raw array, or { students: [...] }) without over-constraining
// individual record shape — the service already reports per-record
// errors for bad rows and that granularity shouldn't be lost here.
const studentRecord = z.record(z.string(), z.any());
const bulkImportStudentsBody = z.union([
  z.array(studentRecord).min(1, "Students data must be a non-empty array"),
  z.object({
    students: z.array(studentRecord).min(1, "Students data must be a non-empty array"),
  }),
]);

module.exports = {
  createStudentBody,
  updateStudentBody,
  getAllStudentsQuery,
  bulkImportStudentsBody,
  idParam,
};
