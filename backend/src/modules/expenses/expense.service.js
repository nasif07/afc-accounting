const Expense = require('./expense.model');
const ChartOfAccounts = require('../chartOfAccounts/coa.model');
const AccountingService = require('../accounting/accounting.service');
const SettingsService = require('../settings/settings.service');
const { NotFoundError, BadRequestError } = require('../../errors');
const { TRANSACTION_TYPES } = require('../../config/constants');

// Fallback COA account codes credited on expense approval, keyed by
// Expense.paymentMode. Used when Settings.expensePaymentAccountCodes has no
// value for a given mode (e.g. settings document predates this field).
const EXPENSE_PAYMENT_ACCOUNT_DEFAULTS = {
  cash: '1001',
  bank: '1002',
  cheque: '1002',
  card: '1002',
  online: '1002',
};

class ExpenseService {
  /**
   * Resolve the COA account to credit on expense approval for a given
   * payment mode, using the settings-configured mapping with a hardcoded
   * fallback. Throws a clear BadRequestError if nothing resolves.
   */
  static async resolveCreditAccountForPaymentMode(paymentMode) {
    const settings = await SettingsService.getSettings();
    const accountCode =
      settings.expensePaymentAccountCodes?.[paymentMode] ||
      EXPENSE_PAYMENT_ACCOUNT_DEFAULTS[paymentMode];

    if (!accountCode) {
      throw new BadRequestError(
        `No ledger account is configured for payment mode "${paymentMode}". Configure Settings.expensePaymentAccountCodes.${paymentMode}.`
      );
    }

    const account = await ChartOfAccounts.findOne({
      accountCode,
      deletedAt: null,
      status: 'active',
    });

    if (!account) {
      throw new BadRequestError(
        `Configured ledger account "${accountCode}" for payment mode "${paymentMode}" was not found or is not active.`
      );
    }

    return account;
  }

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
      throw new BadRequestError(
        `Expense number ${expenseData.expenseNumber} already exists`
      );
    }

    const expense = new Expense({
      ...expenseData,
      expenseNumber: expenseData.expenseNumber.toUpperCase(),
    });

    await expense.save();
    await expense.populate([
      { path: 'vendor', select: 'vendorName vendorCode' },
      { path: 'createdBy', select: 'name email' },
      { path: 'coaAccount', select: 'accountCode accountName' },
    ]);
    return expense;
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

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Expense.find(query)
        .populate('vendor', 'vendorName vendorCode')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('coaAccount', 'accountCode accountName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Expense.countDocuments(query),
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
      throw new NotFoundError('Expense not found');
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
      throw new NotFoundError('Expense not found');
    }

    // Prevent updating approved or rejected expenses
    if (expense.approvalStatus !== 'pending') {
      throw new BadRequestError(
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
      throw new BadRequestError(
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
      throw new NotFoundError('Expense not found');
    }

    // Prevent deleting approved expenses
    if (expense.approvalStatus !== 'pending') {
      throw new BadRequestError(
        `Cannot delete ${expense.approvalStatus} expense. Only pending expenses can be deleted.`
      );
    }

    expense.deletedAt = new Date();
    expense.deletedBy = userId;
    await expense.save();

    return expense;
  }

  /**
   * Approve expense and create journal entry.
   *
   * Approval and journal-entry creation are all-or-nothing: if the journal
   * entry can't be created (unmapped payment mode, invalid/inactive
   * accounts, etc.) the expense is left untouched and the error propagates
   * to the caller instead of being swallowed.
   */
  static async approveExpense(expenseId, approvedBy) {
    const expense = await Expense.findOne({
      _id: expenseId,
      deletedAt: null,
    });

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.approvalStatus !== 'pending') {
      throw new BadRequestError(
        `Cannot approve ${expense.approvalStatus} expense. Only pending expenses can be approved.`
      );
    }

    if (!expense.coaAccount) {
      throw new BadRequestError(
        'Cannot approve expense: no ledger account (coaAccount) is assigned. Set a Chart of Accounts account before approving.'
      );
    }

    const creditAccount = await this.resolveCreditAccountForPaymentMode(expense.paymentMode);

    // requiresApproval: false makes AccountingService.createJournalEntry
    // create AND post the entry (updating COA balances) inside its own
    // single transaction before returning — same pattern already used by
    // pettycash.service.js#createJournalEntryForPettyCash. This call is
    // NOT given our own session: AccountingService.createJournalEntry's
    // external-session path reads the entry back without attaching that
    // session, so it can't see the write before commit. That's a latent
    // bug in accounting.service.js, out of scope here (shared ledger code
    // used by other modules) — see summary.
    const journalEntry = await AccountingService.createJournalEntry({
      voucherDate: expense.date,
      transactionType: TRANSACTION_TYPES.PAYMENT,
      sourceModule: 'expense',
      description: `Expense: ${expense.description} (${expense.expenseNumber})`,
      bookEntries: [
        { account: expense.coaAccount, debit: expense.amount, credit: 0 },
        { account: creditAccount._id, debit: 0, credit: expense.amount },
      ],
      createdBy: approvedBy,
      referenceNumber: expense.expenseNumber,
      requiresApproval: false,
    });

    // Journal entry is already created and posted at this point. Only now
    // do we mark the expense approved, so a failure above never leaves the
    // expense in an 'approved' state without a posted entry behind it.
    expense.approvalStatus = 'approved';
    expense.approvedBy = approvedBy;
    expense.approvalDate = new Date();
    expense.journalEntryId = journalEntry._id;
    expense.accountingStatus = 'posted';
    await expense.save();

    await expense.populate([
      { path: 'vendor', select: 'vendorName vendorCode' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'coaAccount', select: 'accountCode accountName' },
      { path: 'journalEntryId' },
    ]);
    return expense;
  }

}

module.exports = ExpenseService;
