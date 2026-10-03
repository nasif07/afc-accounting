const { StatusCodes } = require('http-status-codes');
const SearchService = require('./search.service');
const ApiResponse = require('../../utils/apiResponse');

class SearchController {
  static async globalSearch(req, res, next) {
    try {
      const { q, limit } = req.query;

      // Role comes from the authenticated session, never the query string —
      // it decides which collections are searched at all.
      const results = await SearchService.globalSearch(q, {
        role: req.user?.role,
        limit,
      });

      return ApiResponse.success(res, results, "Search completed successfully");
    } catch (error) {
      next(error);
    }
  }

  static async searchJournalEntries(req, res, next) {
    try {
      const {
        q,
        dateFrom,
        dateTo,
        transactionType,
        approvalStatus,
        sourceModule,
        account,
        sortBy,
        sortOrder,
      } = req.query;

      if (!q) {
        return ApiResponse.badRequest(res, 'Search query is required');
      }

      // SearchService.searchJournalEntries sanitises account/sourceModule/
      // sortBy itself — this route has no validate() middleware.
      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (transactionType) filters.transactionType = transactionType;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (sourceModule) filters.sourceModule = sourceModule;
      if (account) filters.account = account;
      if (sortBy) filters.sortBy = sortBy;
      if (sortOrder) filters.sortOrder = sortOrder;

      const results = await SearchService.searchJournalEntries(q, filters);
      return ApiResponse.success(res, results, 'Journal entry search completed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SearchController;
