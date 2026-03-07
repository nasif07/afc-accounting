const { StatusCodes } = require('http-status-codes');
const SearchService = require('./search.service');
const ApiResponse = require('../../utils/apiResponse');

class SearchController {
  static async globalSearch(req, res, next) {
    try {
      const { q, dateFrom, dateTo } = req.query;

      if (!q) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const results = await SearchService.globalSearch(q, filters);
      return ApiResponse.success(res, results, 'Global search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async searchReceipts(req, res, next) {
    try {
      const { q, dateFrom, dateTo, approvalStatus } = req.query;

      if (!q) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (approvalStatus) filters.approvalStatus = approvalStatus;

      const results = await SearchService.searchReceipts(q, filters);
      return ApiResponse.success(res, results, 'Receipt search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async searchExpenses(req, res, next) {
    try {
      const { q, dateFrom, dateTo, category, approvalStatus } = req.query;

      if (!q) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (category) filters.category = category;
      if (approvalStatus) filters.approvalStatus = approvalStatus;

      const results = await SearchService.searchExpenses(q, filters);
      return ApiResponse.success(res, results, 'Expense search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async searchJournalEntries(req, res, next) {
    try {
      const { q, dateFrom, dateTo, transactionType, approvalStatus } = req.query;

      if (!q) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (transactionType) filters.transactionType = transactionType;
      if (approvalStatus) filters.approvalStatus = approvalStatus;

      const results = await SearchService.searchJournalEntries(q, filters);
      return ApiResponse.success(res, results, 'Journal entry search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async searchStudents(req, res, next) {
    try {
      const { q, class: className, status } = req.query;

      if (!q) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      const filters = {};
      if (className) filters.class = className;
      if (status) filters.status = status;

      const results = await SearchService.searchStudents(q, filters);
      return ApiResponse.success(res, results, 'Student search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async searchByAmountRange(req, res, next) {
    try {
      const { minAmount, maxAmount, dateFrom, dateTo } = req.query;

      if (!minAmount || !maxAmount) {
        return ApiResponse.badRequest(res, 'Min amount and max amount are required');
      }

      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const results = await SearchService.searchByAmountRange(
        parseFloat(minAmount),
        parseFloat(maxAmount),
        filters
      );

      return ApiResponse.success(res, results, 'Amount range search completed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SearchController;
