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

      // ✅ FIX #3: Only set openingBalance, NOT currentBalance (will be calculated from journal)
      const accountData = {
        accountCode,
        accountName,
        accountType,
        description,
        openingBalance: openingBalance || 0,
        // REMOVED: currentBalance - this will be calculated from journal entries
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
      const { accountType, isActive, leafNodesOnly } = req.query;
      const filters = {};
      if (accountType) filters.accountType = accountType;
      if (isActive !== undefined) filters.isActive = isActive === "true";
      // ✅ FIX #10: Support leafNodesOnly filter
      if (leafNodesOnly === "true") filters.leafNodesOnly = true;

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

      // ✅ FIX #3: Prevent direct balance updates
      if (updateData.currentBalance !== undefined) {
        return ApiResponse.badRequest(
          res,
          "Account balance cannot be updated directly. Balance is calculated from journal entries."
        );
      }

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
      // ✅ FIX #14: Pass userId for soft-delete audit trail
      const account = await COAService.deleteAccount(id, req.user.userId);

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
      // ✅ FIX #6: Calculate balance from journal entries, not stored value
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

  // ✅ FIX #10: New endpoint to get leaf nodes only
  static async getLeafNodes(req, res, next) {
    try {
      const { accountType } = req.query;
      const filters = {};
      if (accountType) filters.accountType = accountType;

      const leafNodes = await COAService.getLeafNodes(filters);
      return ApiResponse.success(
        res,
        leafNodes,
        "Leaf nodes retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ✅ FIX #10: New endpoint to get account tree
  static async getAccountTree(req, res, next) {
    try {
      const tree = await COAService.buildAccountTree();
      return ApiResponse.success(
        res,
        tree,
        "Account tree retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = COAController;
