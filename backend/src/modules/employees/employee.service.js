const Employee = require('./employee.model');

class EmployeeService {
  static async createEmployee(employeeData) {
    const employee = new Employee(employeeData);
    await employee.save();
    return employee;
  }

  static async getAllEmployees(filters = {}) {
    const query = {};
    if (filters.department) query.department = filters.department;
    if (filters.designation) query.designation = filters.designation;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { employeeCode: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return await Employee.find(query)
      .populate('createdBy', 'name email')
      .sort({ employeeCode: 1 });
  }

  static async getEmployeeById(employeeId) {
    return await Employee.findById(employeeId)
      .populate('createdBy', 'name email');
  }

  static async updateEmployee(employeeId, updateData) {
    return await Employee.findByIdAndUpdate(
      employeeId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  static async deleteEmployee(employeeId) {
    return await Employee.findByIdAndDelete(employeeId);
  }

  static async getEmployeesByDepartment(department) {
    return await Employee.find({ department, status: 'active' });
  }

  static async getActiveEmployees() {
    return await Employee.find({ status: 'active' })
      .sort({ employeeCode: 1 });
  }

  static async getEmployeesByDesignation(designation) {
    return await Employee.find({ designation, status: 'active' });
  }

  static async getTotalEmployees() {
    const result = await Employee.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return result;
  }

  static async updateEmployeeStatus(employeeId, status, reason = '') {
    return await Employee.findByIdAndUpdate(
      employeeId,
      {
        status,
        statusChangeReason: reason,
        statusChangeDate: new Date()
      },
      { new: true }
    );
  }
}

module.exports = EmployeeService;
