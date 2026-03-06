const { StatusCodes } = require('http-status-codes');
const { USER_ROLES } = require('../config/constants');

const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Convenience middleware for common role combinations
const directorOnly = roleCheck([USER_ROLES.DIRECTOR]);
const accountantOrDirector = roleCheck([USER_ROLES.DIRECTOR, USER_ROLES.ACCOUNTANT]);
const anyRole = roleCheck([USER_ROLES.DIRECTOR, USER_ROLES.ACCOUNTANT, USER_ROLES.SUB_ACCOUNTANT]);

module.exports = {
  roleCheck,
  directorOnly,
  accountantOrDirector,
  anyRole
};
