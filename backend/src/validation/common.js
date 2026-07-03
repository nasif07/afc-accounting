const { z } = require("zod");

// Matches Mongoose ObjectId shape — used to reject malformed :id params
// before they reach Model.findById() and surface as an opaque CastError.
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const idParam = z.object({
  id: objectId,
});

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// z.coerce.date() on a missing/unparseable value produces a confusing
// "expected date, received Date" message (it coerces to an Invalid Date
// object first). This gives required date fields a clear message instead.
const requiredDate = (label = "Date") =>
  z.coerce.date({ error: `${label} is required and must be a valid date` });

module.exports = {
  objectId,
  idParam,
  paginationQuery,
  requiredDate,
};
