const { StatusCodes } = require("http-status-codes");
const AuthService = require("./auth.service");
const ApiResponse = require("../../utils/apiResponse");

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password, confirmPassword, role } = req.body;

      // Validation
      if (!name || !email || !password || !confirmPassword) {
        return ApiResponse.badRequest(res, "All fields are required");
      }

      if (password !== confirmPassword) {
        return ApiResponse.badRequest(res, "Passwords do not match");
      }

      if (password.length < 6) {
        return ApiResponse.badRequest(
          res,
          "Password must be at least 6 characters",
        );
      }

      const result = await AuthService.register({
        name,
        email,
        password,
        role,
        userId: `USR-${Date.now()}`
      });

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return ApiResponse.created(res, result, "User registered successfully");
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return ApiResponse.badRequest(res, "Email and password are required");
      }

      const result = await AuthService.login(email, password);

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return ApiResponse.success(res, result, "Login successful");
    } catch (error) {
      if (
        error.message === "Invalid email or password" ||
        error.message === "Account is locked. Try again later."
      ) {
        return ApiResponse.unauthorized(res, error.message);
      }
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      res.clearCookie("token");
      return ApiResponse.success(res, null, "Logout successful");
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req, res, next) {
    try {
      const user = req.user;
      return ApiResponse.success(res, user, "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
