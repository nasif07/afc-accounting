const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const User = require("../modules/users/user.model");

const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId, 'name email role status phone department isActive').lean();
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status !== 'approved') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: user.status === 'pending'
          ? "Account pending Director approval"
          : "Account has been rejected",
      });
    }

    if (!user.isActive) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Account has been deactivated",
      });
    }

    req.user = {
      id: user._id,
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
      phone: user.phone,
      department: user.department,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    // HANDLE EXPIRED TOKEN GRACEFULLY
    if (error.name === 'TokenExpiredError') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

module.exports = auth;
