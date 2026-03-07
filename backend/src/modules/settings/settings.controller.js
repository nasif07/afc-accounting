const { StatusCodes } = require('http-status-codes');
const SettingsService = require('./settings.service');
const ApiResponse = require('../../utils/apiResponse');

class SettingsController {
  static async getSettings(req, res, next) {
    try {
      const settings = await SettingsService.getSettings();
      return ApiResponse.success(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const updateData = req.body;
      const settings = await SettingsService.updateSettings(updateData);
      return ApiResponse.success(res, settings, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getFinancialYearSettings(req, res, next) {
    try {
      const fySettings = await SettingsService.getFinancialYearSettings();
      return ApiResponse.success(res, fySettings, 'Financial year settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getApprovalLimits(req, res, next) {
    try {
      const limits = await SettingsService.getApprovalLimits();
      return ApiResponse.success(res, limits, 'Approval limits retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getVoucherNumberingFormat(req, res, next) {
    try {
      const format = await SettingsService.getVoucherNumberingFormat();
      return ApiResponse.success(res, format, 'Voucher numbering format retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateApprovalLimits(req, res, next) {
    try {
      const { accountantLimit, directorLimit } = req.body;

      if (!accountantLimit || !directorLimit) {
        return ApiResponse.badRequest(res, 'Accountant limit and director limit are required');
      }

      const settings = await SettingsService.updateApprovalLimits(accountantLimit, directorLimit);
      return ApiResponse.success(res, settings, 'Approval limits updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateVoucherPrefixes(req, res, next) {
    try {
      const { receiptPrefix, expensePrefix, payrollPrefix, journalPrefix } = req.body;

      const settings = await SettingsService.updateVoucherPrefixes(
        receiptPrefix,
        expensePrefix,
        payrollPrefix,
        journalPrefix
      );

      return ApiResponse.success(res, settings, 'Voucher prefixes updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SettingsController;
