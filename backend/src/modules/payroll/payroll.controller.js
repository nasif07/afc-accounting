const { StatusCodes } = require('http-status-codes');
const PayrollService = require('./payroll.service');
const ApiResponse = require('../../utils/apiResponse');

class PayrollController {
  static async createPayroll(req, res, next) {
    try {
      const { employee, month, year, baseSalary, allowances, bonus, deductions, leaveDeduction, description } = req.body;

      if (!employee || !month || !year || !baseSalary) {
        return ApiResponse.badRequest(res, 'Employee, month, year, and base salary are required');
      }

      const payrollData = {
        employee,
        month,
        year,
        baseSalary,
        allowances: allowances || 0,
        bonus: bonus || 0,
        deductions: deductions || 0,
        leaveDeduction: leaveDeduction || 0,
        description,
        createdBy: req.user.userId
      };

      const payroll = await PayrollService.createPayroll(payrollData);
      return ApiResponse.created(res, payroll, 'Payroll created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllPayroll(req, res, next) {
    try {
      const { employee, month, year, approvalStatus, paymentStatus } = req.query;
      const filters = {};
      if (employee) filters.employee = employee;
      if (month) filters.month = month;
      if (year) filters.year = year;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (paymentStatus) filters.paymentStatus = paymentStatus;

      const payroll = await PayrollService.getAllPayroll(filters);
      return ApiResponse.success(res, payroll, 'Payroll records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPayrollById(req, res, next) {
    try {
      const { id } = req.params;
      const payroll = await PayrollService.getPayrollById(id);

      if (!payroll) {
        return ApiResponse.notFound(res, 'Payroll record not found');
      }

      return ApiResponse.success(res, payroll, 'Payroll record retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updatePayroll(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const payroll = await PayrollService.updatePayroll(id, updateData);

      if (!payroll) {
        return ApiResponse.notFound(res, 'Payroll record not found');
      }

      return ApiResponse.success(res, payroll, 'Payroll record updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deletePayroll(req, res, next) {
    try {
      const { id } = req.params;
      const payroll = await PayrollService.deletePayroll(id);

      if (!payroll) {
        return ApiResponse.notFound(res, 'Payroll record not found');
      }

      return ApiResponse.success(res, null, 'Payroll record deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async approvePayroll(req, res, next) {
    try {
      const { id } = req.params;
      const payroll = await PayrollService.approvePayroll(id, req.user.userId);

      if (!payroll) {
        return ApiResponse.notFound(res, 'Payroll record not found');
      }

      return ApiResponse.success(res, payroll, 'Payroll record approved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async rejectPayroll(req, res, next) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return ApiResponse.badRequest(res, 'Rejection reason is required');
      }

      const payroll = await PayrollService.rejectPayroll(id, req.user.userId, rejectionReason);

      if (!payroll) {
        return ApiResponse.notFound(res, 'Payroll record not found');
      }

      return ApiResponse.success(res, payroll, 'Payroll record rejected successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markPayrollAsPaid(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentDate, paymentMode, referenceNumber } = req.body;

      if (!paymentDate || !paymentMode) {
        return ApiResponse.badRequest(res, 'Payment date and mode are required');
      }

      const payroll = await PayrollService.markPayrollAsPaid(id, paymentDate, paymentMode, referenceNumber);

      if (!payroll) {
        return ApiResponse.notFound(res, 'Payroll record not found');
      }

      return ApiResponse.success(res, payroll, 'Payroll marked as paid successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPayrollSummary(req, res, next) {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        return ApiResponse.badRequest(res, 'Month and year are required');
      }

      const summary = await PayrollService.getPayrollSummary(month, year);
      return ApiResponse.success(res, summary, 'Payroll summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async generatePayslip(req, res, next) {
    try {
      const { id } = req.params;
      const pdfPath = await PayrollService.generatePayslip(id);
      
      res.download(pdfPath, `payslip-${id}.pdf`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PayrollController;
