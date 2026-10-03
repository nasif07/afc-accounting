const AccountingService = require("./accounting.service");
const ApiResponse = require("../../utils/apiResponse");

class AccountingController {
  static async getTrialBalanceReport(req, res, next) {
    try {
      const { asOfDate } = req.query;

      const report = await AccountingService.generateTrialBalance(
        asOfDate ? new Date(asOfDate) : new Date(),
      );

      return ApiResponse.success(
        res,
        report,
        "Trial Balance retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getIncomeStatementReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(
          res,
          "Start date and end date are required",
        );
      }

      const report = await AccountingService.generateIncomeStatement(
        startDate,
        endDate,
      );

      return ApiResponse.success(
        res,
        report,
        "Income Statement retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getBalanceSheetReport(req, res, next) {
    try {
      const { asOfDate } = req.query;

      const report = await AccountingService.generateBalanceSheet(
        asOfDate ? new Date(asOfDate) : new Date(),
      );

      return ApiResponse.success(
        res,
        report,
        "Balance Sheet retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getReceiptsPaymentsReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(
          res,
          "Start date and end date are required",
        );
      }

      const report = await AccountingService.generateReceiptsAndPayments(
        startDate,
        endDate,
      );

      return ApiResponse.success(
        res,
        report,
        "Receipts & Payments Account retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getCashFlowReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(
          res,
          "Start date and end date are required",
        );
      }

      const report = await AccountingService.generateCashFlowStatement(
        startDate,
        endDate,
      );

      return ApiResponse.success(
        res,
        report,
        "Cash Flow Statement retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getGeneralLedger(req, res, next) {
    try {
      const { accountId } = req.params;
      const { startDate, endDate, page, limit } = req.query;

      const ledger = await AccountingService.getGeneralLedgerForAccount(
        accountId,
        startDate,
        endDate,
        { page, limit },
      );

      return ApiResponse.success(
        res,
        ledger,
        "General Ledger retrieved successfully",
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
        requiresApproval,
      } = req.body;


      if (!voucherDate || !transactionType || !bookEntries) {
        return ApiResponse.badRequest(
          res,
          "Voucher date, transaction type, and book entries are required",
        );
      }

      if (!Array.isArray(bookEntries) || bookEntries.length < 2) {
        return ApiResponse.badRequest(
          res,
          "Journal entry must have at least 2 line items",
        );
      }

      // Per-line and balance validation (valid account, no negative/dual
      // debit-credit, debits == credits) is AccountingService's job — it
      // already re-validates via validateDoubleEntry/validateAccounts
      // inside createJournalEntry below, so it isn't duplicated here.

      const entryData = {
        voucherDate,
        transactionType,
        description,
        referenceNumber,
        bookEntries,

        attachments: Array.isArray(attachments) ? attachments : [],

        createdBy: req.user.userId || req.user._id,

        // ==============================
        // APPROVAL LOGIC
        // ==============================

        requiresApproval: requiresApproval !== false,

        sourceModule: "manual",
      };

      // Optional voucher number
      if (voucherNumber) {
        entryData.voucherNumber = voucherNumber;
      }

      // ==============================
      // CREATE ENTRY
      // ==============================

      const entry = await AccountingService.createJournalEntry(entryData);

      // ==============================
      // RESPONSE MESSAGE
      // ==============================

      const message = entryData.requiresApproval
        ? "Journal entry created and sent for director approval"
        : "Journal entry created and auto approved successfully";

      return ApiResponse.created(res, entry, message);
    } catch (error) {
      next(error);
    }
  }

  static async getAllEntries(req, res, next) {
    try {
      const {
        transactionType,
        approvalStatus,
        status,
        sourceModule,
        account,
        dateFrom,
        dateTo,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const filters = {};

      if (transactionType) filters.transactionType = transactionType;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (status) filters.status = status;
      if (sourceModule) filters.sourceModule = sourceModule;
      if (account) filters.account = account;

      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      if (page) filters.page = page;
      if (limit) filters.limit = limit;
      if (sortBy) filters.sortBy = sortBy;
      if (sortOrder) filters.sortOrder = sortOrder;

      const result = await AccountingService.getAllEntries(filters);

      return ApiResponse.success(
        res,
        result,
        "Journal entries retrieved successfully",
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
        return ApiResponse.notFound(res, "Journal entry not found");
      }

      return ApiResponse.success(
        res,
        entry,
        "Journal entry retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateEntry(req, res, next) {
    try {
      const { id } = req.params;

      // Every field a journal entry edit may touch. Everything absent from
      // these two lists — amounts, accounts, voucher number, transaction
      // type, and all approval/lifecycle state — is permanently immutable;
      // corrections to those go through a reversing entry, never this path.
      // The window/toggle/finalized-period checks live in the service, which
      // is the only layer that can see the stored entry.
      const EDITABLE_FIELDS = [
        "voucherDate",
        "description",
        "referenceNumber",
        "bookEntries",
        "attachments",
      ];
      const EDITABLE_LINE_FIELDS = ["description"];

      // Reject rather than silently drop. The previous implementation
      // whitelisted by copying known keys and ignoring the rest, so a client
      // sending `debit` got a 200 and no change — indistinguishable from a
      // successful amount edit. Naming the offending fields makes the
      // immutability rule discoverable from the API alone.
      const rejectedFields = Object.keys(req.body).filter(
        (field) => !EDITABLE_FIELDS.includes(field),
      );

      if (rejectedFields.length > 0) {
        return ApiResponse.badRequest(
          res,
          `${rejectedFields.join(", ")} cannot be edited. Amounts, accounts, and approval fields are permanently locked — post a reversing entry instead.`,
        );
      }

      if (req.body.bookEntries !== undefined) {
        if (!Array.isArray(req.body.bookEntries)) {
          return ApiResponse.badRequest(res, "bookEntries must be an array");
        }

        for (let index = 0; index < req.body.bookEntries.length; index += 1) {
          const line = req.body.bookEntries[index] || {};
          const rejectedLineFields = Object.keys(line).filter(
            (field) => !EDITABLE_LINE_FIELDS.includes(field),
          );

          if (rejectedLineFields.length > 0) {
            return ApiResponse.badRequest(
              res,
              `Line ${index + 1}: ${rejectedLineFields.join(", ")} cannot be edited. Only a line's description can change — post a reversing entry to correct an amount or account.`,
            );
          }
        }
      }

      const updateData = {};

      for (const field of EDITABLE_FIELDS) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // req.user (not the payload) is the source of actor identity — userName
      // and userRole are required+enum on auditLog.model.js, so a payload-fed
      // value could fail schema validation and lose the change-log row.
      const entry = await AccountingService.updateEntry(
        id,
        updateData,
        req.user,
      );

      return ApiResponse.success(
        res,
        entry,
        "Journal entry updated successfully",
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
        return ApiResponse.notFound(res, "Journal entry not found");
      }

      return ApiResponse.success(
        res,
        entry,
        "Journal entry deleted successfully",
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
        return ApiResponse.notFound(res, "Journal entry not found");
      }

      return ApiResponse.success(
        res,
        entry,
        "Journal entry approved successfully",
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
        return ApiResponse.badRequest(res, "Rejection reason is required");
      }

      const entry = await AccountingService.rejectEntry(
        id,
        req.user.userId,
        String(rejectionReason).trim(),
      );

      if (!entry) {
        return ApiResponse.notFound(res, "Journal entry not found");
      }

      return ApiResponse.success(
        res,
        entry,
        "Journal entry rejected successfully",
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
        "Pending journal entries retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

}

module.exports = AccountingController;
