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
        error.message === "User not found" ||
        error.message === "Invalid email or password" ||
        error.message === "Account is locked. Try again later." ||
        error.message === "Account pending Director approval" ||
        error.message === "Account has been rejected"
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
      if (!user) {
        return ApiResponse.unauthorized(res, "User not found");
      }
      return ApiResponse.success(res, { user }, "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getPendingUsers(req, res, next) {
    try {
      // Only directors can view pending users
      if (req.user.role !== 'director') {
        return ApiResponse.forbidden(res, "Only directors can view pending users");
      }

      const pendingUsers = await require("../users/user.model").find({ status: 'pending' })
        .select('-password')
        .sort({ createdAt: -1 });

      return ApiResponse.success(res, pendingUsers, "Pending users retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async approveUser(req, res, next) {
    try {
      // Only directors can approve
      if (req.user.role !== 'director') {
        return ApiResponse.forbidden(res, "Only directors can approve users");
      }

      const { id } = req.params;
      const User = require("../users/user.model");
      const user = await User.findById(id);

      if (!user) {
        return ApiResponse.notFound(res, "User not found");
      }

      if (user.status !== 'pending') {
        return ApiResponse.badRequest(res, "User is not pending approval");
      }

      user.status = 'approved';
      user.approvedBy = req.user.id;
      user.approvedAt = new Date();
      await user.save();

      return ApiResponse.success(res, user, "User approved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async rejectUser(req, res, next) {
    try {
      // Only directors can reject
      if (req.user.role !== 'director') {
        return ApiResponse.forbidden(res, "Only directors can reject users");
      }

      const { id } = req.params;
      const User = require("../users/user.model");
      const user = await User.findById(id);

      if (!user) {
        return ApiResponse.notFound(res, "User not found");
      }

      if (user.status !== 'pending') {
        return ApiResponse.badRequest(res, "User is not pending approval");
      }

      user.status = 'rejected';
      user.approvedBy = req.user.id;
      user.approvedAt = new Date();
      await user.save();

      return ApiResponse.success(res, user, "User rejected successfully");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
