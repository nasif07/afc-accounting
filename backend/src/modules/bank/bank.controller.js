const { StatusCodes } = require("http-status-codes");
const BankService = require("./bank.service");
const ApiResponse = require("../../utils/apiResponse");

class BankController {
  /**
   * Create a new bank account
   * FIXED: Extract coaAccount from request body
   */
  static async createBankAccount(req, res, next) {
    try {
      const {
        bankName,
        accountNumber,
        accountHolderName,
        branchName,
        accountType,
        openingBalance,
        coaAccount, // FIXED: Extract coaAccount
      } = req.body;

      // Validate required fields
      if (!bankName || !accountNumber || !accountHolderName || !accountType || !coaAccount) {
        return ApiResponse.badRequest(
          res,
          "Bank name, account number, account holder name, account type, and COA account are required"
        );
      }

      // Validate account type
      const validTypes = ["savings", "current", "checking", "money-market"];
      if (!validTypes.includes(accountType)) {
        return ApiResponse.badRequest(
          res,
          `Account type must be one of: ${validTypes.join(", ")}`
        );
      }

      // Validate opening balance if provided
      if (openingBalance !== undefined && typeof openingBalance !== "number") {
        return ApiResponse.badRequest(res, "Opening balance must be a number");
      }

      const bankData = {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        branchName: branchName ? branchName.trim() : null,
        accountType,
        openingBalance: openingBalance || 0,
        coaAccount, // FIXED: Include coaAccount
        createdBy: req.user.userId,
      };

      const bank = await BankService.createBankAccount(bankData);

      return ApiResponse.created(res, bank, "Bank account created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all bank accounts
   */
  static async getAllBankAccounts(req, res, next) {
    try {
      const { bankName, accountType } = req.query;

      const filters = {};
      if (bankName) filters.bankName = bankName;
      if (accountType) filters.accountType = accountType;

      const accounts = await BankService.getAllBankAccounts(filters);

      return ApiResponse.success(res, accounts, "Bank accounts retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific bank account by ID
   */
  static async getBankAccountById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      const account = await BankService.getBankAccountById(id);

      return ApiResponse.success(res, account, "Bank account retrieved successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Update a bank account
   * FIXED: Prevent updating immutable fields
   */
  static async updateBankAccount(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      // Prevent updating immutable fields
      const immutableFields = ["accountNumber", "coaAccount", "createdBy", "createdAt"];
      const attemptedImmutableUpdate = immutableFields.some((field) => field in updateData);

      if (attemptedImmutableUpdate) {
        return ApiResponse.badRequest(
          res,
          `Cannot update immutable fields: ${immutableFields.join(", ")}`
        );
      }

      // Validate account type if provided
      if (updateData.accountType) {
        const validTypes = ["savings", "current", "checking", "money-market"];
        if (!validTypes.includes(updateData.accountType)) {
          return ApiResponse.badRequest(
            res,
            `Account type must be one of: ${validTypes.join(", ")}`
          );
        }
      }

      const account = await BankService.updateBankAccount(id, updateData, req.user.userId);

      return ApiResponse.success(res, account, "Bank account updated successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes("Cannot update immutable")) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Soft delete a bank account
   */
  static async deleteBankAccount(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      const account = await BankService.deleteBankAccount(id, req.user.userId);

      return ApiResponse.success(res, account, "Bank account deleted successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes("Cannot delete")) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get total balance across all bank accounts
   */
  static async getTotalBankBalance(req, res, next) {
    try {
      const totals = await BankService.getTotalBankBalance();

      return ApiResponse.success(res, totals, "Total bank balance retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reconcile a bank account
   */
  static async reconcileBankAccount(req, res, next) {
    try {
      const { id } = req.params;
      const { reconciledBalance, reconciledDate } = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      if (reconciledBalance === undefined || reconciledBalance === null) {
        return ApiResponse.badRequest(res, "Reconciled balance is required");
      }

      if (!reconciledDate) {
        return ApiResponse.badRequest(res, "Reconciliation date is required");
      }

      if (typeof reconciledBalance !== "number") {
        return ApiResponse.badRequest(res, "Reconciled balance must be a number");
      }

      // Validate date format
      const dateObj = new Date(reconciledDate);
      if (isNaN(dateObj.getTime())) {
        return ApiResponse.badRequest(res, "Reconciliation date must be a valid date");
      }

      const account = await BankService.reconcileBankAccount(
        id,
        reconciledBalance,
        dateObj,
        req.user.userId
      );

      return ApiResponse.success(res, account, "Bank account reconciled successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get reconciliation status for a bank account
   */
  static async getReconciliationStatus(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      const status = await BankService.getReconciliationStatus(id);

      return ApiResponse.success(res, status, "Reconciliation status retrieved successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Archive a bank account
   */
  static async archiveBankAccount(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      const account = await BankService.archiveBankAccount(id, req.user.userId);

      return ApiResponse.success(res, account, "Bank account archived successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Restore an archived bank account
   */
  static async restoreBankAccount(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      const account = await BankService.restoreBankAccount(id, req.user.userId);

      return ApiResponse.success(res, account, "Bank account restored successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Validate if a bank account can be deactivated
   */
  static async validateCanDeactivate(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Bank account ID is required");
      }

      const validation = await BankService.validateCanDeactivate(id);

      return ApiResponse.success(res, validation, "Validation completed successfully");
    } catch (error) {
      if (error.message === "Bank account not found") {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }
}

module.exports = BankController;
