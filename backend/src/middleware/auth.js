const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const User = require("../modules/users/user.model");

const auth = async (req, res, next) => {
  try {
    // Try to get token from cookies first, then fall back to Authorization header
    let token = req.cookies?.token;
    
    if (!token) {
      // Fallback to Authorization header for backward compatibility
      token = req.header("Authorization")?.replace("Bearer ", "");
    }

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // FETCH FULL USER OBJECT
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "User not found",
      });
    }

    // CHECK STATUS
    if (user.status !== 'approved') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: user.status === 'pending' 
          ? "Account pending Director approval" 
          : "Account has been rejected",
      });
    }

    // ATTACH FULL USER OBJECT
    req.user = {
      id: user._id,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
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
