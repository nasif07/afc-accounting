const { StatusCodes } = require('http-status-codes');
const EmployeeService = require('./employee.service');
const ApiResponse = require('../../utils/apiResponse');

class EmployeeController {
  static async createEmployee(req, res, next) {
    try {
      const { employeeCode, name, designation, department, email, phone, dateOfJoining, salaryType, baseSalary, address, city, state, pinCode } = req.body;

      if (!employeeCode || !name || !designation || !department) {
        return ApiResponse.badRequest(res, 'Employee code, name, designation, and department are required');
      }

      const employeeData = {
        employeeCode,
        name,
        designation,
        department,
        email,
        phone,
        dateOfJoining,
        salaryType,
        baseSalary,
        address,
        city,
        state,
        pinCode,
        createdBy: req.user.userId
      };

      const employee = await EmployeeService.createEmployee(employeeData);
      return ApiResponse.created(res, employee, 'Employee created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllEmployees(req, res, next) {
    try {
      const { department, designation, status, search } = req.query;
      const filters = {};
      if (department) filters.department = department;
      if (designation) filters.designation = designation;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const employees = await EmployeeService.getAllEmployees(filters);
      return ApiResponse.success(res, employees, 'Employees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getEmployeeById(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await EmployeeService.getEmployeeById(id);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      return ApiResponse.success(res, employee, 'Employee retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const employee = await EmployeeService.updateEmployee(id, updateData);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      return ApiResponse.success(res, employee, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await EmployeeService.deleteEmployee(id);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      return ApiResponse.success(res, null, 'Employee deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTotalEmployees(req, res, next) {
    try {
      const totals = await EmployeeService.getTotalEmployees();
      return ApiResponse.success(res, totals, 'Employee count retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployeeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return ApiResponse.badRequest(res, 'Status is required');
      }

      const employee = await EmployeeService.updateEmployeeStatus(id, status, reason);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      return ApiResponse.success(res, employee, 'Employee status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EmployeeController;
