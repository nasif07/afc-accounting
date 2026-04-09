const Student = require("./student.model");

class StudentService {
  /**
   * Create a new student
   */
  static async createStudent(studentData) {
    const student = new Student(studentData);
    return await student.save();
  }

  /**
   * Get all students with filtering, searching, and pagination
   */
  static async getAllStudents(filters = {}, options = { page: 1, limit: 10 }) {
    const query = {};
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // Filtering
    if (filters.class) query.class = filters.class;
    if (filters.status) query.status = filters.status;

    // Regex Search
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { rollNumber: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Student.find(query).sort({ rollNumber: 1 }).skip(skip).limit(limit),
      Student.countDocuments(query),
    ]);

    return {
      students: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single student by ID
   */
  static async getStudentById(studentId) {
    return await Student.findById(studentId);
  }

  /**
   * Update student details
   * Note: Middleware in Schema handles "pending" calculation if financials change
   */
  static async updateStudent(studentId, updateData) {
    const student = await Student.findById(studentId);
    if (!student) return null;

    student.set(updateData);
    return await student.save(); // This triggers your "pending" logic!
  }

  /**
   * Delete a student
   */
  static async deleteStudent(studentId) {
    return await Student.findByIdAndDelete(studentId);
  }

  /**
   * Financial Update: Specifically for adding payments
   */
  static async updateFeeStatus(studentId, paidAmount) {
    const student = await Student.findById(studentId);
    if (!student) throw new Error("Student not found");

    // Matches the "financials" object in your Schema
    student.financials.totalPaid += Number(paidAmount);

    // The "pre-save" hook in your model will automatically
    // update student.financials.pending = totalPayable - totalPaid
    return await student.save();
  }

  /**
   * Bulk Import
   * Processes each record individually to catch specific errors (like duplicate Roll Numbers)
   */
  static async bulkImportStudents(studentsData) {
    const results = {
      totalProcessed: studentsData.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

    for (const data of studentsData) {
      try {
        const student = new Student(data);
        await student.save();
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          rollNumber: data.rollNumber || "Unknown",
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = StudentService;
