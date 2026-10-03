const AppError = require("./AppError");

// Generic 400 for business-rule violations (e.g. "Cannot update an
// approved record", "X is required") — distinct from ValidationError,
// which is reserved for structured input-shape validation failures.
class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

module.exports = BadRequestError;
