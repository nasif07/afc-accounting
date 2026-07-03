const AppError = require("./AppError");

// Structured input-shape validation failure (distinct from BadRequestError,
// which covers business-rule/state violations). `errors` is an optional
// list of individual field-level issues.
class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

module.exports = ValidationError;
