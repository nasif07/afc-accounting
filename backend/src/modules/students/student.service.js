const Student = require('./student.model');

class StudentService {
  static async createStudent(studentData) {
    const student = new Student(studentData);
    await student.save();
    return student;
  }

  static async getAllStudents(filters = {}) {
    const query = {};
    if (filters.class) query.class = filters.class;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { rollNumber: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return await Student.find(query).sort({ rollNumber: 1 });
  }

  static async getStudentById(studentId) {
    return await Student.findById(studentId);
  }

  static async updateStudent(studentId, updateData) {
    return await Student.findByIdAndUpdate(
      studentId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteStudent(studentId) {
    return await Student.findByIdAndDelete(studentId);
  }

  static async getStudentsByClass(className) {
    return await Student.find({ class: className, status: 'active' });
  }

  static async updateFeeStatus(studentId, paidAmount) {
    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');

    student.totalFeesPaid += paidAmount;
    student.feePendingAmount = student.totalFeesPayable - student.totalFeesPaid;

    await student.save();
    return student;
  }

  static async bulkImportStudents(studentsData) {
    const results = {
      imported: 0,
      failed: 0,
      errors: []
    };

    for (const data of studentsData) {
      try {
        await this.createStudent(data);
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          rollNumber: data.rollNumber,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = StudentService;
