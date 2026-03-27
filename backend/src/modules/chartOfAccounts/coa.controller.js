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
        parentAccount,
      } = req.body;

      if (!accountCode || !accountName || !accountType) {
        return ApiResponse.badRequest(
          res,
          "Account code, name, and type are required"
        );
      }

      const accountData = {
        accountCode,
        accountName,
        accountType,
        description,
        openingBalance: openingBalance || 0,
        parentAccount: parentAccount || null,
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
      if (leafNodesOnly === "true") filters.leafNodesOnly = true;

      const accounts = await COAService.getAllAccounts(filters);

      return ApiResponse.success(
        res,
        accounts,
        "Accounts retrieved successfully"
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
        "Account retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateAccount(req, res, next) {
    try {
      const { id } = req.params;

      const forbiddenFields = [
        "currentBalance",
        "hasChildren",
        "hasTransactions",
        "deletedAt",
        "deletedBy",
        "createdBy",
      ];

      for (const field of forbiddenFields) {
        if (req.body[field] !== undefined) {
          return ApiResponse.badRequest(
            res,
            `${field} cannot be updated directly`
          );
        }
      }

      const allowedFields = [
        "accountCode",
        "accountName",
        "accountType",
        "description",
        "openingBalance",
        "isActive",
        "status",
        "parentAccount",
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
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
      const account = await COAService.deleteAccount(id, req.user.userId);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(
        res,
        account,
        "Account deleted successfully"
      );
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
        "Account balance retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  static async getLeafNodes(req, res, next) {
    try {
      const { accountType } = req.query;
      const filters = {};

      if (accountType) filters.accountType = accountType;

      const leafNodes = await COAService.getLeafNodes(filters);

      return ApiResponse.success(
        res,
        leafNodes,
        "Leaf nodes retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAccountTree(req, res, next) {
    try {
      const tree = await COAService.buildAccountTree();

      return ApiResponse.success(
        res,
        tree,
        "Account tree retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  static async restoreAccount(req, res, next) {
    try {
      const { id } = req.params;
      const account = await COAService.restoreAccount(id);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(
        res,
        account,
        "Account restored successfully"
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = COAController;