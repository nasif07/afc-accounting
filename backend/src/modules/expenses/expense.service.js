const Expense = require('./expense.model');
const AccountingService = require('../accounting/accounting.service');

class ExpenseService {
  /**
   * Create a new expense
   */
  static async createExpense(expenseData) {
    // Check for duplicate expense number
    const existingExpense = await Expense.findOne({
      expenseNumber: expenseData.expenseNumber.toUpperCase(),
      deletedAt: null,
    });

    if (existingExpense) {
      throw new Error(
        `Expense number ${expenseData.expenseNumber} already exists`
      );
    }

    const expense = new Expense({
      ...expenseData,
      expenseNumber: expenseData.expenseNumber.toUpperCase(),
    });

    await expense.save();
    return expense
      .populate('vendor', 'vendorName vendorCode')
      .populate('createdBy', 'name email')
      .populate('coaAccount', 'accountCode accountName');
  }

  /**
   * Get all expenses with filters
   */
  static async getAllExpenses(filters = {}) {
    const query = { deletedAt: null };

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
      .populate('coaAccount', 'accountCode accountName')
      .sort({ date: -1 });
  }

  /**
   * Get expense by ID
   */
  static async getExpenseById(expenseId) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: null,
    })
      .populate('vendor')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('coaAccount', 'accountCode accountName')
      .populate('journalEntryId');

    if (!expense) {
      throw new Error('Expense not found');
    }

    return expense;
  }

  /**
   * Update expense (with approval lock)
   */
  static async updateExpense(expenseId, updateData, userId) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: null,
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Prevent updating approved or rejected expenses
    if (expense.approvalStatus !== 'pending') {
      throw new Error(
        `Cannot update ${expense.approvalStatus} expense. Only pending expenses can be edited.`
      );
    }

    // Prevent updating immutable fields
    const immutableFields = [
      'expenseNumber',
      'createdBy',
      'createdAt',
      'journalEntryId',
      'accountingStatus',
    ];
    const attemptedImmutableUpdate = immutableFields.some(
      (field) => field in updateData
    );

    if (attemptedImmutableUpdate) {
      throw new Error(
        `Cannot update immutable fields: ${immutableFields.join(', ')}`
      );
    }

    updateData.updatedBy = userId;

    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('vendor', 'vendorName vendorCode')
      .populate('createdBy', 'name email')
      .populate('coaAccount', 'accountCode accountName');

    return updatedExpense;
  }

  /**
   * Soft delete expense
   */
  static async deleteExpense(expenseId, userId) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: null,
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Prevent deleting approved expenses
    if (expense.approvalStatus !== 'pending') {
      throw new Error(
        `Cannot delete ${expense.approvalStatus} expense. Only pending expenses can be deleted.`
      );
    }

    expense.deletedAt = new Date();
    expense.deletedBy = userId;
    await expense.save();

    return expense;
  }

  /**
   * Restore deleted expense
   */
  static async restoreExpense(expenseId, userId) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: { $ne: null },
    });

    if (!expense) {
      throw new Error('Deleted expense not found');
    }

    expense.deletedAt = null;
    expense.deletedBy = null;
    expense.updatedBy = userId;
    await expense.save();

    return expense;
  }

  /**
   * Approve expense and create journal entry
   */
  static async approveExpense(expenseId, approvedBy) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: null,
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.approvalStatus !== 'pending') {
      throw new Error(
        `Cannot approve ${expense.approvalStatus} expense. Only pending expenses can be approved.`
      );
    }

    // Create journal entry if COA account is specified
    let journalEntryId = null;
    if (expense.coaAccount) {
      try {
        // Create debit to expense account, credit to bank/cash or payable account
        const journalEntry = await AccountingService.createJournalEntry({
          journalDate: expense.date,
          description: `Expense: ${expense.description} (${expense.expenseNumber})`,
          bookEntries: [
            {
              account: expense.coaAccount,
              debit: expense.amount,
              credit: 0,
            },
            // Credit to accounts payable or cash (depends on payment mode)
            // This would be determined by the payment mode
          ],
          createdBy: approvedBy,
          referenceNumber: expense.expenseNumber,
        });

        journalEntryId = journalEntry._id;
        expense.accountingStatus = 'posted';
      } catch (error) {
        // If journal entry creation fails, still approve the expense
        console.error('Failed to create journal entry for expense:', error);
      }
    }

    expense.approvalStatus = 'approved';
    expense.approvedBy = approvedBy;
    expense.approvalDate = new Date();
    if (journalEntryId) {
      expense.journalEntryId = journalEntryId;
    }

    await expense.save();

    return expense
      .populate('vendor', 'vendorName vendorCode')
      .populate('approvedBy', 'name email')
      .populate('coaAccount', 'accountCode accountName')
      .populate('journalEntryId');
  }

  /**
   * Reject expense
   */
  static async rejectExpense(expenseId, approvedBy, rejectionReason) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: null,
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.approvalStatus !== 'pending') {
      throw new Error(
        `Cannot reject ${expense.approvalStatus} expense. Only pending expenses can be rejected.`
      );
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      throw new Error('Rejection reason is required');
    }

    expense.approvalStatus = 'rejected';
    expense.approvedBy = approvedBy;
    expense.approvalDate = new Date();
    expense.rejectionReason = rejectionReason.trim();

    await expense.save();

    return expense
      .populate('vendor', 'vendorName vendorCode')
      .populate('approvedBy', 'name email')
      .populate('coaAccount', 'accountCode accountName');
  }

  /**
   * Get expenses by category
   */
  static async getExpensesByCategory(category) {
    return await Expense.find({
      category,
      approvalStatus: 'approved',
      deletedAt: null,
    })
      .populate('vendor', 'vendorName vendorCode')
      .sort({ date: -1 });
  }

  /**
   * Get total expenses with filters
   */
  static async getTotalExpenses(filters = {}) {
    const query = { approvalStatus: 'approved', deletedAt: null };

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
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return result;
  }

  /**
   * Get pending approvals
   */
  static async getPendingApprovals() {
    return await Expense.find({
      approvalStatus: 'pending',
      deletedAt: null,
    })
      .populate('vendor', 'vendorName vendorCode')
      .populate('createdBy', 'name email')
      .populate('coaAccount', 'accountCode accountName')
      .sort({ date: 1 });
  }

  /**
   * Get total pending amount
   */
  static async getTotalPendingAmount() {
    const result = await Expense.aggregate([
      { $match: { approvalStatus: 'pending', deletedAt: null } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return result.length > 0
      ? result[0]
      : { totalAmount: 0, count: 0 };
  }

  /**
   * Get total approved amount
   */
  static async getTotalApprovedAmount(filters = {}) {
    const query = { approvalStatus: 'approved', deletedAt: null };

    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const result = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return result.length > 0
      ? result[0]
      : { totalAmount: 0, count: 0 };
  }
}

module.exports = ExpenseService;
