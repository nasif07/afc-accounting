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
        openingDate,
        parentAccount,
      } = req.body;

      if (!accountCode || !accountName || !accountType) {
        return ApiResponse.badRequest(
          res,
          "Account code, name, and type are required",
        );
      }

      if (
        openingBalance !== undefined &&
        (Number.isNaN(Number(openingBalance)) || Number(openingBalance) < 0)
      ) {
        return ApiResponse.badRequest(
          res,
          "Opening balance must be a valid non-negative number",
        );
      }

      if (
        openingBalanceType &&
        !["debit", "credit"].includes(String(openingBalanceType).toLowerCase())
      ) {
        return ApiResponse.badRequest(
          res,
          "Opening balance type must be either debit or credit",
        );
      }

      if (parentAccount) {
        const parent = await COAService.getAccountById(parentAccount);

        if (!parent) {
          return ApiResponse.notFound(res, "Parent account not found");
        }

        if (parent.status !== "active") {
          return ApiResponse.badRequest(
            res,
            "Only active accounts can be used as parent accounts",
          );
        }

        if (parent.hasTransactions) {
          return ApiResponse.badRequest(
            res,
            "An account with transactions cannot be used as a parent account",
          );
        }

        if (
          parent.accountType &&
          String(parent.accountType).toLowerCase() !==
            String(accountType).toLowerCase()
        ) {
          return ApiResponse.badRequest(
            res,
            "Parent account type must match child account type",
          );
        }
      }

      const accountData = {
        accountCode: String(accountCode).trim(),
        accountName: String(accountName).trim(),
        accountType: String(accountType).toLowerCase().trim(),
        description: description ? String(description).trim() : "",
        openingBalance:
          openingBalance !== undefined ? Number(openingBalance) : 0,
        openingBalanceType: openingBalanceType
          ? String(openingBalanceType).toLowerCase()
          : "debit",
        openingDate: openingDate || new Date(),
        parentAccount: parentAccount || null,
        status: "active",
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
      const { accountType, status, leafNodesOnly, includeDeleted } = req.query;

      const filters = {};

      if (accountType) filters.accountType = String(accountType).toLowerCase();
      if (status) filters.status = status;
      if (leafNodesOnly === "true") filters.leafNodesOnly = true;
      if (includeDeleted === "true") filters.includeDeleted = true;

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
        "Account retrieved successfully",
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

      const existing = await COAService.getAccountById(id);

      if (!existing) {
        return ApiResponse.notFound(res, "Account not found");
      }

      const allowedFields = [
        "accountCode",
        "accountName",
        "accountType",
        "description",
        "openingBalance",
        "openingBalanceType",
        "openingDate",
        "parentAccount",
        "status",
      ];

      const updateData = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === "accountType") {
            updateData[field] = String(req.body[field]).toLowerCase().trim();
          } else if (
            ["accountCode", "accountName", "description"].includes(field) &&
            req.body[field] !== null
          ) {
            updateData[field] = String(req.body[field]).trim();
          } else if (field === "openingBalance") {
            const amount = Number(req.body[field]);

            if (Number.isNaN(amount) || amount < 0) {
              return ApiResponse.badRequest(
                res,
                "Opening balance must be a valid non-negative number",
              );
            }

            updateData[field] = amount;
          } else if (field === "openingBalanceType") {
            const balanceType = String(req.body[field]).toLowerCase();

            if (!["debit", "credit"].includes(balanceType)) {
              return ApiResponse.badRequest(
                res,
                "Opening balance type must be either debit or credit",
              );
            }

            updateData[field] = balanceType;
          } else {
            updateData[field] = req.body[field];
          }
        }
      }

      // Block account type change after transactions exist
      if (
        existing.hasTransactions &&
        updateData.accountType &&
        updateData.accountType !== existing.accountType
      ) {
        return ApiResponse.badRequest(
          res,
          "Cannot change account type after transactions exist",
        );
      }

      // Block parent change after transactions exist
      const existingParentId = existing.parentAccount
        ? String(existing.parentAccount)
        : null;

      const nextParentId =
        updateData.parentAccount !== undefined
          ? updateData.parentAccount
            ? String(updateData.parentAccount)
            : null
          : existingParentId;

      if (existing.hasTransactions && nextParentId !== existingParentId) {
        return ApiResponse.badRequest(
          res,
          "Cannot change parent account after transactions exist",
        );
      }

      // IMPORTANT: allow opening fields update only before transactions
      if (existing.hasTransactions) {
        if (updateData.openingBalance !== undefined) {
          return ApiResponse.badRequest(
            res,
            "Opening balance cannot be updated after transactions exist",
          );
        }

        if (updateData.openingBalanceType !== undefined) {
          return ApiResponse.badRequest(
            res,
            "Opening balance type cannot be updated after transactions exist",
          );
        }

        if (updateData.openingDate !== undefined) {
          return ApiResponse.badRequest(
            res,
            "Opening date cannot be updated after transactions exist",
          );
        }
      }

      if (nextParentId) {
        if (String(id) === String(nextParentId)) {
          return ApiResponse.badRequest(
            res,
            "Account cannot be its own parent",
          );
        }

        const parent = await COAService.getAccountById(nextParentId);

        if (!parent) {
          return ApiResponse.notFound(res, "Parent account not found");
        }

        if (parent.status !== "active") {
          return ApiResponse.badRequest(
            res,
            "Only active accounts can be used as parent accounts",
          );
        }

        if (parent.hasTransactions) {
          return ApiResponse.badRequest(
            res,
            "An account with transactions cannot be used as a parent account",
          );
        }

        const targetType = updateData.accountType || existing.accountType;

        if (
          parent.accountType &&
          String(parent.accountType).toLowerCase() !==
            String(targetType).toLowerCase()
        ) {
          return ApiResponse.badRequest(
            res,
            "Parent account type must match child account type",
          );
        }
      }

      const account = await COAService.updateAccount(
        id,
        updateData,
        req.user.userId,
      );

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

      const existing = await COAService.getAccountById(id);

      if (!existing) {
        return ApiResponse.notFound(res, "Account not found");
      }

      const account = await COAService.updateAccountStatus(
        id,
        status,
        req.user.userId,
      );

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

      const account = await COAService.archiveAccount(id, req.user.userId);

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

      const account = await COAService.restoreAccount(id, req.user.userId);

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
        "Account balance retrieved successfully",
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

      if (accountType) filters.accountType = String(accountType).toLowerCase();

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

  // =============================
  // ACCOUNT TRANSACTIONS
  // =============================
  static async getAccountTransactions(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const parsedLimit = Number.parseInt(limit, 10);
      const parsedOffset = Number.parseInt(offset, 10);

      const transactions = await COAService.getAccountTransactions(
        id,
        Number.isNaN(parsedLimit) ? 20 : parsedLimit,
        Number.isNaN(parsedOffset) ? 0 : parsedOffset,
      );

      return ApiResponse.success(
        res,
        transactions,
        "Account transactions retrieved successfully",
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
      const { includeDeleted, status } = req.query;

      const tree = await COAService.buildAccountTree({
        includeDeleted: includeDeleted === "true",
        status: status || "all",
      });

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
