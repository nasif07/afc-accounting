const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const User = require("../users/user.model");

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

    const token = this.generateToken(user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
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

    const token = this.generateToken(user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
    };
  }

  static generateToken(userId, email, role) {
    return jwt.sign({ userId, email, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    });
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
