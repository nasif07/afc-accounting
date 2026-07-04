const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  // req.log is a pino child logger scoped to this request (via pino-http in
  // app.js), so this error is automatically correlated with the request id
  // and the rest of that request's log lines.
  (req.log || logger).error({ err }, err.message || 'Unhandled error');

  // Default error — covers the app's own typed errors (errors/AppError.js
  // and subclasses), which set statusCode directly.
  let statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || "Internal Server Error";

  // Mongoose validation error. Checked via instanceof (not err.name, which
  // the app's own ValidationError class also uses) so the two don't collide.
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = StatusCodes.CONFLICT;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Token expired";
  }

  // Structured per-field issues from the Zod validation middleware
  // (errors/ValidationError.js) were being computed but never actually sent
  // to the client — only the flattened message string was. Expose them as
  // `errors: [{ field, message }]` so the frontend can map failures back to
  // individual form fields instead of a single generic toast.
  const fieldErrors =
    Array.isArray(err.errors) && err.errors.length > 0
      ? err.errors.map((issue) => ({
          field: Array.isArray(issue.path) ? issue.path.join(".") : "",
          message: issue.message,
        }))
      : undefined;

  res.status(statusCode).json({
    ...new ApiResponse(statusCode, null, message),
    ...(fieldErrors && { errors: fieldErrors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
