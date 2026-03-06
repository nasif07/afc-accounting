const { StatusCodes } = require('http-status-codes');
const ExpenseService = require('./expense.service');
const ApiResponse = require('../../utils/apiResponse');

class ExpenseController {
  static async createExpense(req, res, next) {
    try {
      const { expenseNumber, category, vendor, description, amount, paymentMode, referenceNumber } = req.body;

      if (!expenseNumber || !category || !description || !amount || !paymentMode) {
        return ApiResponse.badRequest(res, 'Expense number, category, description, amount, and payment mode are required');
      }

      const expenseData = {
        expenseNumber,
        category,
        vendor,
        description,
        amount,
        paymentMode,
        referenceNumber,
        createdBy: req.user.userId,
        attachments: req.uploadedFiles ? Object.values(req.uploadedFiles).map(f => f.filename) : []
      };

      const expense = await ExpenseService.createExpense(expenseData);
      return ApiResponse.created(res, expense, 'Expense created successfully');
    } catch (error) {
      next(error);
    }
  }

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
      return ApiResponse.success(res, expenses, 'Expenses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getExpenseById(req, res, next) {
    try {
      const { id } = req.params;
      const expense = await ExpenseService.getExpenseById(id);

      if (!expense) {
        return ApiResponse.notFound(res, 'Expense not found');
      }

      return ApiResponse.success(res, expense, 'Expense retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateExpense(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const expense = await ExpenseService.updateExpense(id, updateData);

      if (!expense) {
        return ApiResponse.notFound(res, 'Expense not found');
      }

      return ApiResponse.success(res, expense, 'Expense updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpense(req, res, next) {
    try {
      const { id } = req.params;
      const expense = await ExpenseService.deleteExpense(id);

      if (!expense) {
        return ApiResponse.notFound(res, 'Expense not found');
      }

      return ApiResponse.success(res, null, 'Expense deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async approveExpense(req, res, next) {
    try {
      const { id } = req.params;
      const expense = await ExpenseService.approveExpense(id, req.user.userId);

      if (!expense) {
        return ApiResponse.notFound(res, 'Expense not found');
      }

      return ApiResponse.success(res, expense, 'Expense approved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async rejectExpense(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return ApiResponse.badRequest(res, 'Rejection reason is required');
      }

      const expense = await ExpenseService.rejectExpense(id, req.user.userId, rejectionReason);

      if (!expense) {
        return ApiResponse.notFound(res, 'Expense not found');
      }

      return ApiResponse.success(res, expense, 'Expense rejected successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTotalExpenses(req, res, next) {
    try {
      const { category, dateFrom, dateTo } = req.query;
      const filters = {};
      if (category) filters.category = category;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const totals = await ExpenseService.getTotalExpenses(filters);
      return ApiResponse.success(res, totals, 'Expense totals retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ExpenseController;
