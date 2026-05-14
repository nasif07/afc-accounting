const PettyCashService = require("./pettycash.service");
const ApiResponse = require("../../utils/apiResponse");

class PettyCashController {
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
      if (error.message.includes("already exists")) {
        return ApiResponse.badRequest(res, error.message);
      }
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
      if (error.message === "Petty cash record not found") {
        return ApiResponse.notFound(res, error.message);
      }
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
      if (error.message === "Petty cash record not found") {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes("Cannot update")) {
        return ApiResponse.badRequest(res, error.message);
      }

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
      if (error.message === "Petty cash record not found") {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes("Cannot delete")) {
        return ApiResponse.badRequest(res, error.message);
      }

      next(error);
    }
  }

  /**
   * Approve petty cash record
   */
  static async approvePettyCash(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, "Petty cash ID is required");
      }

      const pettyCash = await PettyCashService.approvePettyCash(
        id,
        req.user.userId || req.user._id,
      );

      return ApiResponse.success(
        res,
        pettyCash,
        "Petty cash record approved and journal entry created successfully",
      );
    } catch (error) {
      if (error.message === "Petty cash record not found") {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes("Cannot approve")) {
        return ApiResponse.badRequest(res, error.message);
      }

      next(error);
    }
  }

  /**
   * Reject petty cash record
   */
  static async rejectPettyCash(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, "Petty cash ID is required");
      }

      if (!rejectionReason) {
        return ApiResponse.badRequest(res, "Rejection reason is required");
      }

      const pettyCash = await PettyCashService.rejectPettyCash(
        id,
        req.user.userId || req.user._id,
        rejectionReason,
      );

      return ApiResponse.success(
        res,
        pettyCash,
        "Petty cash record rejected successfully",
      );
    } catch (error) {
      if (error.message === "Petty cash record not found") {
        return ApiResponse.notFound(res, error.message);
      }

      if (
        error.message.includes("Cannot reject") ||
        error.message.includes("required")
      ) {
        return ApiResponse.badRequest(res, error.message);
      }

      next(error);
    }
  }

  /**
   * Get pending petty cash approvals
   */
  static async getPendingApprovals(req, res, next) {
    try {
      const pettyCashRecords = await PettyCashService.getPendingApprovals();

      return ApiResponse.success(
        res,
        pettyCashRecords,
        "Pending petty cash records retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get petty cash statistics
   */
  static async getPettyCashStats(req, res, next) {
    try {
      const { expenseAccount, dateFrom, dateTo } = req.query;

      const filters = {};

      if (expenseAccount) filters.expenseAccount = expenseAccount;

      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const stats = await PettyCashService.getPettyCashStats(filters);

      return ApiResponse.success(
        res,
        stats,
        "Petty cash statistics retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get petty cash by expense account
   */
  static async getPettyCashByExpenseAccount(req, res, next) {
    try {
      const { expenseAccountId } = req.params;

      if (!expenseAccountId) {
        return ApiResponse.badRequest(res, "Expense account ID is required");
      }

      const pettyCashRecords =
        await PettyCashService.getPettyCashByExpenseAccount(expenseAccountId);

      return ApiResponse.success(
        res,
        pettyCashRecords,
        "Petty cash records by expense account retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate petty cash report with summaries
   */
  static async generatePettyCashReport(req, res, next) {
    try {
      const { dateFrom, dateTo, accountingStatus, expenseAccount } = req.query;

      const filters = {};

      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (accountingStatus) filters.accountingStatus = accountingStatus;
      if (expenseAccount) filters.expenseAccount = expenseAccount;

      const report = await PettyCashService.generatePettyCashReport(filters);

      return ApiResponse.success(
        res,
        report,
        "Petty cash report generated successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PettyCashController;
