const { ValidationError } = require("../errors");

const formatIssues = (issues) =>
  issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(", ");

/**
 * Route-level Zod validation middleware.
 * Usage: validate({ body: bodySchema, query: querySchema, params: paramsSchema })
 * Only the parts you pass a schema for are validated; on success, req[part]
 * is replaced with the parsed (coerced) value so downstream code sees clean types.
 */
const validate = (schemas = {}) => (req, res, next) => {
  for (const part of ["params", "query", "body"]) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(new ValidationError(formatIssues(result.error.issues), result.error.issues));
    }

    req[part] = result.data;
  }

  next();
};

module.exports = validate;
