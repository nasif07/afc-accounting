const { StatusCodes } = require("http-status-codes");
const StudentService = require("./student.service");
const ApiResponse = require("../../utils/apiResponse");

class StudentController {
  /**
   * @desc    Create a new student
   * @route   POST /api/students
   */
  static async createStudent(req, res, next) {
    try {
      const { class: className, rollNumber, name } = req.body;

      // Basic validation check before hitting the service
      if (!rollNumber || !name || !className) {
        return ApiResponse.badRequest(
          res,
          "Roll number, name, and class are required",
        );
      }

      const student = await StudentService.createStudent(req.body);
      return ApiResponse.created(res, student, "Student created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @desc    Get all students with filters and pagination
   * @route   GET /api/students
   */
  static async getAllStudents(req, res, next) {
    try {
      const {
        class: className,
        status,
        search,
        page = 1,
        limit = 10,
      } = req.query;

      const filters = {
        ...(className && { class: className }),
        ...(status && { status }),
        ...(search && { search }),
      };

      const result = await StudentService.getAllStudents(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return ApiResponse.success(
        res,
        result,
        "Students retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  static async getStudentById(req, res, next) {
    try {
      // 1. Extract the ID from the request parameters
      const { id } = req.params;

      // 2. Call the service layer to fetch the specific student
      const result = await StudentService.getStudentById(id);

      // 3. Handle case where student might not exist
      if (!result) {
        return ApiResponse.error(res, "Student not found", 404);
      }

      // 4. Return success response
      return ApiResponse.success(res, result, "Student retrieved successfully");
    } catch (error) {
      // 5. Pass any server or database errors to the error middleware
      next(error);
    }
  }

  /**
   * @desc    Update student details
   * @route   PATCH /api/students/:id
   */
  static async updateStudent(req, res, next) {
    try {
      const { id } = req.params;

      // Whitelisting allowed fields (Safer than deleting specific ones)
      const allowedUpdates = [
        "name",
        "class",
        "section",
        "email",
        "phone",
        "status",
        "address",
      ];
      const updateData = {};

      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) updateData[key] = req.body[key];
      });

      const student = await StudentService.updateStudent(id, updateData);
      // ... rest of logic
    } catch (error) {
      next(error);
    }
  }

  /**
   * @desc    Delete a student record
   * @route   DELETE /api/students/:id
   */
  static async deleteStudent(req, res, next) {
    try {
      const { id } = req.params;
      const student = await StudentService.deleteStudent(id);

      if (!student) {
        return ApiResponse.notFound(res, "Student not found");
      }

      return ApiResponse.success(res, null, "Student deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * @desc    Bulk import students from a list
   * @route   POST /api/students/import
   */
  static async bulkImportStudents(req, res, next) {
    try {
      // Logic for handling file vs raw JSON
      const students = req.body.students || req.body;

      if (!Array.isArray(students) || students.length === 0) {
        return ApiResponse.badRequest(
          res,
          "Students data must be a non-empty array",
        );
      }

      const results = await StudentService.bulkImportStudents(students);
      return ApiResponse.success(res, results, "Bulk import completed");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StudentController;
