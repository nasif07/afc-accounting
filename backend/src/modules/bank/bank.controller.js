const { StatusCodes } = require('http-status-codes');
const BankService = require('./bank.service');
const ApiResponse = require('../../utils/apiResponse');

class BankController {
  static async createBankAccount(req, res, next) {
    try {
      const { bankName, accountNumber, accountHolder, ifscCode, branchName, accountType, openingBalance } = req.body;

      if (!bankName || !accountNumber || !accountHolder || !ifscCode) {
        return ApiResponse.badRequest(res, 'Bank name, account number, account holder, and IFSC code are required');
      }

      const bankData = {
        bankName,
        accountNumber,
        accountHolder,
        ifscCode,
        branchName,
        accountType,
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        createdBy: req.user.userId
      };

      const bank = await BankService.createBankAccount(bankData);
      return ApiResponse.created(res, bank, 'Bank account created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllBankAccounts(req, res, next) {
    try {
      const accounts = await BankService.getAllBankAccounts();
      return ApiResponse.success(res, accounts, 'Bank accounts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBankAccountById(req, res, next) {
    try {
      const { id } = req.params;
      const account = await BankService.getBankAccountById(id);

      if (!account) {
        return ApiResponse.notFound(res, 'Bank account not found');
      }

      return ApiResponse.success(res, account, 'Bank account retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateBankAccount(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const account = await BankService.updateBankAccount(id, updateData);

      if (!account) {
        return ApiResponse.notFound(res, 'Bank account not found');
      }

      return ApiResponse.success(res, account, 'Bank account updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteBankAccount(req, res, next) {
    try {
      const { id } = req.params;
      const account = await BankService.deleteBankAccount(id, req.user.userId);

      if (!account) {
        return ApiResponse.notFound(res, 'Bank account not found');
      }

      return ApiResponse.success(res, null, 'Bank account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTotalBankBalance(req, res, next) {
    try {
      const totals = await BankService.getTotalBankBalance();
      return ApiResponse.success(res, totals, 'Total bank balance retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async reconcileBankAccount(req, res, next) {
    try {
      const { id } = req.params;
      const { reconciledBalance, reconciledDate } = req.body;

      if (!reconciledBalance || !reconciledDate) {
        return ApiResponse.badRequest(res, 'Reconciled balance and date are required');
      }

      const account = await BankService.reconcileBankAccount(id, reconciledBalance, reconciledDate);

      if (!account) {
        return ApiResponse.notFound(res, 'Bank account not found');
      }

      return ApiResponse.success(res, account, 'Bank account reconciled successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BankController;
