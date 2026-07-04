const jwt = require("jsonwebtoken");
const { randomUUID, randomBytes, createHash } = require("crypto");
const User = require("../users/user.model");
const RefreshToken = require("./refreshToken.model");
const logger = require("../../utils/logger");

const ACCESS_TOKEN_EXPIRY = "15m";

// 14 days: covers a normal work-week-plus-weekend gap in usage for this
// app's small internal user base without forcing frequent re-logins, while
// still bounding how long a stolen refresh token stays useful. Rotated on
// every use, so an actively-used session keeps extending; a browser that's
// been idle longer than this always needs a fresh login.
const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

class AuthService {
  static async register(userData) {
    const { name, email, password } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const user = new User({
      userId: `USR-${randomUUID()}`,
      name,
      email,
      password,
      role: "accountant",
      status: "pending",
    });

    await user.save();

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  static async login(email, password) {
    const user = await User.findOne({ email }).select("+password");

    // Single generic message prevents user enumeration (#1)
    const INVALID_CREDENTIALS = "Invalid email or password";

    if (!user) {
      throw new Error(INVALID_CREDENTIALS);
    }

    if (user.isLocked()) {
      throw new Error("Account is locked. Try again later.");
    }

    if (user.status === "pending") {
      throw new Error("Account pending Director approval");
    }

    if (user.status === "rejected") {
      throw new Error("Account has been rejected");
    }

    if (!user.isActive) {
      throw new Error("Account has been deactivated");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      throw new Error(INVALID_CREDENTIALS);
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = this.generateAccessToken(user._id, user.email, user.role);
    const refreshToken = await this.generateRefreshToken(user._id);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
      refreshToken,
    };
  }

  static generateAccessToken(userId, email, role) {
    return jwt.sign({ userId, email, role }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  static hashRefreshToken(rawToken) {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  // Creates the raw token, persists only its hash (same discipline as
  // password storage), and returns the raw value — that's the only place
  // the raw token exists outside the client's cookie; the DB never sees it.
  static async generateRefreshToken(userId) {
    const rawToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await RefreshToken.create({ tokenHash, userId, expiresAt });

    return rawToken;
  }

  // Validates a presented refresh token, rotates it (old one marked used,
  // new row created), and issues a fresh access token. Throws on any
  // invalid state; callers map the message to a 401. `requestMeta` (ip,
  // userAgent) is optional context attached to the reuse-detection log line
  // below — callers that can't supply it (e.g. tests) just get a sparser log.
  static async refreshSession(rawRefreshToken, requestMeta = {}) {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored) {
      throw new Error("Invalid refresh token");
    }

    if (stored.revokedAt) {
      throw new Error("Refresh token has been revoked");
    }

    if (stored.expiresAt < new Date()) {
      throw new Error("Refresh token has expired");
    }

    if (stored.usedAt) {
      // Reuse of an already-rotated-out token: the legitimate rotation
      // already replaced it, so this presentation is either a replay of a
      // stolen token or a duplicate request. Revoke it and log — no
      // alerting pipeline yet, but this makes the event visible. Includes
      // enough context (who, from where, and the original token's timing)
      // to distinguish a likely-benign double-fire from a genuine stolen-
      // token replay days/weeks after the legitimate rotation.
      stored.revokedAt = stored.revokedAt || new Date();
      await stored.save();
      logger.warn(
        {
          userId: stored.userId,
          refreshTokenId: stored._id,
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent,
          tokenIssuedAt: stored.createdAt,
          tokenRotatedAt: stored.usedAt,
        },
        "Detected reuse of an already-used refresh token",
      );
      throw new Error("Refresh token has already been used");
    }

    const user = await User.findById(stored.userId);
    if (!user || user.status !== "approved" || !user.isActive) {
      throw new Error("Account is not active");
    }

    stored.usedAt = new Date();
    await stored.save();

    const token = this.generateAccessToken(user._id, user.email, user.role);
    const refreshToken = await this.generateRefreshToken(user._id);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
      refreshToken,
    };
  }

  // Revokes every non-revoked refresh token for a user, i.e. "log out all
  // devices" — distinct from revokeRefreshToken, which only touches the one
  // token presented by the current session.
  static async revokeAllRefreshTokens(userId) {
    await RefreshToken.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  // Idempotent: safe to call with a missing/garbage token (e.g. logout
  // called twice, or a client with no refresh cookie for any reason).
  static async revokeRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  static async verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new Error("Invalid or expired token");
    }
  }

  static async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      department: user.department,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };
  }
}

module.exports = AuthService;
