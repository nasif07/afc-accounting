const Receipt = require('../receipts/receipt.model');
const Expense = require('../expenses/expense.model');
const JournalEntry = require('../accounting/accounting.model');
const Student = require('../students/student.model');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeRegex = (s) => ({ $regex: escapeRegex(String(s).slice(0, 100)), $options: 'i' });

class SearchService {
  static async searchReceipts(query, filters = {}) {
    const searchRegex = safeRegex(query);
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
    const searchRegex = safeRegex(query);
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
    const searchRegex = safeRegex(query);
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
    const searchRegex = safeRegex(query);

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
