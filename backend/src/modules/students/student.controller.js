const { StatusCodes } = require('http-status-codes');
const StudentService = require('./student.service');
const ApiResponse = require('../../utils/apiResponse');

class StudentController {
  static async createStudent(req, res, next) {
    try {
      const { rollNumber, name, class: className, section, email, phone, parentName, parentEmail, parentPhone, address, dateOfBirth, totalFeesPayable } = req.body;

      if (!rollNumber || !name || !className) {
        return ApiResponse.badRequest(res, 'Roll number, name, and class are required');
      }

      const studentData = {
        rollNumber,
        name,
        class: className,
        section,
        email,
        phone,
        parentName,
        parentEmail,
        parentPhone,
        address,
        dateOfBirth,
        totalFeesPayable: totalFeesPayable || 0,
        feePendingAmount: totalFeesPayable || 0
      };

      const student = await StudentService.createStudent(studentData);
      return ApiResponse.created(res, student, 'Student created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAllStudents(req, res, next) {
    try {
      const { class: className, status, search } = req.query;
      const filters = {};
      if (className) filters.class = className;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const students = await StudentService.getAllStudents(filters);
      return ApiResponse.success(res, students, 'Students retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStudentById(req, res, next) {
    try {
      const { id } = req.params;
      const student = await StudentService.getStudentById(id);

      if (!student) {
        return ApiResponse.notFound(res, 'Student not found');
      }

      return ApiResponse.success(res, student, 'Student retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStudent(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const student = await StudentService.updateStudent(id, updateData);

      if (!student) {
        return ApiResponse.notFound(res, 'Student not found');
      }

      return ApiResponse.success(res, student, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteStudent(req, res, next) {
    try {
      const { id } = req.params;
      const student = await StudentService.deleteStudent(id);

      if (!student) {
        return ApiResponse.notFound(res, 'Student not found');
      }

      return ApiResponse.success(res, null, 'Student deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async bulkImportStudents(req, res, next) {
    try {
      if (!req.uploadedFiles || !req.uploadedFiles.file) {
        return ApiResponse.badRequest(res, 'No file uploaded');
      }

      // Parse CSV/Excel file (implementation depends on file format)
      // For now, assuming JSON array in request body
      const { students } = req.body;

      if (!Array.isArray(students)) {
        return ApiResponse.badRequest(res, 'Students data must be an array');
      }

      const results = await StudentService.bulkImportStudents(students);
      return ApiResponse.success(res, results, 'Bulk import completed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StudentController;
