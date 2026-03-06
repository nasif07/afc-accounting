const Expense = require('./expense.model');

class ExpenseService {
  static async createExpense(expenseData) {
    const expense = new Expense(expenseData);
    await expense.save();
    return expense.populate('vendor').populate('createdBy', 'name email');
  }

  static async getAllExpenses(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.vendor) query.vendor = filters.vendor;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    return await Expense.find(query)
      .populate('vendor', 'vendorName vendorCode')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ date: -1 });
  }

  static async getExpenseById(expenseId) {
    return await Expense.findById(expenseId)
      .populate('vendor')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
  }

  static async updateExpense(expenseId, updateData) {
    return await Expense.findByIdAndUpdate(
      expenseId,
      updateData,
      { new: true, runValidators: true }
    ).populate('vendor').populate('createdBy', 'name email');
  }

  static async deleteExpense(expenseId) {
    return await Expense.findByIdAndDelete(expenseId);
  }

  static async approveExpense(expenseId, approvedBy) {
    return await Expense.findByIdAndUpdate(
      expenseId,
      {
        approvalStatus: 'approved',
        approvedBy,
        approvalDate: new Date()
      },
      { new: true }
    ).populate('vendor').populate('approvedBy', 'name email');
  }

  static async rejectExpense(expenseId, approvedBy, rejectionReason) {
    return await Expense.findByIdAndUpdate(
      expenseId,
      {
        approvalStatus: 'rejected',
        approvedBy,
        approvalDate: new Date(),
        rejectionReason
      },
      { new: true }
    );
  }

  static async getExpensesByCategory(category) {
    return await Expense.find({ category, approvalStatus: 'approved' })
      .sort({ date: -1 });
  }

  static async getTotalExpenses(filters = {}) {
    const query = { approvalStatus: 'approved' };
    if (filters.category) query.category = filters.category;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const result = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return result;
  }

  static async getPendingApprovals() {
    return await Expense.find({ approvalStatus: 'pending' })
      .populate('vendor', 'vendorName')
      .populate('createdBy', 'name email')
      .sort({ date: 1 });
  }
}

module.exports = ExpenseService;
