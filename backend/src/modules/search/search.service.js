const Receipt = require('../receipts/receipt.model');
const Expense = require('../expenses/expense.model');
const JournalEntry = require('../accounting/accounting.model');
const Student = require('../students/student.model');
const Vendor = require('../vendors/vendor.model');
const Employee = require('../employees/employee.model');

class SearchService {
  static async globalSearch(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };
    const dateFilter = this.buildDateFilter(filters);

    const results = {
      receipts: [],
      expenses: [],
      journalEntries: [],
      students: [],
      vendors: [],
      employees: []
    };

    // Search receipts
    results.receipts = await Receipt.find({
      $or: [
        { receiptNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter
    })
      .populate('student', 'name rollNumber')
      .limit(10);

    // Search expenses
    results.expenses = await Expense.find({
      $or: [
        { expenseNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter
    })
      .populate('vendor', 'vendorName')
      .limit(10);

    // Search journal entries
    results.journalEntries = await JournalEntry.find({
      $or: [
        { referenceNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter
    })
      .limit(10);

    // Search students
    results.students = await Student.find({
      $or: [
        { name: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex }
      ]
    })
      .limit(10);

    // Search vendors
    results.vendors = await Vendor.find({
      $or: [
        { vendorName: searchRegex },
        { vendorCode: searchRegex },
        { email: searchRegex }
      ]
    })
      .limit(10);

    // Search employees
    results.employees = await Employee.find({
      $or: [
        { name: searchRegex },
        { employeeCode: searchRegex },
        { email: searchRegex }
      ]
    })
      .limit(10);

    return results;
  }

  static async searchReceipts(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };
    const dateFilter = this.buildDateFilter(filters);

    return await Receipt.find({
      $or: [
        { receiptNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter,
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus })
    })
      .populate('student', 'name rollNumber class')
      .sort({ date: -1 });
  }

  static async searchExpenses(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };
    const dateFilter = this.buildDateFilter(filters);

    return await Expense.find({
      $or: [
        { expenseNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter,
      ...(filters.category && { category: filters.category }),
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus })
    })
      .populate('vendor', 'vendorName')
      .sort({ date: -1 });
  }

  static async searchJournalEntries(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };
    const dateFilter = this.buildDateFilter(filters);

    return await JournalEntry.find({
      $or: [
        { referenceNumber: searchRegex },
        { description: searchRegex }
      ],
      ...dateFilter,
      ...(filters.transactionType && { transactionType: filters.transactionType }),
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus })
    })
      .populate('bookEntries.account', 'accountName accountCode')
      .sort({ date: -1 });
  }

  static async searchStudents(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };

    return await Student.find({
      $or: [
        { name: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex }
      ],
      ...(filters.class && { class: filters.class }),
      ...(filters.status && { status: filters.status })
    })
      .sort({ rollNumber: 1 });
  }

  static async searchVendors(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };

    return await Vendor.find({
      $or: [
        { vendorName: searchRegex },
        { vendorCode: searchRegex },
        { email: searchRegex }
      ],
      ...(filters.vendorType && { vendorType: filters.vendorType }),
      ...(filters.status && { status: filters.status })
    });
  }

  static async searchEmployees(query, filters = {}) {
    const searchRegex = { $regex: query, $options: 'i' };

    return await Employee.find({
      $or: [
        { name: searchRegex },
        { employeeCode: searchRegex },
        { email: searchRegex }
      ],
      ...(filters.department && { department: filters.department }),
      ...(filters.status && { status: filters.status })
    });
  }

  static buildDateFilter(filters) {
    const dateFilter = {};
    if (filters.dateFrom || filters.dateTo) {
      dateFilter.date = {};
      if (filters.dateFrom) dateFilter.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateFilter.date.$lte = new Date(filters.dateTo);
    }
    return dateFilter;
  }

  static async searchByAmountRange(minAmount, maxAmount, filters = {}) {
    const amountFilter = { amount: { $gte: minAmount, $lte: maxAmount } };
    const dateFilter = this.buildDateFilter(filters);

    const receipts = await Receipt.find({
      ...amountFilter,
      ...dateFilter,
      approvalStatus: 'approved'
    });

    const expenses = await Expense.find({
      ...amountFilter,
      ...dateFilter,
      approvalStatus: 'approved'
    });

    return { receipts, expenses };
  }
}

module.exports = SearchService;
