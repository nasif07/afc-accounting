const jwt = require("jsonwebtoken");
const User = require("../users/user.model");

class AuthService {
  static async register(userData) {
    const { name, email, password, userId } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Force new users to accountant/pending
    const user = new User({
      userId,
      name,
      email,
      password,
      role: 'accountant',  // FORCE accountant role
      status: 'pending',   // FORCE pending status
    });

    await user.save();

    // Generate token
    const token = this.generateToken(user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,  // INCLUDE status in response
        userId
      },
      token,
    };
  }

  static async login(email, password) {
    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new Error("User not found");
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new Error("Account is locked. Try again later.");
    }

    // CHECK STATUS BEFORE PASSWORD
    if (user.status === 'pending') {
      throw new Error("Account pending Director approval");
    }

    if (user.status === 'rejected') {
      throw new Error("Account has been rejected");
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      throw new Error("Invalid email or password");
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = this.generateToken(user._id, user.email, user.role);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,  // INCLUDE status in response
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  static async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
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
