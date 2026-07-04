const { StatusCodes } = require("http-status-codes");
const AuthService = require("./auth.service");
const User = require("../users/user.model");
const ApiResponse = require("../../utils/apiResponse");

const cookieSecurityOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
});

const getAccessTokenCookieOptions = () => ({
  ...cookieSecurityOptions(),
  maxAge: 15 * 60 * 1000, // matches AuthService's ACCESS_TOKEN_EXPIRY
});

// Scoped to /api/auth (not just /api/auth/refresh) so it's never sent on
// ordinary API calls, but IS still sent to /api/auth/logout — logout needs
// to read this cookie's value to revoke the specific token it identifies.
const getRefreshTokenCookieOptions = () => ({
  ...cookieSecurityOptions(),
  path: "/api/auth",
  maxAge: 14 * 24 * 60 * 60 * 1000, // matches AuthService's REFRESH_TOKEN_TTL_MS
});

// Express's res.clearCookie merges whatever options it's given on top of
// its own { expires: <past date> } default (see express/lib/response.js).
// If we passed maxAge here, that positive Max-Age would win over Expires
// per RFC 6265 and the browser would NOT actually clear the cookie — only
// path/security attributes are needed to identify which cookie to drop.
const getAccessTokenClearOptions = () => cookieSecurityOptions();
const getRefreshTokenClearOptions = () => ({ ...cookieSecurityOptions(), path: "/api/auth" });

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return ApiResponse.badRequest(res, "All fields are required");
      }

      if (password.length < 8) {
        return ApiResponse.badRequest(res, "Password must be at least 8 characters");
      }

      const result = await AuthService.register({ name, email, password });

      // No cookie — account is pending director approval and cannot authenticate yet.
      return ApiResponse.created(res, result, "Registration successful. Your account is pending director approval.");
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

      res.cookie("token", result.token, getAccessTokenCookieOptions());
      res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());

      // Never put the raw refresh token in the response body — it only
      // ever leaves the server as an httpOnly cookie.
      return ApiResponse.success(
        res,
        { user: result.user, token: result.token },
        "Login successful",
      );
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

  // Not authenticated by the `auth` middleware on purpose — this endpoint
  // IS how a session gets re-authenticated once the access token has
  // expired. Trust comes entirely from the refresh-token cookie.
  static async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return ApiResponse.unauthorized(res, "Refresh token is required");
      }

      const result = await AuthService.refreshSession(refreshToken, {
        ip: req.ip,
        userAgent: req.header("User-Agent"),
      });

      res.cookie("token", result.token, getAccessTokenCookieOptions());
      res.cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions());

      return ApiResponse.success(
        res,
        { user: result.user, token: result.token },
        "Token refreshed successfully",
      );
    } catch (error) {
      const knownMessages = [
        "Invalid refresh token",
        "Refresh token has been revoked",
        "Refresh token has expired",
        "Refresh token has already been used",
        "Account is not active",
      ];
      if (knownMessages.includes(error.message)) {
        return ApiResponse.unauthorized(res, error.message);
      }
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await AuthService.revokeRefreshToken(refreshToken);
      }

      res.clearCookie("token", getAccessTokenClearOptions());
      res.clearCookie("refreshToken", getRefreshTokenClearOptions());
      return ApiResponse.success(res, null, "Logout successful");
    } catch (error) {
      next(error);
    }
  }

  // Identifies the user from the current (valid) access token via the
  // `auth` middleware, then revokes EVERY refresh token belonging to that
  // user — not just the one presented by this request. A separate code
  // path from logout(), sharing only the underlying revoke/clear-cookie
  // primitives, so single-device logout is unaffected by this endpoint
  // existing.
  static async logoutAll(req, res, next) {
    try {
      await AuthService.revokeAllRefreshTokens(req.user.id);

      res.clearCookie("token", getAccessTokenClearOptions());
      res.clearCookie("refreshToken", getRefreshTokenClearOptions());
      return ApiResponse.success(res, null, "Logged out of all devices");
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
