const { StatusCodes } = require('http-status-codes');
const ExpenseService = require('./expense.service');
const ApiResponse = require('../../utils/apiResponse');
const { EXPENSE_CATEGORIES, PAYMENT_MODES } = require('../../config/constants');

class ExpenseController {
  /**
   * Create a new expense
   */
  static async createExpense(req, res, next) {
    try {
      const {
        expenseNumber,
        category,
        vendor,
        description,
        amount,
        date,
        paymentMode,
        referenceNumber,
        chequeNumber,
        chequeDate,
        bankName,
        invoiceNumber,
        invoiceDate,
        billAmount,
        coaAccount,
      } = req.body;

      // Validate required fields
      if (!expenseNumber || !category || !description || !amount || !paymentMode) {
        return ApiResponse.badRequest(
          res,
          'Expense number, category, description, amount, and payment mode are required'
        );
      }

      // Validate category
      if (!Object.values(EXPENSE_CATEGORIES).includes(category)) {
        return ApiResponse.badRequest(
          res,
          `Category must be one of: ${Object.values(EXPENSE_CATEGORIES).join(', ')}`
        );
      }

      // Validate payment mode
      if (!Object.values(PAYMENT_MODES).includes(paymentMode)) {
        return ApiResponse.badRequest(
          res,
          `Payment mode must be one of: ${Object.values(PAYMENT_MODES).join(', ')}`
        );
      }

      // Validate amount
      if (amount <= 0) {
        return ApiResponse.badRequest(res, 'Amount must be greater than 0');
      }

      const expenseData = {
        expenseNumber: expenseNumber.trim().toUpperCase(),
        category,
        vendor: vendor || undefined,
        description: description.trim(),
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        paymentMode,
        referenceNumber: referenceNumber ? referenceNumber.trim() : undefined,
        chequeNumber: chequeNumber ? chequeNumber.trim() : undefined,
        chequeDate: chequeDate ? new Date(chequeDate) : undefined,
        bankName: bankName ? bankName.trim() : undefined,
        invoiceNumber: invoiceNumber ? invoiceNumber.trim() : undefined,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        billAmount: billAmount ? parseFloat(billAmount) : undefined,
        coaAccount: coaAccount || undefined,
        attachments: req.uploadedFiles
          ? Object.values(req.uploadedFiles).map((f) => f.filename)
          : [],
        createdBy: req.user.userId,
      };

      const expense = await ExpenseService.createExpense(expenseData);
      return ApiResponse.created(res, expense, 'Expense created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get all expenses with filters
   */
  static async getAllExpenses(req, res, next) {
    try {
      const { category, vendor, approvalStatus, dateFrom, dateTo } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (vendor) filters.vendor = vendor;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const expenses = await ExpenseService.getAllExpenses(filters);
      return ApiResponse.success(
        res,
        expenses,
        'Expenses retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expense by ID
   */
  static async getExpenseById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Expense ID is required');
      }

      const expense = await ExpenseService.getExpenseById(id);
      return ApiResponse.success(res, expense, 'Expense retrieved successfully');
    } catch (error) {
      if (error.message === 'Expense not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Update expense
   */
  static async updateExpense(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, 'Expense ID is required');
      }

      // Validate category if provided
      if (updateData.category && !Object.values(EXPENSE_CATEGORIES).includes(updateData.category)) {
        return ApiResponse.badRequest(
          res,
          `Category must be one of: ${Object.values(EXPENSE_CATEGORIES).join(', ')}`
        );
      }

      // Validate payment mode if provided
      if (updateData.paymentMode && !Object.values(PAYMENT_MODES).includes(updateData.paymentMode)) {
        return ApiResponse.badRequest(
          res,
          `Payment mode must be one of: ${Object.values(PAYMENT_MODES).join(', ')}`
        );
      }

      // Validate amount if provided
      if (updateData.amount !== undefined && updateData.amount <= 0) {
        return ApiResponse.badRequest(res, 'Amount must be greater than 0');
      }

      const expense = await ExpenseService.updateExpense(id, updateData, req.user.userId);
      return ApiResponse.success(res, expense, 'Expense updated successfully');
    } catch (error) {
      if (error.message === 'Expense not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot update')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Soft delete expense
   */
  static async deleteExpense(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Expense ID is required');
      }

      const expense = await ExpenseService.deleteExpense(id, req.user.userId);
      return ApiResponse.success(res, expense, 'Expense deleted successfully');
    } catch (error) {
      if (error.message === 'Expense not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot delete')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Restore deleted expense
   */
  static async restoreExpense(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Expense ID is required');
      }

      const expense = await ExpenseService.restoreExpense(id, req.user.userId);
      return ApiResponse.success(res, expense, 'Expense restored successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Approve expense
   */
  static async approveExpense(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponse.badRequest(res, 'Expense ID is required');
      }

      const expense = await ExpenseService.approveExpense(id, req.user.userId);
      return ApiResponse.success(res, expense, 'Expense approved successfully');
    } catch (error) {
      if (error.message === 'Expense not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot approve')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Reject expense
   */
  static async rejectExpense(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!id) {
        return ApiResponse.badRequest(res, 'Expense ID is required');
      }

      if (!rejectionReason) {
        return ApiResponse.badRequest(res, 'Rejection reason is required');
      }

      const expense = await ExpenseService.rejectExpense(
        id,
        req.user.userId,
        rejectionReason
      );
      return ApiResponse.success(res, expense, 'Expense rejected successfully');
    } catch (error) {
      if (error.message === 'Expense not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot reject') || error.message.includes('required')) {
        return ApiResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get pending approvals
   */
  static async getPendingApprovals(req, res, next) {
    try {
      const expenses = await ExpenseService.getPendingApprovals();
      return ApiResponse.success(
        res,
        expenses,
        'Pending expenses retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get total pending amount
   */
  static async getTotalPendingAmount(req, res, next) {
    try {
      const totals = await ExpenseService.getTotalPendingAmount();
      return ApiResponse.success(
        res,
        totals,
        'Total pending amount retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get total expenses with filters
   */
  static async getTotalExpenses(req, res, next) {
    try {
      const { category, dateFrom, dateTo } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const totals = await ExpenseService.getTotalApprovedAmount(filters);
      return ApiResponse.success(
        res,
        totals,
        'Expense totals retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ExpenseController;
