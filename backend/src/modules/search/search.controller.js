const { StatusCodes } = require('http-status-codes');
const SearchService = require('./search.service');
const ApiResponse = require('../../utils/apiResponse');

class SearchController {
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
}

module.exports = SearchController;
