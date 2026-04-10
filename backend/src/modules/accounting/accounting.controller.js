const AccountingService = require('./accounting.service');
const ApiResponse = require('../../utils/apiResponse');

class AccountingController {
  static async getTrialBalanceReport(req, res, next) {
    try {
      const { asOfDate } = req.query;
      const report = await AccountingService.generateTrialBalance(
        asOfDate ? new Date(asOfDate) : new Date()
      );
      return ApiResponse.success(res, report, "Trial Balance retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getIncomeStatementReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, "Start date and end date are required");
      }
      const report = await AccountingService.generateIncomeStatement(startDate, endDate);
      return ApiResponse.success(res, report, "Income Statement retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getBalanceSheetReport(req, res, next) {
    try {
      const { asOfDate } = req.query;
      const report = await AccountingService.generateBalanceSheet(
        asOfDate ? new Date(asOfDate) : new Date()
      );
      return ApiResponse.success(res, report, "Balance Sheet retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getCashFlowReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, "Start date and end date are required");
      }
      const report = await AccountingService.generateCashFlowStatement(startDate, endDate);
      return ApiResponse.success(res, report, "Cash Flow Statement retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getGeneralLedger(req, res, next) {
    try {
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;

      const ledger = await AccountingService.getGeneralLedgerForAccount(
        accountId,
        startDate,
        endDate
      );

      return ApiResponse.success(
        res,
        ledger,
        "General Ledger retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAccountBalance(req, res, next) {
    try {
      const { accountId } = req.params;
      const { asOfDate } = req.query;

      const balanceData = await AccountingService.calculateAccountBalance(
        accountId,
        asOfDate ? new Date(asOfDate) : new Date()
      );

      return ApiResponse.success(
        res,
        balanceData,
        "Account balance calculated successfully"
      );
    } catch (error) {
      next(error);
    }
  }


  static async createJournalEntry(req, res, next) {
    try {
      const {
        voucherNumber,
        voucherDate,
        transactionType,
        description,
        referenceNumber,
        bookEntries,
        attachments,
      } = req.body;

      console.log(req.body);

      if (!voucherDate || !transactionType || !bookEntries || bookEntries.length === 0) {
        return ApiResponse.badRequest(
          res,
          'Voucher date, transaction type, and book entries are required'
        );
      }

      if (!Array.isArray(bookEntries) || bookEntries.length < 2) {
        return ApiResponse.badRequest(
          res,
          'Journal entry must have at least 2 line items'
        );
      }

      const entryData = {
        voucherDate,
        transactionType,
        description,
        referenceNumber,
        bookEntries,
        attachments: Array.isArray(attachments) ? attachments : [],
        createdBy: req.user.userId,
      };

      if (voucherNumber) {
        entryData.voucherNumber = voucherNumber;
      }

      const entry = await AccountingService.createJournalEntry(entryData);

      return ApiResponse.created(
        res,
        entry,
        'Journal entry created successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAllEntries(req, res, next) {
    try {
      const { transactionType, approvalStatus, status, dateFrom, dateTo } = req.query;

      const filters = {};
      if (transactionType) filters.transactionType = transactionType;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (status) filters.status = status;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const entries = await AccountingService.getAllEntries(filters);

      return ApiResponse.success(
        res,
        entries,
        'Journal entries retrieved successfully'
      );
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

      return ApiResponse.success(
        res,
        entry,
        'Journal entry retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateEntry(req, res, next) {
    try {
      const { id } = req.params;

      const forbiddenFields = [
        'createdBy',
        'approvedBy',
        'approvalDate',
        'approvalStatus',
        'deletedAt',
        'deletedBy',
        'isBalanced',
        'isLocked',
        'reversalOf',
        'status',
        'totalDebit',
        'totalCredit',
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
        'voucherNumber',
        'voucherDate',
        'transactionType',
        'description',
        'referenceNumber',
        'bookEntries',
        'attachments',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const entry = await AccountingService.updateEntry(id, updateData);

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(
        res,
        entry,
        'Journal entry updated successfully'
      );
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

      return ApiResponse.success(
        res,
        entry,
        'Journal entry deleted successfully'
      );
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

      return ApiResponse.success(
        res,
        entry,
        'Journal entry approved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async rejectEntry(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason || !String(rejectionReason).trim()) {
        return ApiResponse.badRequest(res, 'Rejection reason is required');
      }

      const entry = await AccountingService.rejectEntry(
        id,
        req.user.userId,
        String(rejectionReason).trim()
      );

      if (!entry) {
        return ApiResponse.notFound(res, 'Journal entry not found');
      }

      return ApiResponse.success(
        res,
        entry,
        'Journal entry rejected successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getPendingApprovals(req, res, next) {
    try {
      const entries = await AccountingService.getPendingApprovals();

      return ApiResponse.success(
        res,
        entries,
        'Pending journal entries retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getEntriesByAccount(req, res, next) {
    try {
      const { accountId } = req.params;

      const entries = await AccountingService.getEntriesByAccount(accountId);

      return ApiResponse.success(
        res,
        entries,
        'Journal entries by account retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getTrialBalance(req, res, next) {
    try {
      const trialBalance = await AccountingService.getTrialBalance();

      return ApiResponse.success(
        res,
        trialBalance,
        'Trial balance retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AccountingController;
