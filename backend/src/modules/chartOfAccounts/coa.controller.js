const COAService = require("./coa.service");
const ApiResponse = require("../../utils/apiResponse");

class COAController {
  // =============================
  // CREATE ACCOUNT
  // =============================
  static async createAccount(req, res, next) {
    try {
      const {
        accountCode,
        accountName,
        accountType,
        description,
        openingBalance,
        openingBalanceType,
        parentAccount,
      } = req.body;

      if (!accountCode || !accountName || !accountType) {
        return ApiResponse.badRequest(
          res,
          "Account code, name, and type are required"
        );
      }

      const normalizedType = accountType.toLowerCase();

      const accountData = {
        accountCode,
        accountName,
        accountType: normalizedType,
        description,
        openingBalance: openingBalance || 0,
        openingBalanceType:
          openingBalanceType ||
          (["asset", "expense"].includes(normalizedType)
            ? "debit"
            : "credit"),
        parentAccount: parentAccount || null,
        createdBy: req.user.userId,
      };

      const account = await COAService.createAccount(accountData);

      return ApiResponse.created(res, account, "Account created successfully");
    } catch (error) {
      next(error);
    }
  }

  // =============================
  // GET ALL ACCOUNTS
  // =============================
  static async getAllAccounts(req, res, next) {
    try {
      const { accountType, status, leafNodesOnly } = req.query;

      const filters = {};

      if (accountType) filters.accountType = accountType.toLowerCase();
      if (status) filters.status = status;
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

  // =============================
  // GET SINGLE ACCOUNT
  // =============================
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

  // =============================
  // UPDATE ACCOUNT
  // =============================
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
        "openingBalanceType",
        "status",
        "parentAccount",
      ];

      const updateData = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] =
            field === "accountType"
              ? req.body[field].toLowerCase()
              : req.body[field];
        }
      }

      updateData.updatedBy = req.user.userId;

      const account = await COAService.updateAccount(id, updateData);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(res, account, "Account updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // =============================
  // UPDATE STATUS
  // =============================
  static async updateAccountStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["active", "inactive", "archived"];

      if (!validStatuses.includes(status)) {
        return ApiResponse.badRequest(res, "Invalid status value");
      }

      const account = await COAService.updateAccount(id, {
        status,
        updatedBy: req.user.userId,
      });

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(res, account, "Status updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // =============================
  // ARCHIVE (SOFT DELETE)
  // =============================
  static async archiveAccount(req, res, next) {
    try {
      const { id } = req.params;

      const account = await COAService.archiveAccount(
        id,
        req.user.userId
      );

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(res, account, "Account archived successfully");
    } catch (error) {
      next(error);
    }
  }

  // =============================
  // RESTORE
  // =============================
  static async restoreAccount(req, res, next) {
    try {
      const { id } = req.params;

      const account = await COAService.restoreAccount(id);

      if (!account) {
        return ApiResponse.notFound(res, "Account not found");
      }

      return ApiResponse.success(res, account, "Account restored successfully");
    } catch (error) {
      next(error);
    }
  }

  // =============================
  // GET BALANCE
  // =============================
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

  // =============================
  // LEAF NODES
  // =============================
  static async getLeafNodes(req, res, next) {
    try {
      const { accountType } = req.query;

      const filters = {};

      if (accountType) filters.accountType = accountType.toLowerCase();

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

  // =============================
  // TREE
  // =============================
static async getAccountTree(req, res, next) {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const status = req.query.status || "all";

    const tree = await COAService.buildAccountTree({
      includeDeleted,
      status,
    });

    return ApiResponse.success(
      res,
      tree,
      "Account tree retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
}
}

module.exports = COAController;