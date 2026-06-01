const { StatusCodes } = require("http-status-codes");
const AuthService = require("./auth.service");
const User = require("../users/user.model");
const ApiResponse = require("../../utils/apiResponse");

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return ApiResponse.badRequest(res, "All fields are required");
      }

      if (password !== confirmPassword) {
        return ApiResponse.badRequest(res, "Passwords do not match");
      }

      if (password.length < 8) {
        return ApiResponse.badRequest(res, "Password must be at least 8 characters");
      }

      // confirmPassword is not forwarded to the service
      const result = await AuthService.register({ name, email, password });

      res.cookie("token", result.token, getAuthCookieOptions());
      return ApiResponse.created(res, result, "User registered successfully");
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ApiResponse.badRequest(res, "Email and password are required");
      }

      const result = await AuthService.login(email, password);

      res.cookie("token", result.token, getAuthCookieOptions());
      return ApiResponse.success(res, result, "Login successful");
    } catch (error) {
      const knownMessages = [
        "Invalid email or password",
        "Account is locked. Try again later.",
        "Account pending Director approval",
        "Account has been rejected",
        "Account has been deactivated",
      ];
      if (knownMessages.includes(error.message)) {
        return ApiResponse.unauthorized(res, error.message);
      }
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      res.clearCookie("token", getAuthCookieOptions());
      return ApiResponse.success(res, null, "Logout successful");
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req, res, next) {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, "User not found");
      }
      return ApiResponse.success(res, { user: req.user }, "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Role is already enforced by directorOnly middleware on these routes
  static async getPendingUsers(req, res, next) {
    try {
      const pendingUsers = await User.find({ status: "pending" })
        .select("-password")
        .sort({ createdAt: -1 });
      return ApiResponse.success(res, pendingUsers, "Pending users retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async approveUser(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return ApiResponse.notFound(res, "User not found");
      if (user.status !== "pending") {
        return ApiResponse.badRequest(res, "User is not pending approval");
      }

      user.status = "approved";
      user.approvedBy = req.user.id;
      user.approvedAt = new Date();
      await user.save();

      return ApiResponse.success(res, { id: user._id, status: user.status }, "User approved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async rejectUser(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return ApiResponse.notFound(res, "User not found");
      if (user.status !== "pending") {
        return ApiResponse.badRequest(res, "User is not pending approval");
      }

      user.status = "rejected";
      user.rejectedBy = req.user.id;
      user.rejectedAt = new Date();
      user.rejectionReason = req.body.reason || "";
      await user.save();

      return ApiResponse.success(res, { id: user._id, status: user.status }, "User rejected");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
