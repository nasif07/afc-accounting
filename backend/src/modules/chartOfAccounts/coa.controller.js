const { StatusCodes } = require("http-status-codes");
const COAService = require("./coa.service");
const ApiResponse = require("../../utils/apiResponse");

class COAController {
  static async createAccount(req, res, next) {
    try {
      const {
        accountCode,
        accountName,
        accountType,
        description,
        openingBalance,
      } = req.body;

      if (!accountCode || !accountName || !accountType) {
        return ApiResponse.badRequest(
          res,
          "Account code, name, and type are required",
        );
      }

      const accountData = {
        accountCode,
        accountName,
        accountType,
        description,
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        createdBy: req.user.userId,
      };

      const account = await COAService.createAccount(accountData);
      return ApiResponse.created(res, account, "Account created successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getAllAccounts(req, res, next) {
    try {
      const { accountType, isActive } = req.query;
      const filters = {};
      if (accountType) filters.accountType = accountType;
      if (isActive !== undefined) filters.isActive = isActive === "true";

      const accounts = await COAService.getAllAccounts(filters);
      return ApiResponse.success(
        res,
        accounts,
        "Accounts retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAccountById(req, res, next) {
    try {
      const { id } = req.params;
      const account = await COAService.getAccountById(id);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(
        res,
        account,
        "Account retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateAccount(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const account = await COAService.updateAccount(id, updateData);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(res, account, "Account updated successfully");
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req, res, next) {
    try {
      const { id } = req.params;
      const account = await COAService.deleteAccount(id);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(res, null, "Account deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getAccountBalance(req, res, next) {
    try {
      const { id } = req.params;
      const balance = await COAService.getAccountBalance(id);
      return ApiResponse.success(
        res,
        { balance },
        "Account balance retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = COAController;
