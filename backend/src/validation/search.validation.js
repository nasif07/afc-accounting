const { z } = require("zod");

// Two characters minimum: a single-character query matches most of every
// collection, so it costs a full scan to return results nobody can use.
const globalSearchQuery = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Search query must be at least 2 characters")
    .max(100, "Search query is too long"),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

module.exports = {
  globalSearchQuery,
};
