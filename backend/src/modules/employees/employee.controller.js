const { StatusCodes } = require('http-status-codes');
const EmployeeService = require('./employee.service');
const ApiResponse = require('../../utils/apiResponse');

const VALID_STATUSES = ['active', 'inactive', 'on-leave', 'resigned'];

class EmployeeController {
  static async createEmployee(req, res, next) {
    try {
      const { employeeCode, name, designation } = req.body;

      if (!employeeCode || !name || !designation) {
        return ApiResponse.badRequest(res, 'Employee code, name, and designation are required');
      }

      const employee = await EmployeeService.createEmployee({
        ...req.body,
        createdBy: req.user.userId,
      });
      return ApiResponse.created(res, employee, 'Employee created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllEmployees(req, res, next) {
    try {
      const { department, designation, status, search } = req.query;

      if (status && !VALID_STATUSES.includes(status)) {
        return ApiResponse.badRequest(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

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
      const {
        name, email, phone, designation, department,
        dateOfJoining, dateOfBirth,
        address, city, state, zipCode, country,
        bankAccountNumber, bankName, notes,
        emergencyContactName, emergencyContactRelationship,
        emergencyContactPhone, emergencyContactAltPhone, emergencyContactAddress,
      } = req.body;

      const updateData = {
        name, email, phone, designation, department,
        dateOfJoining, dateOfBirth,
        address, city, state, zipCode, country,
        bankAccountNumber, bankName, notes,
        emergencyContactName, emergencyContactRelationship,
        emergencyContactPhone, emergencyContactAltPhone, emergencyContactAddress,
      };

      // Strip undefined so Mongoose doesn't unset fields the caller didn't send
      Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

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

      if (!VALID_STATUSES.includes(status)) {
        return ApiResponse.badRequest(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
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
