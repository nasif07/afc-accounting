const { StatusCodes } = require("http-status-codes");

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  static success(res, data, message = "Success", statusCode = StatusCodes.OK) {
    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, data, message));
  }

  static created(res, data, message = "Resource created successfully") {
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(StatusCodes.CREATED, data, message));
  }

  static badRequest(res, message = "Bad Request") {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(new ApiResponse(StatusCodes.BAD_REQUEST, null, message));
  }

  static unauthorized(res, message = "Unauthorized") {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json(new ApiResponse(StatusCodes.UNAUTHORIZED, null, message));
  }

  static forbidden(res, message = "Forbidden") {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json(new ApiResponse(StatusCodes.FORBIDDEN, null, message));
  }

  static notFound(res, message = "Resource not found") {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json(new ApiResponse(StatusCodes.NOT_FOUND, null, message));
  }

  static conflict(res, message = "Conflict") {
    return res
      .status(StatusCodes.CONFLICT)
      .json(new ApiResponse(StatusCodes.CONFLICT, null, message));
  }

  static serverError(res, message = "Internal Server Error") {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, null, message));
  }
}

module.exports = ApiResponse;
