const PettyCashService = require("./pettycash.service");
const ApiResponse = require("../../utils/apiResponse");

class PettyCashController {
  static async getPettyCashTransactions(req, res, next) {
    try {
      const { page, limit, search, startDate, endDate } = req.query;

      const result = await PettyCashService.getJournalBackedTransactions({
        page,
        limit,
        search,
        startDate,
        endDate,
      });

      return ApiResponse.success(
        res,
        result,
        "Petty cash transactions retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getPettyCashReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const result = await PettyCashService.getJournalBackedReport({
        startDate,
        endDate,
      });

      return ApiResponse.success(
        res,
        result,
        "Petty cash report retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new petty cash disbursement
   */
  static async createPettyCash(req, res, next) {
    try {
      const {
        expenseAccount,
        description,
        amount,
        date,
        paymentMode,
        paidTo,
        referenceNumber,
        note,
      } = req.body;

      if (
        !expenseAccount ||
        !amount 
      ) {
        return ApiResponse.badRequest(
          res,
          "expense account, amount are required",
        );
      }

      if (amount <= 0) {
        return ApiResponse.badRequest(res, "Amount must be greater than 0");
      }

      const pettyCashData = {
        expenseAccount,
        description: description.trim(),
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        paymentMode,
        paidTo: paidTo ? paidTo.trim() : undefined,
        referenceNumber: referenceNumber ? referenceNumber.trim() : undefined,
        note: note ? note.trim() : undefined,
        attachments: req.uploadedFiles
          ? Object.values(req.uploadedFiles).map((f) => f.filename)
          : [],
        createdBy: req.user.userId || req.user._id,
      };

      const pettyCash = await PettyCashService.createPettyCash(pettyCashData);

      return ApiResponse.created(
        res,
        pettyCash,
        "Petty cash disbursement created successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all petty cash records with filters
   */
  static async getAllPettyCash(req, res, next) {
    try {
      const { expenseAccount, paymentMode, approvalStatus, dateFrom, dateTo } =
        req.query;

      const filters = {};

      if (expenseAccount) filters.expenseAccount = expenseAccount;
      if (paymentMode) filters.paymentMode = paymentMode;
      if (approvalStatus) filters.approvalStatus = approvalStatus;

      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const pettyCashRecords = await PettyCashService.getAllPettyCash(filters);

      return ApiResponse.success(
        res,
        pettyCashRecords,
        "Petty cash records retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get petty cash by ID
   */
  static async getPettyCashById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Petty cash ID is required");
      }

      const pettyCash = await PettyCashService.getPettyCashById(id);

      return ApiResponse.success(
        res,
        pettyCash,
        "Petty cash record retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update petty cash record
   */
  static async updatePettyCash(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, "Petty cash ID is required");
      }

      if (updateData.amount !== undefined && updateData.amount <= 0) {
        return ApiResponse.badRequest(res, "Amount must be greater than 0");
      }

      const pettyCash = await PettyCashService.updatePettyCash(
        id,
        updateData,
        req.user.userId || req.user._id,
      );

      return ApiResponse.success(
        res,
        pettyCash,
        "Petty cash record updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft delete petty cash record
   */
  static async deletePettyCash(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Petty cash ID is required");
      }

      const pettyCash = await PettyCashService.deletePettyCash(
        id,
        req.user.userId || req.user._id,
      );

      return ApiResponse.success(
        res,
        pettyCash,
        "Petty cash record deleted successfully",
      );
    } catch (error) {
      next(error);
    }
  }

}

module.exports = PettyCashController;
