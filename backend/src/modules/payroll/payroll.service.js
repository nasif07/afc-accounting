const Payroll = require('./payroll.model');
const PDFGenerator = require('../../utils/pdfGenerator');

class PayrollService {
  static async createPayroll(payrollData) {
    // Calculate net salary
    const netSalary = this.calculateNetSalary(payrollData);
    payrollData.netSalary = netSalary;

    const payroll = new Payroll(payrollData);
    await payroll.save();
    return payroll.populate('employee');
  }

  static calculateNetSalary(payrollData) {
    const { baseSalary, allowances = 0, bonus = 0, deductions = 0, leaveDeduction = 0 } = payrollData;
    
    const totalEarnings = baseSalary + allowances + bonus;
    const totalDeductions = deductions + leaveDeduction;
    const netSalary = totalEarnings - totalDeductions;

    return Math.max(0, netSalary);
  }

  static async getAllPayroll(filters = {}) {
    const query = {};
    if (filters.employee) query.employee = filters.employee;
    if (filters.month) query.month = filters.month;
    if (filters.year) query.year = filters.year;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

    return await Payroll.find(query)
      .populate('employee', 'name employeeCode designation')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ year: -1, month: -1 });
  }

  static async getPayrollById(payrollId) {
    return await Payroll.findById(payrollId)
      .populate('employee')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
  }

  static async updatePayroll(payrollId, updateData) {
    if (updateData.baseSalary || updateData.allowances || updateData.bonus || updateData.deductions || updateData.leaveDeduction) {
      updateData.netSalary = this.calculateNetSalary(updateData);
    }

    return await Payroll.findByIdAndUpdate(
      payrollId,
      updateData,
      { new: true, runValidators: true }
    ).populate('employee');
  }

  static async deletePayroll(payrollId) {
    return await Payroll.findByIdAndDelete(payrollId);
  }

  static async approvePayroll(payrollId, approvedBy) {
    return await Payroll.findByIdAndUpdate(
      payrollId,
      {
        approvalStatus: 'approved',
        approvedBy,
        approvalDate: new Date()
      },
      { new: true }
    ).populate('employee').populate('approvedBy', 'name email');
  }

  static async rejectPayroll(payrollId, approvedBy, rejectionReason) {
    return await Payroll.findByIdAndUpdate(
      payrollId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason
      },
      { new: true }
    );
  }

  static async markPayrollAsPaid(payrollId, paymentDate, paymentMode, referenceNumber) {
    return await Payroll.findByIdAndUpdate(
      payrollId,
      {
        paymentStatus: 'paid',
        paymentDate,
        paymentMode,
        referenceNumber
      },
      { new: true }
    ).populate('employee');
  }

  static async getPayrollByMonth(month, year) {
    return await Payroll.find({ month, year })
      .populate('employee', 'name employeeCode designation')
      .sort({ employee: 1 });
  }

  static async generatePayslip(payrollId) {
    const payroll = await this.getPayrollById(payrollId);
    if (!payroll) throw new Error('Payroll not found');

    const pdfPath = await PDFGenerator.generatePayslip(payroll);
    return pdfPath;
  }

  static async getPayrollSummary(month, year) {
    const result = await Payroll.aggregate([
      { $match: { month: parseInt(month), year: parseInt(year) } },
      {
        $group: {
          _id: null,
          totalBaseSalary: { $sum: '$baseSalary' },
          totalAllowances: { $sum: '$allowances' },
          totalDeductions: { $sum: '$deductions' },
          totalNetSalary: { $sum: '$netSalary' },
          employeeCount: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    return result.length > 0 ? result[0] : null;
  }

  static async getPendingApprovals() {
    return await Payroll.find({ approvalStatus: 'pending' })
      .populate('employee', 'name employeeCode')
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });
  }
}

module.exports = PayrollService;
