const Payroll = require('./payroll.model');
const PDFGenerator = require('../../utils/pdfGenerator');
const DocxGenerator = require('../../utils/docxGenerator');
const generateVoucherNumber = require('../../utils/generateVoucherNumber');
const SettingsService = require('../settings/settings.service');
const { resolveEarnings } = require('../../utils/payslipFields');

// Approval/financial-outcome fields that must never be settable through the
// generic update path — they're only ever set by approvePayroll/rejectPayroll
// or markPayrollAsPaid.
const PAYROLL_PROTECTED_FIELDS = [
  'approvalStatus',
  'approvedBy',
  'approvalDate',
  'rejectionReason',
  'paymentStatus',
  'journalEntryId',
  'accountingStatus',
];

class PayrollService {
  static async createPayroll(payrollData) {
    const totals = this.calculateTotals(payrollData);
    payrollData.totalEarnings = totals.totalEarnings;
    payrollData.totalDeductions = totals.totalDeductions;
    payrollData.netSalary = totals.netSalary;
    payrollData.payrollNumber = await generateVoucherNumber('PR');

    const payroll = new Payroll(payrollData);
    await payroll.save();
    return payroll.populate('employee');
  }

  static calculateNetSalary(payrollData) {
    return this.calculateTotals(payrollData).netSalary;
  }

  // Re-exported so callers that already reach for the service keep working;
  // the rule itself lives in utils/payslipFields so the payslip renderers
  // share exactly one implementation of it.
  static resolveEarnings(payrollData = {}) {
    return resolveEarnings(payrollData);
  }

  static calculateTotals(payrollData) {
    const { baseSalary, deductions = 0, leaveDeduction = 0 } = payrollData;
    const { houseRent, conveyanceAllowance } = this.resolveEarnings(payrollData);

    const totalEarnings =
      Number(baseSalary || 0) + houseRent + conveyanceAllowance;
    const totalDeductions = Number(deductions || 0) + Number(leaveDeduction || 0);
    const netSalary = totalEarnings - totalDeductions;

    return {
      totalEarnings,
      totalDeductions,
      netSalary: Math.max(0, netSalary),
    };
  }

  static async getAllPayroll(filters = {}) {
    const query = {};
    if (filters.employee) query.employee = filters.employee;
    if (filters.month) query.month = filters.month;
    if (filters.year) query.year = filters.year;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Payroll.find(query)
        .populate('employee', 'name employeeCode designation')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit),
      Payroll.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  static async getPayrollById(payrollId) {
    return await Payroll.findById(payrollId)
      .populate('employee')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
  }

  static async updatePayroll(payrollId, updateData) {
    for (const field of PAYROLL_PROTECTED_FIELDS) {
      delete updateData[field];
    }

    // Editing through the named earnings fields migrates the record off the
    // generic ones, so a stale legacy value can never resurface through
    // resolveEarnings' fallback (e.g. clearing House Rent to 0 on a record
    // that still carried allowances).
    const touchesNamedEarnings =
      updateData.houseRent !== undefined ||
      updateData.conveyanceAllowance !== undefined;

    if (touchesNamedEarnings) {
      updateData.allowances = 0;
      updateData.bonus = 0;
    }

    // `!== undefined` rather than truthiness: setting any of these to 0 is a
    // real change that has to trigger a recalculation.
    const AMOUNT_FIELDS = [
      "baseSalary",
      "houseRent",
      "conveyanceAllowance",
      "allowances",
      "bonus",
      "deductions",
      "leaveDeduction",
    ];

    if (AMOUNT_FIELDS.some((field) => updateData[field] !== undefined)) {
      const current = await Payroll.findById(payrollId).lean();
      const totals = this.calculateTotals({ ...current, ...updateData });
      updateData.totalEarnings = totals.totalEarnings;
      updateData.totalDeductions = totals.totalDeductions;
      updateData.netSalary = totals.netSalary;
    }

    return await Payroll.findByIdAndUpdate(
      payrollId,
      updateData,
      { new: true, runValidators: true }
    ).populate('employee');
  }

  static async deletePayroll(payrollId, deletedBy) {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) return null;
    if (payroll.approvalStatus === 'approved') {
      throw new Error('Cannot delete an approved payroll record');
    }
    payroll.deletedAt = new Date();
    payroll.deletedBy = deletedBy;
    await payroll.save();
    return payroll;
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

  // `format` picks the renderer: 'pdf' for the archival copy, 'docx' for an
  // editable Word file. Both render the same payslip model, so the figures
  // are identical either way.
  static async generatePayslip(payrollId, format = 'pdf') {
    const [payroll, orgInfo] = await Promise.all([
      this.getPayrollById(payrollId),
      SettingsService.getOrgInfo({ withLogo: true }),
    ]);
    if (!payroll) throw new Error('Payroll not found');

    const generator = format === 'docx' ? DocxGenerator : PDFGenerator;
    const filepath = await generator.generatePayslip(payroll, null, orgInfo);

    return { filepath, payroll };
  }

  static async getPendingApprovals() {
    return await Payroll.find({ approvalStatus: 'pending' })
      .populate('employee', 'name employeeCode')
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });
  }
}

module.exports = PayrollService;
