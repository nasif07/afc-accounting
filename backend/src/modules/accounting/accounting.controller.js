const { StatusCodes } = require('http-status-codes');
const AccountingService = require('./accounting.service');
const ApiResponse = require('../../utils/apiResponse');

class AccountingController {
  static async createJournalEntry(req, res, next) {
    try {
      // ✅ FIX #1 & #2: Changed referenceNumber → voucherNumber, added voucherDate validation
      const { voucherNumber, voucherDate, transactionType, description, bookEntries } = req.body;

      // ✅ FIX #2: Added voucherDate validation
      if (!voucherNumber || !voucherDate || !transactionType || !bookEntries || bookEntries.length === 0) {
        return ApiResponse.badRequest(
          res,
          'Voucher number, date, transaction type, and book entries are required'
        );
      }

      // ✅ FIX #8: Validate minimum 2 line items
      if (bookEntries.length < 2) {
        return ApiResponse.badRequest(
          res,
          'Journal entry must have at least 2 line items'
        );
      }

      // ✅ FIX #1: Changed referenceNumber → voucherNumber, added voucherDate
      const entryData = {
        voucherNumber,
        voucherDate,
        transactionType,
        description,
        bookEntries,
        createdBy: req.user.userId
      };

      const entry = await AccountingService.createJournalEntry(entryData);
      return ApiResponse.created(res, entry, 'Journal entry created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllEntries(req, res, next) {
    try {
      const { transactionType, approvalStatus, dateFrom, dateTo } = req.query;
      const filters = {};
      if (transactionType) filters.transactionType = transactionType;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const entries = await AccountingService.getAllEntries(filters);
      return ApiResponse.success(res, entries, 'Journal entries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getEntryById(req, res, next) {
    try {
      const { id } = req.params;
      const entry = await AccountingService.getEntryById(id);

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(res, entry, 'Journal entry retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateEntry(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const entry = await AccountingService.updateEntry(id, updateData);

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(res, entry, 'Journal entry updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteEntry(req, res, next) {
    try {
      const { id } = req.params;
      const entry = await AccountingService.deleteEntry(id, req.user.userId);

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(res, null, 'Journal entry deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async approveEntry(req, res, next) {
    try {
      const { id } = req.params;
      const entry = await AccountingService.approveEntry(id, req.user.userId);

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(res, entry, 'Journal entry approved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async rejectEntry(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return ApiResponse.badRequest(res, 'Rejection reason is required');
      }

      const entry = await AccountingService.rejectEntry(id, req.user.userId, rejectionReason);

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(res, entry, 'Journal entry rejected successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AccountingController;
