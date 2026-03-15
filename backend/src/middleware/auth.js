const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const auth = (req, res, next) => {
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

module.exports = auth;
