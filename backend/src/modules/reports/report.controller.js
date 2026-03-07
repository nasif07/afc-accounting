const { StatusCodes } = require('http-status-codes');
const ReportService = require('./report.service');
const ApiResponse = require('../../utils/apiResponse');

class ReportController {
  static async getIncomeStatement(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return ApiResponse.badRequest(res, 'Date from and date to are required');
      }

      const report = await ReportService.getIncomeStatement(dateFrom, dateTo);
      return ApiResponse.success(res, report, 'Income statement retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBalanceSheet(req, res, next) {
    try {
      const { asOfDate } = req.query;

      if (!asOfDate) {
        return ApiResponse.badRequest(res, 'As of date is required');
      }

      const report = await ReportService.getBalanceSheet(asOfDate);
      return ApiResponse.success(res, report, 'Balance sheet retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCashFlowStatement(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return ApiResponse.badRequest(res, 'Date from and date to are required');
      }

      const report = await ReportService.getCashFlowStatement(dateFrom, dateTo);
      return ApiResponse.success(res, report, 'Cash flow statement retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getReceiptPaymentSummary(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return ApiResponse.badRequest(res, 'Date from and date to are required');
      }

      const report = await ReportService.getReceiptPaymentSummary(dateFrom, dateTo);
      return ApiResponse.success(res, report, 'Receipt & payment summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getHeadwiseIncomeReport(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return ApiResponse.badRequest(res, 'Date from and date to are required');
      }

      const report = await ReportService.getHeadwiseIncomeReport(dateFrom, dateTo);
      return ApiResponse.success(res, report, 'Head-wise income report retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTrialBalance(req, res, next) {
    try {
      const { asOfDate } = req.query;

      if (!asOfDate) {
        return ApiResponse.badRequest(res, 'As of date is required');
      }

      const report = await ReportService.getTrialBalance(asOfDate);
      return ApiResponse.success(res, report, 'Trial balance retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
